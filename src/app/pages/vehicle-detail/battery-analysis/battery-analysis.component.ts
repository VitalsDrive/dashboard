import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TelemetryRecord } from '../../../core/models/telemetry.model';
import { BatteryStatusComponent } from '../../../shared/components/battery-status/battery-status.component';

@Component({
  selector: 'app-battery-analysis',
  templateUrl: './battery-analysis.component.html',
  styleUrl: './battery-analysis.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BatteryStatusComponent, DecimalPipe],
})
export class BatteryAnalysisComponent {
  readonly vehicleId = input.required<string>();
  readonly history = input<TelemetryRecord[]>([]);

  readonly currentVoltage = computed(() =>
    this.history().length > 0 ? this.history()[0].voltage : null,
  );

  readonly minVoltage = computed(() => {
    const h = this.history().map((r) => r.voltage);
    return h.length > 0 ? Math.min(...h) : null;
  });

  readonly maxVoltage = computed(() => {
    const h = this.history().map((r) => r.voltage);
    return h.length > 0 ? Math.max(...h) : null;
  });

  readonly avgVoltage = computed(() => {
    const h = this.history().map((r) => r.voltage);
    if (h.length === 0) return null;
    return h.reduce((a, b) => a + b, 0) / h.length;
  });

  readonly batteryState = computed<'good' | 'warning' | 'critical'>(() => {
    const v = this.currentVoltage();
    if (v === null) return 'good';
    if (v < 12.0) return 'critical';
    if (v < 12.4) return 'warning';
    return 'good';
  });

  readonly voltageColor = computed(() => {
    switch (this.batteryState()) {
      case 'critical': return 'var(--color-critical)';
      case 'warning':  return 'var(--color-warning)';
      default:         return 'var(--color-healthy)';
    }
  });
}
