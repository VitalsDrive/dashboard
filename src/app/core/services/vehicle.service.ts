import { Injectable, computed, inject, signal, OnDestroy, resource, effect } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { TelemetryService } from './telemetry.service';
import { AlertService } from './alert.service';
import { OrganizationService } from './organization.service';
import { FleetService } from './fleet.service';
import { Vehicle, VehicleWithHealth, CreateVehicleDto, getVehicleDisplayName } from '../models/vehicle.model';
import { TelemetryRecord } from '../models/telemetry.model';

export { Vehicle, CreateVehicleDto } from '../models/vehicle.model';

const MAX_TELEMETRY_HISTORY = 100;

@Injectable({ providedIn: 'root' })
export class VehicleService implements OnDestroy {
  private readonly supabase = inject(SupabaseService);
  private readonly telemetryService = inject(TelemetryService);
  private readonly alertService = inject(AlertService);
  private readonly organizationService = inject(OrganizationService);
  private readonly fleetService = inject(FleetService);
  private readonly destroy$ = new Subject<void>();
  private readonly reloadVehicles$ = new Subject<void>();

  // === Core State (signals) ===

  readonly selectedVehicleId = signal<string | null>(null);

  /**
   * telemetryMap: vehicleId → array of TelemetryRecords (newest first)
   */
  readonly telemetryMap = signal<Map<string, TelemetryRecord[]>>(new Map());

  // === Compatibility signals for components still using legacy API ===
  // Writable signals so existing components that call .set() still compile.

  /** @deprecated Use vehicleResource.isLoading instead */
  readonly isLoading = signal(false);
  /** @deprecated Use vehicleResource.error instead */
  readonly error = signal<string | null>(null);
  /** @deprecated Use vehicleResource.value() instead */
  readonly vehicles = computed(() => this.vehicleResource.value() ?? []);

  // === resource()-driven vehicle loading ===
  // Params re-evaluate when selectedOrganization() or fleets() changes.
  // Returns undefined when no org is selected or no fleets exist → loader skips → status = 'idle'.

  readonly vehicleResource = resource({
    params: () => {
      const org = this.organizationService.selectedOrganization();
      if (!org) return undefined;
      const fleetIds = this.fleetService.fleets()
        .filter(f => f.organization_id === org.id)
        .map(f => f.id);
      if (fleetIds.length === 0) return undefined;
      return { fleetIds };
    },
    loader: async ({ params: { fleetIds } }: { params: { fleetIds: string[] } }) => {
      // NOTE: .abortSignal() is NOT available on supabase-js v2.104.1 query builder — omit it
      const { data, error } = await this.supabase.client
        .from('vehicles')
        .select('*')
        .in('fleet_id', fleetIds)
        .eq('status', 'active')
        .order('make');
      if (error) throw error;
      return (data ?? []) as Vehicle[];
    },
    defaultValue: [],
  });

  private readonly vehicleIds = computed(() =>
    this.vehicleResource.value()?.map((v: Vehicle) => v.id) ?? []
  );

  // === resource()-driven telemetry snapshot ===
  // Seeds telemetryMap on initial load via get_latest_telemetry RPC.
  // Skips when vehicleIds is empty (params returns undefined → status = 'idle').

  readonly telemetryResource = resource({
    params: () => {
      const ids = this.vehicleIds();
      return ids.length > 0 ? ids : undefined;
    },
    loader: async ({ params: vehicleIds }: { params: string[] }) => {
      const { data, error } = await this.supabase.client
        .rpc('get_latest_telemetry', { vehicle_ids: vehicleIds });
      if (error) throw error;
      const grouped = new Map<string, TelemetryRecord[]>();
      for (const record of (data ?? [])) {
        grouped.set(record.vehicle_id, [this.mapDbRecord(record)]);
      }
      this.telemetryMap.set(grouped);
      return data;
    },
  });

  // === Computed / Derived State ===

  readonly vehiclesWithHealth = computed<VehicleWithHealth[]>(() => {
    const map = this.telemetryMap();
    return (this.vehicleResource.value() ?? []).map((v: Vehicle) => {
      const history = map.get(v.id) ?? [];
      const latest = history[0];
      return {
        ...v,
        latestTelemetry: latest,
        healthScore: this.calculateHealthScore(latest),
        alertCount: this.alertService.activeAlerts().filter(a => a.vehicleId === v.id).length,
      };
    });
  });

  readonly selectedVehicle = computed<VehicleWithHealth | null>(() => {
    const id = this.selectedVehicleId();
    if (!id) return null;
    return this.vehiclesWithHealth().find((v) => v.id === id) ?? null;
  });

  readonly onlineVehicleCount = computed(() =>
    (this.vehicleResource.value() ?? []).filter((v: Vehicle) => v.status === 'active').length,
  );

  readonly alertVehicleCount = computed(() =>
    this.vehiclesWithHealth().filter((v) => v.alertCount > 0).length,
  );

  // === Constructor: effect() bridge ===
  // Starts realtime subscription once vehicleResource resolves.
  // Calls reloadVehicles$.next() before each new subscription to cancel prior one (WR-04).

  constructor() {
    effect(() => {
      if (this.vehicleResource.status() === 'resolved') {
        this.reloadVehicles$.next();
        this.telemetryService.subscribeToFleet();
        this.telemetryService.telemetryBatch$
          .pipe(takeUntil(this.reloadVehicles$), takeUntil(this.destroy$))
          .subscribe(batch => this.processBatch(batch));
      }
    });
  }

  // === Selection ===

  selectVehicle(vehicleId: string | null): void {
    this.selectedVehicleId.set(vehicleId);
  }

  // === Legacy imperative loaders (kept for fleet-management compatibility) ===
  // These are no-ops or thin wrappers — vehicleResource drives reactive loading.

  /** @deprecated vehicleResource handles reactive loading; this reloads manually */
  async loadVehicles(_fleetId?: string): Promise<void> {
    this.vehicleResource.reload();
  }

  /** @deprecated vehicleResource handles reactive loading */
  async loadAllVehicles(): Promise<void> {
    this.vehicleResource.reload();
  }

  // === Fleet Management CRUD (Phase 2) ===

  /**
   * Get vehicles scoped to the current organization (or specific fleet).
   */
  async getVehicles(fleetId?: string): Promise<Vehicle[]> {
    const org = this.organizationService.selectedOrganization();
    if (!org) return [];

    if (fleetId) {
      return this.fleetService.getFleetVehicles(fleetId);
    }

    const fleetIds = this.fleetService.fleets()
      .filter((f) => f.organization_id === org.id)
      .map((f) => f.id);

    if (fleetIds.length === 0) return [];

    try {
      const { data, error } = await this.supabase.client
        .from('vehicles')
        .select('*')
        .in('fleet_id', fleetIds)
        .order('make');

      if (error) throw error;
      return data ?? [];
    } catch (err: unknown) {
      return [];
    }
  }

  /**
   * Get a single vehicle by ID, verifying it belongs to a fleet in the current org.
   */
  async getVehicle(id: string): Promise<Vehicle | null> {
    const org = this.organizationService.selectedOrganization();
    if (!org) return null;

    try {
      const { data, error } = await this.supabase.client
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const fleetIds = this.fleetService.fleets()
        .filter((f) => f.organization_id === org.id)
        .map((f) => f.id);

      if (!fleetIds.includes(data.fleet_id)) return null;
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Create a new vehicle.
   */
  async createVehicle(data: CreateVehicleDto): Promise<Vehicle | null> {
    try {
      const { data: created, error } = await this.supabase.client
        .from('vehicles')
        .insert({ ...data, status: 'active' })
        .select()
        .single();

      if (error) throw error;
      return created;
    } catch {
      return null;
    }
  }

  /**
   * Update a vehicle.
   */
  async updateVehicle(
    id: string,
    updates: Partial<CreateVehicleDto>,
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('vehicles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Soft-delete: sets status to 'inactive'. Does NOT hard-delete.
   */
  async deleteVehicle(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('vehicles')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }

  // === Private ===

  private processBatch(batch: TelemetryRecord[]): void {
    const latestPerVehicle = new Map<string, TelemetryRecord>();
    for (const record of batch) {
      const existing = latestPerVehicle.get(record.vehicle_id);
      if (
        !existing ||
        new Date(record.timestamp) > new Date(existing.timestamp)
      ) {
        latestPerVehicle.set(record.vehicle_id, record);
      }
    }

    this.telemetryMap.update((map) => {
      const newMap = new Map(map);
      latestPerVehicle.forEach((record, vehicleId) => {
        const existing = newMap.get(vehicleId) ?? [];
        newMap.set(
          vehicleId,
          [record, ...existing].slice(0, MAX_TELEMETRY_HISTORY),
        );
        const vehicle = (this.vehicleResource.value() ?? []).find((v: Vehicle) => v.id === vehicleId);
        this.alertService.checkAndCreateAlerts(record, vehicle ? getVehicleDisplayName(vehicle) : undefined);
      });
      return newMap;
    });
  }

  private calculateHealthScore(telemetry?: TelemetryRecord): number {
    if (!telemetry) return 100;
    let score = 100;
    if (telemetry.voltage < 12.4) score -= 20;
    if (telemetry.voltage < 12.0) score -= 30;
    if (telemetry.coolant_temp > 100) score -= 10;
    if (telemetry.coolant_temp > 105) score -= 40;
    if (telemetry.dtc_codes.length > 0) score -= 15 * Math.min(telemetry.dtc_codes.length, 3);
    return Math.max(0, score);
  }

  private mapDbRecord(raw: Record<string, unknown>): TelemetryRecord {
    return {
      id: raw['id'] as string,
      vehicle_id: raw['vehicle_id'] as string,
      timestamp: raw['timestamp'] as string,
      rpm: raw['rpm'] as number | undefined,
      speed: raw['speed'] as number | undefined,
      engine_on: Boolean(raw['engine_on']),
      coolant_temp: Number(raw['coolant_temp'] ?? 0),
      voltage: Number(raw['voltage'] ?? 0),
      latitude: raw['latitude'] as number | undefined,
      longitude: raw['longitude'] as number | undefined,
      dtc_codes: (raw['dtc_codes'] as string[]) ?? [],
      fuel_level: raw['fuel_level'] as number | undefined,
      signal_strength: raw['signal_strength'] as number | undefined,
    };
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
