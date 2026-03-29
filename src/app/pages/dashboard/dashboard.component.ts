import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { VehicleService } from '../../core/services/vehicle.service';
import { AlertService } from '../../core/services/alert.service';
import { VehicleGridComponent } from './vehicle-grid/vehicle-grid.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VehicleGridComponent],
})
export class DashboardComponent {
  private readonly vehicleService = inject(VehicleService);
  private readonly alertService = inject(AlertService);

  readonly vehicleCount = this.vehicleService.onlineVehicleCount;
  readonly alertVehicleCount = this.vehicleService.alertVehicleCount;
  readonly criticalAlertCount = this.alertService.criticalAlertCount;
  readonly activeAlertCount = this.alertService.activeAlertCount;
}
