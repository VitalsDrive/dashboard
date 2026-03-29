import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { VehicleWithHealth } from '../../../core/models/vehicle.model';
import { HealthGaugeComponent } from '../../../shared/components/health-gauge/health-gauge.component';
import { BatteryStatusComponent } from '../../../shared/components/battery-status/battery-status.component';
import { VehicleService } from '../../../core/services/vehicle.service';

@Component({
  selector: 'app-vehicle-detail-panel',
  templateUrl: './vehicle-detail-panel.component.html',
  styleUrl: './vehicle-detail-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    HealthGaugeComponent,
    BatteryStatusComponent,
  ],
})
export class VehicleDetailPanelComponent {
  private readonly vehicleService = inject(VehicleService);

  readonly vehicle = input.required<VehicleWithHealth>();
  readonly closed = output<void>();

  readonly history = computed(() => {
    const map = this.vehicleService.telemetryMap();
    return map.get(this.vehicle().id) ?? [];
  });

  readonly coolantTemp = computed(() =>
    this.vehicle().latestTelemetry?.coolant_temp ?? 0,
  );

  readonly speed = computed(() =>
    this.vehicle().latestTelemetry?.speed ?? null,
  );

  readonly rpm = computed(() =>
    this.vehicle().latestTelemetry?.rpm ?? null,
  );

  onClose(): void {
    this.closed.emit();
  }
}
