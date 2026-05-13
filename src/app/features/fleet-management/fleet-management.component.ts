import {
  Component,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { VehicleService } from '../../core/services/vehicle.service';
import { FleetService } from '../../core/services/fleet.service';
import { Vehicle, CreateVehicleDto } from '../../core/models/vehicle.model';
import { AddVehicleDialogComponent } from './add-vehicle-dialog.component';
import { RemoveVehicleDialogComponent } from './remove-vehicle-dialog.component';

@Component({
  selector: 'app-fleet-management',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './fleet-management.component.html',
  styleUrl: './fleet-management.component.scss',
})
export class FleetManagementComponent implements OnInit {
  private readonly vehicleService = inject(VehicleService);
  private readonly fleetService = inject(FleetService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly vehicles = this.vehicleService.vehicles;
  readonly fleets = this.fleetService.fleets;
  readonly isLoading = this.vehicleService.isLoading;
  readonly error = this.vehicleService.error;
  readonly selectedFleetId = signal<string | null>(null);

  ngOnInit(): void {
    this.vehicleService.loadAllVehicles();
    this.fleetService.loadFleets();
  }

  onFleetChange(fleetId: string | null): void {
    this.selectedFleetId.set(fleetId);
    if (!fleetId) {
      this.vehicleService.loadAllVehicles();
    } else {
      this.vehicleService.loadVehicles(fleetId);
    }
  }

  openAddVehicleDialog(): void {
    const dialogRef = this.dialog.open(AddVehicleDialogComponent, {
      width: '480px',
      panelClass: 'vd-dialog-panel',
    });

    dialogRef.afterClosed().subscribe(async (result: CreateVehicleDto | undefined) => {
      if (!result) return;
      const vehicle = await this.vehicleService.createVehicle(result);
      if (vehicle) {
        this.snackBar.open('Vehicle added', 'Dismiss', { duration: 3000 });
      }
    });
  }

  openRemoveDialog(vehicle: Vehicle): void {
    const dialogRef = this.dialog.open(RemoveVehicleDialogComponent, {
      width: '400px',
      panelClass: 'vd-dialog-panel',
      data: { vehicle },
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (!confirmed) return;
      const success = await this.vehicleService.deleteVehicle(vehicle.id);
      if (success) {
        this.snackBar.open('Vehicle removed', 'Dismiss', { duration: 3000 });
      }
    });
  }

  getFleetName(fleetId: string): string {
    return this.fleets().find((f) => f.id === fleetId)?.name ?? fleetId;
  }
}
