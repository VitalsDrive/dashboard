import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { VehicleService } from '../../../core/services/vehicle.service';
import { VehicleCardComponent } from './vehicle-card/vehicle-card.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-vehicle-grid',
  templateUrl: './vehicle-grid.component.html',
  styleUrl: './vehicle-grid.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VehicleCardComponent, LoadingSpinnerComponent],
})
export class VehicleGridComponent {
  private readonly vehicleService = inject(VehicleService);
  private readonly router = inject(Router);

  readonly vehicles = this.vehicleService.vehiclesWithHealth;
  readonly isLoading = this.vehicleService.vehicleResource.isLoading;
  readonly hasError = computed(() => this.vehicleService.vehicleResource.status() === 'error');
  readonly errorMessage = this.vehicleService.vehicleResource.error;

  onVehicleSelected(vehicleId: string): void {
    this.router.navigate(['/vehicle', vehicleId]);
  }

  trackByVehicleId(_index: number, vehicle: { id: string }): string {
    return vehicle.id;
  }
}
