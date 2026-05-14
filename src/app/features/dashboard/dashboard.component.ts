import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VehicleService } from '../../core/services/vehicle.service';
import { AlertService } from '../../core/services/alert.service';
import { FleetService } from '../../core/services/fleet.service';
import { VehicleGridComponent } from './vehicle-grid/vehicle-grid.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VehicleGridComponent, LoadingSpinnerComponent, RouterLink],
})
export class DashboardComponent {
  readonly vehicleService = inject(VehicleService);
  private readonly alertService = inject(AlertService);
  private readonly fleetService = inject(FleetService);

  readonly vehicleCount = this.vehicleService.onlineVehicleCount;
  readonly alertVehicleCount = this.vehicleService.alertVehicleCount;
  readonly criticalAlertCount = this.alertService.criticalAlertCount;
  readonly activeAlertCount = this.alertService.activeAlertCount;
  readonly selectedFleet = this.fleetService.selectedFleet;

  // Resource-driven loading/empty states
  readonly isLoading = this.vehicleService.vehicleResource.isLoading;
  readonly vehiclesWithHealth = this.vehicleService.vehiclesWithHealth;
  readonly hasError = computed(() => this.vehicleService.vehicleResource.status() === 'error');
}
