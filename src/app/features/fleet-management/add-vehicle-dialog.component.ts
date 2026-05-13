import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { CreateVehicleDto } from '../../core/models/vehicle.model';
import { FleetService } from '../../core/services/fleet.service';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-add-vehicle-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
  ],
  template: `
    <div class="vd-dialog">
      <h2 mat-dialog-title class="dialog-title">Add Vehicle</h2>

      <mat-dialog-content>
        <form [formGroup]="form" novalidate class="vehicle-form">
          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Vehicle Nickname</mat-label>
            <input matInput formControlName="nickname" placeholder="e.g. Truck 01" autocomplete="off" />
            @if (form.get('nickname')?.hasError('required') && form.get('nickname')?.touched) {
              <mat-error>Nickname is required</mat-error>
            }
            @if (form.get('nickname')?.hasError('maxlength') && form.get('nickname')?.touched) {
              <mat-error>Must be 2–40 characters</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Fleet</mat-label>
            <mat-select formControlName="fleet_id">
              @for (fleet of fleets(); track fleet.id) {
                <mat-option [value]="fleet.id">{{ fleet.name }}</mat-option>
              }
            </mat-select>
            @if (form.get('fleet_id')?.hasError('required') && form.get('fleet_id')?.touched) {
              <mat-error>Fleet is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Make (optional)</mat-label>
            <input matInput formControlName="make" autocomplete="off" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Model (optional)</mat-label>
            <input matInput formControlName="model" autocomplete="off" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Year (optional)</mat-label>
            <input matInput formControlName="year" type="number" placeholder="e.g. 2020" />
            @if (form.get('year')?.hasError('pattern') && form.get('year')?.touched) {
              <mat-error>Enter a valid year (e.g. 2020)</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>License Plate (optional)</mat-label>
            <input matInput formControlName="license_plate" autocomplete="off" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>VIN (optional)</mat-label>
            <input matInput formControlName="vin" autocomplete="off" />
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="cancel()">Cancel</button>
        <button
          mat-raised-button
          class="vd-btn-primary"
          (click)="submit()"
          [disabled]="form.invalid"
        >
          Add Vehicle
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .vd-dialog {
      background: var(--vd-bg-elevated, #241a12);
      border-radius: var(--vd-radius-xl, 20px);
      padding: var(--vd-space-6, 24px);
    }
    .dialog-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: var(--vd-text-xl, 22px);
      font-weight: 600;
      color: var(--vd-fg-1, #f5e6d3);
      margin: 0 0 16px;
    }
    .vehicle-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .form-field {
      width: 100%;
    }
    .vd-btn-primary {
      background-color: var(--vd-brand, #f59e0b) !important;
      color: #000 !important;
      border-radius: var(--vd-radius-md, 10px) !important;
      font-weight: 600;
    }
  `],
})
export class AddVehicleDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddVehicleDialogComponent>);
  private readonly fleetService = inject(FleetService);

  readonly fleets = this.fleetService.fleets;

  readonly form: FormGroup = this.fb.group({
    nickname: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
    fleet_id: ['', Validators.required],
    make: [null],
    model: [null],
    year: [null, Validators.pattern(/^\d{4}$/)],
    license_plate: [null],
    vin: [null],
  });

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    const dto: CreateVehicleDto = {
      nickname: v.nickname.trim(),
      fleet_id: v.fleet_id,
      make: v.make?.trim() || null,
      model: v.model?.trim() || null,
      year: v.year ? Number(v.year) : null,
      license_plate: v.license_plate?.trim() || null,
      vin: v.vin?.trim() || null,
    };
    this.dialogRef.close(dto);
  }
}
