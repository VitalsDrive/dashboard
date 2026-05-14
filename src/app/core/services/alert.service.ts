import { Injectable, computed, signal } from '@angular/core';
import { Alert, AlertSeverity, AlertStatus, AlertType } from '../models/alert.model';
import { TelemetryRecord } from '../models/telemetry.model';
import { DtcTranslationService } from './dtc-translation.service';

/** Critical DTC codes that escalate to critical severity */
const CRITICAL_DTC_CODES = new Set(['P0300', 'P0325', 'P0335', 'P0562', 'P0600', 'P2120', 'P2135', 'P0700', 'P0730']);

let alertIdCounter = 0;
function generateId(): string {
  return `alert-${Date.now()}-${++alertIdCounter}`;
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly dtcService = new DtcTranslationService();

  private readonly _alerts = signal<Alert[]>([]);
  /** Rolling history of battery voltage per vehicle: vehicleId → last 10 readings */
  private readonly voltageHistory = new Map<string, number[]>();

  // === Public computed slices ===

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

  // === Alert processing ===

  /**
   * Process a new telemetry record and create alerts as needed.
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

  acknowledgeAlert(alertId: string): void {
    this._alerts.update((alerts) =>
      alerts.map((a) =>
        a.id === alertId ? { ...a, status: 'acknowledged' as AlertStatus } : a,
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
   * Uses vehicleId 'fleet' as a non-vehicle sentinel value.
   * Auto-dismiss: 'warning' = 12000ms, 'info' = 8000ms (per ALERT_AUTO_DISMISS).
   */
  pushAlert(message: string, severity: AlertSeverity, type: AlertType = 'connection'): void {
    this._alerts.update(alerts => {
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

  // === Private helpers ===

  private checkCoolantAlert(telemetry: TelemetryRecord, vehicleName?: string): void {
    const temp = telemetry.coolant_temp;

    // Resolve previous coolant alerts if temp is back to normal
    if (temp <= 100) {
      this.resolveAlertsForVehicle(telemetry.vehicle_id, 'coolant');
      return;
    }

    // Deduplicate: only create one active coolant alert per vehicle
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

    // Resolve if voltage is healthy
    if (latest >= 12.6) {
      this.resolveAlertsForVehicle(telemetry.vehicle_id, 'battery');
      return;
    }

    // Deduplicate
    const existing = this.activeAlerts().find(
      (a) => a.type === 'battery' && a.vehicleId === telemetry.vehicle_id,
    );
    if (existing) return;

    // Check predictive failure via linear regression
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
      // Cap alerts at 200 total to prevent memory issues
      const trimmed = alerts.length >= 200 ? alerts.slice(-199) : alerts;
      return [...trimmed, alert];
    });
  }

  private updateVoltageHistory(vehicleId: string, voltage: number): void {
    const history = this.voltageHistory.get(vehicleId) ?? [];
    const updated = [...history, voltage].slice(-30); // keep last 30 readings
    this.voltageHistory.set(vehicleId, updated);
  }

  /** Minimum voltage samples before predictive regression is trusted. */
  private static readonly MIN_PREDICTION_SAMPLES = 15;

  /**
   * Simple linear regression to predict near-future voltage.
   * Returns null if insufficient data.
   *
   * NOTE: telemetry batch cadence is not guaranteed to be 1/min, so the
   * prediction horizon is capped relative to the sample count (extrapolate
   * at most as far ahead as we have observed) to avoid amplifying noise
   * from a short, noisy window into a false-positive alert.
   */
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

    // Cap extrapolation: never predict further ahead than the window we
    // actually observed (max horizon = n readings, ceiling 120).
    const horizon = Math.min(n, 120);
    return slope * (n + horizon) + intercept;
  }

  /** Expose voltage history for battery components */
  getVoltageHistory(vehicleId: string): number[] {
    return this.voltageHistory.get(vehicleId) ?? [];
  }
}
