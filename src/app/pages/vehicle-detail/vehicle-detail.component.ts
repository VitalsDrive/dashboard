import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { VehicleService } from '../../core/services/vehicle.service';
import { HealthGaugeComponent } from '../../shared/components/health-gauge/health-gauge.component';
import { DtcListComponent } from './dtc-list/dtc-list.component';
import { BatteryAnalysisComponent } from './battery-analysis/battery-analysis.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-vehicle-detail',
  templateUrl: './vehicle-detail.component.html',
  styleUrl: './vehicle-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    HealthGaugeComponent,
    DtcListComponent,
    BatteryAnalysisComponent,
    LoadingSpinnerComponent,
  ],
})
export class VehicleDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly vehicleService = inject(VehicleService);

  readonly vehicleId = signal('');

  readonly vehicle = computed(() =>
    this.vehicleService.vehiclesWithHealth().find(
      (v) => v.id === this.vehicleId(),
    ) ?? null,
  );

  readonly history = computed(() => {
    const map = this.vehicleService.telemetryMap();
    return map.get(this.vehicleId()) ?? [];
  });

  readonly coolantTemp = computed(() =>
    this.vehicle()?.latestTelemetry?.coolant_temp ?? 0,
  );

  readonly dtcCodes = computed(() =>
    this.vehicle()?.latestTelemetry?.dtc_codes ?? [],
  );

  readonly isLoading = this.vehicleService.isLoading;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.vehicleId.set(id);
      this.vehicleService.selectVehicle(id);
    }
  }
}
