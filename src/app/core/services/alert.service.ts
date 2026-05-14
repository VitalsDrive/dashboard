import { Injectable, OnDestroy, computed, effect, inject, resource, signal } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Alert, AlertSeverity, AlertStatus, AlertType, ALERT_AUTO_DISMISS, SupabaseAlert } from '../models/alert.model';
import { TelemetryRecord } from '../models/telemetry.model';
import { DtcTranslationService } from './dtc-translation.service';
import { FleetService } from './fleet.service';
import { SupabaseService } from './supabase.service';

/** Critical DTC codes that escalate to critical severity */
const CRITICAL_DTC_CODES = new Set(['P0300', 'P0325', 'P0335', 'P0562', 'P0600', 'P2120', 'P2135', 'P0700', 'P0730']);

let alertIdCounter = 0;
function generateId(): string {
  return `alert-${Date.now()}-${++alertIdCounter}`;
}

@Injectable({ providedIn: 'root' })
export class AlertService implements OnDestroy {
  private readonly dtcService = new DtcTranslationService();
  private readonly supabase = inject(SupabaseService);
  private readonly fleetService = inject(FleetService);

  // === In-memory alert stream (kept for ToastComponent + HeaderComponent compat) ===

  private readonly _alerts = signal<Alert[]>([]);
  /** Rolling history of battery voltage per vehicle: vehicleId → last 10 readings */
  private readonly voltageHistory = new Map<string, number[]>();

  readonly alerts = this._alerts.asReadonly();

  readonly activeAlerts = computed(() =>
    this._alerts().filter((a) => a.status === 'active'),
  );

  readonly dtcAlerts = computed(() =>
    this.activeAlerts().filter((a) => a.type === 'dtc'),
  );

  readonly batteryAlerts = computed(() =>
    this.activeAlerts().filter((a) => a.type === 'battery'),
  );

  readonly coolantAlerts = computed(() =>
    this.activeAlerts().filter((a) => a.type === 'coolant'),
  );

  readonly criticalAlerts = computed(() =>
    this.activeAlerts().filter((a) => a.severity === 'critical'),
  );

  readonly activeAlertCount = computed(() => this.activeAlerts().length);
  readonly criticalAlertCount = computed(() => this.criticalAlerts().length);

  // === Supabase-backed DB alert layer ===

  private readonly _dbAlerts = signal<SupabaseAlert[]>([]);
  readonly dbAlerts = this._dbAlerts.asReadonly();

  readonly activeDbAlerts = computed(() =>
    this._dbAlerts().filter((a) => !a.acknowledged),
  );

  readonly unacknowledgedCount = computed(() => this.activeDbAlerts().length);

  // === alertResource: loads last 7 days of alerts for user's fleets ===

  readonly alertResource = resource({
    params: () => {
      const fleetIds = this.fleetService.fleets().map((f) => f.id);
      return fleetIds.length > 0 ? { fleetIds } : undefined;
    },
    loader: async ({ params: { fleetIds } }: { params: { fleetIds: string[] } }) => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await this.supabase.client
        .from('alerts')
        .select('*', { count: 'exact' })
        .in('fleet_id', fleetIds)
        .gte('created_at', since)
        .order('acknowledged', { ascending: true })
        .order('created_at', { ascending: false })
        .range(0, 199);
      if (error) throw error;
      this._dbAlerts.set((data ?? []) as SupabaseAlert[]);
      return data;
    },
    defaultValue: [],
  });

  // === Realtime subscription ===

  private alertChannel: RealtimeChannel | null = null;

  constructor() {
    // Re-subscribe whenever fleet set changes or resource resolves, so newly
    // joined fleets receive Realtime INSERTs without a page reload (CR-01).
    effect(() => {
      const fleetIds = this.fleetService.fleets().map((f) => f.id);
      if (fleetIds.length === 0 || this.alertResource.status() !== 'resolved') return;
      if (this.alertChannel) {
        this.supabase.client.removeChannel(this.alertChannel);
        this.alertChannel = null;
      }
      this.subscribeToAlerts(fleetIds);
    });
  }

  subscribeToAlerts(fleetIds: string[]): void {
    this.alertChannel = this.supabase.client
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        // fleet_id filter bypasses Realtime RLS (Auth0 jwt->>'sub' not forwarded to RLS context)
        { event: 'INSERT', schema: 'public', table: 'alerts', filter: `fleet_id=in.(${fleetIds.join(',')})` },
        (payload: { new: unknown }) => {
          const alert = payload.new as SupabaseAlert;
          this._dbAlerts.update((alerts) => [alert, ...alerts]);
          // Push in-memory Alert so ToastComponent fires (COOL-02 / BATT-02)
          this.pushAlertFromDb(alert);
        },
      )
      .subscribe();
  }

  // === acknowledgeAlert: direct Supabase UPDATE + optimistic signal flip ===

  async acknowledgeAlert(alertId: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('alerts')
      .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq('id', alertId);
    if (error) throw error;
    // Optimistic update — do NOT write acknowledged_by (UUID FK incompatible with Auth0 TEXT sub)
    const ackedAt = new Date().toISOString();
    this._dbAlerts.update((alerts) =>
      alerts.map((a) => (a.id === alertId ? { ...a, acknowledged: true, acknowledged_at: ackedAt } : a)),
    );
  }

  ngOnDestroy(): void {
    if (this.alertChannel) {
      this.supabase.client.removeChannel(this.alertChannel);
    }
  }

  // === In-memory alert operations (kept for ToastComponent / legacy compat) ===

  /**
   * Process a new telemetry record and create alerts as needed.
   * NOTE: This method is retained as dead code after plan 04-02.
   * The DB trigger (migration 014) owns detection; VehicleService no longer calls this.
   */
  checkAndCreateAlerts(telemetry: TelemetryRecord, vehicleName?: string): void {
    this.updateVoltageHistory(telemetry.vehicle_id, telemetry.voltage);
    this.checkCoolantAlert(telemetry, vehicleName);
    this.checkBatteryAlert(telemetry, vehicleName);
    this.checkDtcAlerts(telemetry, vehicleName);
  }

  dismissAlert(alertId: string): void {
    this._alerts.update((alerts) =>
      alerts.map((a) =>
        a.id === alertId ? { ...a, status: 'dismissed' as AlertStatus } : a,
      ),
    );
  }

  resolveAlertsForVehicle(vehicleId: string, type?: AlertType): void {
    this._alerts.update((alerts) =>
      alerts.map((a) => {
        if (a.vehicleId !== vehicleId) return a;
        if (type && a.type !== type) return a;
        return { ...a, status: 'resolved' as AlertStatus };
      }),
    );
  }

  clearAllAlerts(): void {
    this._alerts.set([]);
  }

  /**
   * Push a connection (or other fleet-level) alert into the toast stream.
   */
  pushAlert(message: string, severity: AlertSeverity, type: AlertType = 'connection'): void {
    this._alerts.update((alerts) => {
      const trimmed = alerts.length >= 200 ? alerts.slice(-199) : alerts;
      const id = `alert-${Date.now()}-${++alertIdCounter}`;
      return [...trimmed, {
        id,
        vehicleId: 'fleet',
        type,
        severity,
        message,
        timestamp: new Date(),
        status: 'active' as AlertStatus,
      }];
    });
  }

  /** Expose voltage history for battery components */
  getVoltageHistory(vehicleId: string): number[] {
    return this.voltageHistory.get(vehicleId) ?? [];
  }

  // === Private helpers ===

  /**
   * Map a SupabaseAlert row to an in-memory Alert and push it to _alerts,
   * so the ToastComponent fires for Realtime INSERTs.
   */
  private pushAlertFromDb(dbAlert: SupabaseAlert): void {
    const type: AlertType =
      dbAlert.code?.startsWith('P') ? 'dtc' :
      dbAlert.code?.includes('BATTERY') || dbAlert.code?.includes('BATT') ? 'battery' :
      dbAlert.code?.includes('COOLANT') || dbAlert.code?.includes('COOL') ? 'coolant' :
      'connection';

    const autoDismiss = ALERT_AUTO_DISMISS[dbAlert.severity];
    const alert: Alert = {
      id: generateId(),
      vehicleId: dbAlert.vehicle_id,
      type,
      severity: dbAlert.severity,
      code: dbAlert.code,
      message: dbAlert.message,
      timestamp: new Date(dbAlert.created_at),
      status: 'active',
      metadata: autoDismiss > 0 ? { autoDismissMs: autoDismiss } : undefined,
    };

    this._alerts.update((alerts) => {
      const trimmed = alerts.length >= 200 ? alerts.slice(-199) : alerts;
      return [...trimmed, alert];
    });
  }

  private checkCoolantAlert(telemetry: TelemetryRecord, vehicleName?: string): void {
    const temp = telemetry.coolant_temp;

    if (temp <= 100) {
      this.resolveAlertsForVehicle(telemetry.vehicle_id, 'coolant');
      return;
    }

    const existing = this.activeAlerts().find(
      (a) => a.type === 'coolant' && a.vehicleId === telemetry.vehicle_id,
    );
    if (existing) return;

    if (temp > 105) {
      this.createAlert({
        id: generateId(),
        vehicleId: telemetry.vehicle_id,
        vehicleName,
        type: 'coolant',
        severity: 'critical',
        message: `Engine overheating: ${temp}°C — Stop driving and let engine cool`,
        timestamp: new Date(),
        status: 'active',
      });
    } else if (temp > 100) {
      this.createAlert({
        id: generateId(),
        vehicleId: telemetry.vehicle_id,
        vehicleName,
        type: 'coolant',
        severity: 'warning',
        message: `Engine running hot: ${temp}°C`,
        timestamp: new Date(),
        status: 'active',
      });
    }
  }

  private checkBatteryAlert(telemetry: TelemetryRecord, vehicleName?: string): void {
    const history = this.voltageHistory.get(telemetry.vehicle_id) ?? [];
    if (history.length < 3) return;

    const latest = history[history.length - 1];
    const avg = history.reduce((a, b) => a + b, 0) / history.length;

    if (latest >= 12.6) {
      this.resolveAlertsForVehicle(telemetry.vehicle_id, 'battery');
      return;
    }

    const existing = this.activeAlerts().find(
      (a) => a.type === 'battery' && a.vehicleId === telemetry.vehicle_id,
    );
    if (existing) return;

    const predictedDrop = this.predictVoltageIn2Hours(history);
    if (predictedDrop !== null && predictedDrop < 12.0) {
      this.createAlert({
        id: generateId(),
        vehicleId: telemetry.vehicle_id,
        vehicleName,
        type: 'battery',
        severity: 'warning',
        message: `Battery may not start tonight — predicted: ${predictedDrop.toFixed(1)}V in 2 hours`,
        timestamp: new Date(),
        status: 'active',
        metadata: { predicted: predictedDrop },
      });
      return;
    }

    if (latest < 12.0) {
      this.createAlert({
        id: generateId(),
        vehicleId: telemetry.vehicle_id,
        vehicleName,
        type: 'battery',
        severity: 'critical',
        message: `Battery critical: ${latest.toFixed(1)}V — Vehicle may not start`,
        timestamp: new Date(),
        status: 'active',
      });
    } else if (latest < 12.4 && avg < 12.4) {
      this.createAlert({
        id: generateId(),
        vehicleId: telemetry.vehicle_id,
        vehicleName,
        type: 'battery',
        severity: 'warning',
        message: `Battery voltage low: ${latest.toFixed(1)}V`,
        timestamp: new Date(),
        status: 'active',
      });
    }
  }

  private checkDtcAlerts(telemetry: TelemetryRecord, vehicleName?: string): void {
    if (!telemetry.dtc_codes || telemetry.dtc_codes.length === 0) return;

    for (const code of telemetry.dtc_codes) {
      const alreadyActive = this._alerts().find(
        (a) =>
          a.type === 'dtc' &&
          a.vehicleId === telemetry.vehicle_id &&
          a.code === code &&
          a.status === 'active',
      );
      if (alreadyActive) continue;

      const entry = this.dtcService.translate(code);
      const severity: AlertSeverity = CRITICAL_DTC_CODES.has(code)
        ? 'critical'
        : (entry.severity === 'high' || entry.severity === 'critical')
          ? 'critical'
          : 'warning';

      this.createAlert({
        id: generateId(),
        vehicleId: telemetry.vehicle_id,
        vehicleName,
        type: 'dtc',
        severity,
        code,
        message: `Check Engine: ${code} — ${entry.description}`,
        timestamp: new Date(),
        status: 'active',
        metadata: { entry },
      });
    }
  }

  private createAlert(alert: Alert): void {
    this._alerts.update((alerts) => {
      const trimmed = alerts.length >= 200 ? alerts.slice(-199) : alerts;
      return [...trimmed, alert];
    });
  }

  private updateVoltageHistory(vehicleId: string, voltage: number): void {
    const history = this.voltageHistory.get(vehicleId) ?? [];
    const updated = [...history, voltage].slice(-30);
    this.voltageHistory.set(vehicleId, updated);
  }

  private static readonly MIN_PREDICTION_SAMPLES = 15;

  private predictVoltageIn2Hours(history: number[]): number | null {
    if (history.length < AlertService.MIN_PREDICTION_SAMPLES) return null;

    const n = history.length;
    const xMean = (n - 1) / 2;
    const yMean = history.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (history[i] - yMean);
      denominator += (i - xMean) ** 2;
    }

    if (denominator === 0) return null;
    const slope = numerator / denominator;
    const intercept = yMean - slope * xMean;

    const horizon = Math.min(n, 120);
    return slope * (n + horizon) + intercept;
  }
}
