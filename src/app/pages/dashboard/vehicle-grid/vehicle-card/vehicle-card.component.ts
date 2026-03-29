import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { VehicleWithHealth } from '../../../../core/models/vehicle.model';
import { HealthGaugeComponent } from '../../../../shared/components/health-gauge/health-gauge.component';
import { BatteryStatusComponent } from '../../../../shared/components/battery-status/battery-status.component';
import { DtcIndicatorComponent } from '../../../../shared/components/dtc-indicator/dtc-indicator.component';
import { VehicleService } from '../../../../core/services/vehicle.service';

@Component({
  selector: 'app-vehicle-card',
  templateUrl: './vehicle-card.component.html',
  styleUrl: './vehicle-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DatePipe,
    HealthGaugeComponent,
    BatteryStatusComponent,
    DtcIndicatorComponent,
  ],
})
export class VehicleCardComponent {
  private readonly vehicleService = inject(VehicleService);

  readonly vehicle = input.required<VehicleWithHealth>();
  readonly clicked = output<string>();

  readonly telemetryHistory = computed(() => {
    const map = this.vehicleService.telemetryMap();
    return map.get(this.vehicle().id) ?? [];
  });

  readonly coolantTemp = computed(() =>
    this.vehicle().latestTelemetry?.coolant_temp ?? 0,
  );

  readonly dtcCodes = computed(() =>
    this.vehicle().latestTelemetry?.dtc_codes ?? [],
  );

  readonly engineOn = computed(() =>
    this.vehicle().latestTelemetry?.engine_on ?? false,
  );

  readonly lastSeen = computed(
    () => this.vehicle().latestTelemetry?.timestamp ?? null,
  );

  readonly cardBorderClass = computed(() => {
    const v = this.vehicle();
    if (v.alertCount > 0) {
      const hasCritical = v.healthScore < 50;
      return hasCritical ? 'card--critical' : 'card--warning';
    }
    return '';
  });

  onCardClick(): void {
    this.clicked.emit(this.vehicle().id);
  }
}
