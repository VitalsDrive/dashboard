import { Injectable, computed, inject, signal, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { TelemetryService } from './telemetry.service';
import { AlertService } from './alert.service';
import { OrganizationService } from './organization.service';
import { FleetService } from './fleet.service';
import { Vehicle, VehicleWithHealth, getVehicleDisplayName } from '../models/vehicle.model';
import { TelemetryRecord } from '../models/telemetry.model';

const MAX_TELEMETRY_HISTORY = 100;

@Injectable({ providedIn: 'root' })
export class VehicleService implements OnDestroy {
  private readonly supabase = inject(SupabaseService);
  private readonly telemetryService = inject(TelemetryService);
  private readonly alertService = inject(AlertService);
  private readonly organizationService = inject(OrganizationService);
  private readonly fleetService = inject(FleetService);
  private readonly destroy$ = new Subject<void>();

  // === Core State (signals) ===

  readonly vehicles = signal<Vehicle[]>([]);
  readonly selectedVehicleId = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * telemetryMap: vehicleId → array of TelemetryRecords (newest first)
   */
  readonly telemetryMap = signal<Map<string, TelemetryRecord[]>>(new Map());

  // === Computed / Derived State ===

  readonly vehiclesWithHealth = computed<VehicleWithHealth[]>(() => {
    const map = this.telemetryMap();
    return this.vehicles().map((v) => {
      const history = map.get(v.id) ?? [];
      const latest = history[0];
      return {
        ...v,
        latestTelemetry: latest,
        healthScore: this.calculateHealthScore(latest),
        alertCount: this.alertService.activeAlerts().filter(
          (a) => a.vehicleId === v.id,
        ).length,
      };
    });
  });

  readonly selectedVehicle = computed<VehicleWithHealth | null>(() => {
    const id = this.selectedVehicleId();
    if (!id) return null;
    return this.vehiclesWithHealth().find((v) => v.id === id) ?? null;
  });

  readonly onlineVehicleCount = computed(() =>
    this.vehicles().filter((v) => v.status === 'active').length,
  );

  readonly alertVehicleCount = computed(() =>
    this.vehiclesWithHealth().filter((v) => v.alertCount > 0).length,
  );

  // === Initialization ===

  /**
   * Load vehicles scoped to the current organization (or specific fleet).
   * If fleetId is provided, only loads vehicles from that fleet.
   * If no fleetId, loads vehicles from all fleets in the org.
   */
  async loadVehicles(fleetId?: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      let vehicleQuery = this.supabase.client
        .from('vehicles')
        .select('*')
        .order('make');

      if (fleetId) {
        vehicleQuery = vehicleQuery.eq('fleet_id', fleetId);
      } else {
        const org = this.organizationService.selectedOrganization();
        if (!org) {
          this.vehicles.set([]);
          this.isLoading.set(false);
          return;
        }
        const fleetIds = this.fleetService.fleets()
          .filter((f) => f.organization_id === org.id)
          .map((f) => f.id);

        if (fleetIds.length === 0) {
          this.vehicles.set([]);
          this.isLoading.set(false);
          return;
        }
        vehicleQuery = vehicleQuery.in('fleet_id', fleetIds);
      }

      const { data, error } = await vehicleQuery;

      if (error) throw error;

      this.vehicles.set(data ?? []);

      this.telemetryService.subscribeToFleet();

      this.telemetryService.telemetryBatch$
        .pipe(takeUntil(this.destroy$))
        .subscribe((batch) => this.processBatch(batch));
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? 'Failed to load vehicles');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Get vehicles scoped to the current organization (or specific fleet).
   * If fleetId is provided, returns vehicles from that fleet only.
   * If no fleetId, returns vehicles from all fleets in the org.
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
      this.error.set((err as Error).message ?? 'Failed to load vehicles');
      return [];
    }
  }

  /**
   * Get a single vehicle by ID, verifying it belongs to a fleet in the current org.
   */
  async getVehicle(id: string): Promise<Vehicle | null> {
    const org = this.organizationService.selectedOrganization();
    if (!org) {
      this.error.set('No organization selected');
      return null;
    }

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

      if (!fleetIds.includes(data.fleet_id)) {
        this.error.set('Vehicle not found in current organization');
        return null;
      }

      return data;
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? 'Failed to load vehicle');
      return null;
    }
  }

  /** Load latest telemetry records for all vehicles (initial snapshot) */
  async loadInitialTelemetry(): Promise<void> {
    const vehicleIds = this.vehicles().map((v) => v.id);
    if (vehicleIds.length === 0) return;

    const { data } = await this.supabase.client
      .from('telemetry_logs')
      .select('*')
      .in('vehicle_id', vehicleIds)
      .order('timestamp', { ascending: false })
      .limit(500);

    if (data) {
      const grouped = new Map<string, TelemetryRecord[]>();
      for (const record of data) {
        const list = grouped.get(record['vehicle_id'] as string) ?? [];
        list.push(this.mapDbRecord(record));
        grouped.set(record['vehicle_id'] as string, list);
      }
      this.telemetryMap.set(grouped);
    }
  }

  // === Selection ===

  selectVehicle(vehicleId: string | null): void {
    this.selectedVehicleId.set(vehicleId);
  }

  // === Private ===

  private processBatch(batch: TelemetryRecord[]): void {
    // Merge latest record per vehicle from the batch
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

    // Update telemetryMap and trigger alert checks
    this.telemetryMap.update((map) => {
      const newMap = new Map(map);
      latestPerVehicle.forEach((record, vehicleId) => {
        const existing = newMap.get(vehicleId) ?? [];
        newMap.set(
          vehicleId,
          [record, ...existing].slice(0, MAX_TELEMETRY_HISTORY),
        );
        // Trigger alert evaluation
        const vehicle = this.vehicles().find((v) => v.id === vehicleId);
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
