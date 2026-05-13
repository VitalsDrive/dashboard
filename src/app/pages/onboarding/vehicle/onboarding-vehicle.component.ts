import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { VehicleService } from '../../../core/services/vehicle.service';
import { FleetService } from '../../../core/services/fleet.service';
import { OrganizationService } from '../../../core/services/organization.service';

@Component({
  selector: 'app-onboarding-vehicle',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  template: `
    <div class="onboarding-page" role="main">
      <div class="onboarding-card">
        <div class="onboarding-header">
          <span class="step-badge">Step 3 of 3</span>
          <h1>Add your first vehicle</h1>
          <p class="text-secondary">
            Register a vehicle to start tracking its health and telemetry.
          </p>
        </div>

        @if (error()) {
          <div class="error-banner" role="alert">
            <mat-icon>error_outline</mat-icon>
            <span>{{ error() }}</span>
          </div>
        }

        <form (ngSubmit)="onSubmit()" novalidate>
          <mat-form-field appearance="outline" class="onboarding-field">
            <mat-label>Vehicle Nickname</mat-label>
            <input
              matInput
              type="text"
              [(ngModel)]="nickname"
              name="nickname"
              autocomplete="off"
              required
              aria-required="true"
              placeholder="e.g. Truck 01"
              autofocus
            />
            <mat-icon matPrefix aria-hidden="true">directions_car</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="onboarding-field">
            <mat-label>Make <span class="optional-label">(optional)</span></mat-label>
            <input
              matInput
              type="text"
              [(ngModel)]="make"
              name="make"
              autocomplete="off"
              placeholder="e.g. Ford"
            />
          </mat-form-field>

          <mat-form-field appearance="outline" class="onboarding-field">
            <mat-label>Model <span class="optional-label">(optional)</span></mat-label>
            <input
              matInput
              type="text"
              [(ngModel)]="model"
              name="model"
              autocomplete="off"
              placeholder="e.g. Transit"
            />
          </mat-form-field>

          <mat-form-field appearance="outline" class="onboarding-field">
            <mat-label>Year <span class="optional-label">(optional)</span></mat-label>
            <input
              matInput
              type="number"
              [(ngModel)]="year"
              name="year"
              autocomplete="off"
              placeholder="e.g. 2022"
              min="1900"
              max="2099"
            />
          </mat-form-field>

          <mat-form-field appearance="outline" class="onboarding-field">
            <mat-label>License Plate <span class="optional-label">(optional)</span></mat-label>
            <input
              matInput
              type="text"
              [(ngModel)]="licensePlate"
              name="licensePlate"
              autocomplete="off"
              placeholder="e.g. ABC-1234"
            />
          </mat-form-field>

          <mat-form-field appearance="outline" class="onboarding-field">
            <mat-label>VIN <span class="optional-label">(optional)</span></mat-label>
            <input
              matInput
              type="text"
              [(ngModel)]="vin"
              name="vin"
              autocomplete="off"
              placeholder="17-character vehicle identifier"
            />
          </mat-form-field>

          <div class="onboarding-actions">
            <button
              mat-raised-button
              color="primary"
              type="submit"
              [disabled]="isLoading() || !nickname.trim()"
            >
              @if (isLoading()) {
                Adding...
              } @else {
                Add Vehicle
              }
            </button>
          </div>
        </form>

        <div class="skip-container">
          <span class="skip-link" (click)="onSkip()" tabindex="0" role="button" (keydown.enter)="onSkip()">
            Skip — add vehicles from Fleet Management
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .onboarding-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
    }
    .onboarding-card {
      width: 100%;
      max-width: 480px;
      padding: 48px 40px;
      background: #1a1a2e;
      border: 1px solid #2d2d44;
      border-radius: 16px;
    }
    .onboarding-header {
      margin-bottom: 32px;
    }
    .step-badge {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(59, 130, 246, 0.15);
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      color: #3b82f6;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      color: #e5e7eb;
      margin: 0 0 12px;
    }
    .onboarding-header p {
      margin: 0;
      line-height: 1.6;
    }
    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(220, 38, 38, 0.15);
      border: 1px solid #dc2626;
      border-radius: 8px;
      color: #dc2626;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .error-banner mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .onboarding-field {
      width: 100%;
      margin-bottom: 16px;
    }
    .optional-label {
      font-size: 11px;
      color: #6b7280;
      font-weight: 400;
    }
    .onboarding-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 8px;
    }
    button[mat-raised-button] {
      min-width: 140px;
      height: 48px;
      font-size: 16px;
      font-weight: 600;
    }
    button[disabled] {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .skip-container {
      margin-top: 20px;
      text-align: center;
    }
    .skip-link {
      color: #6b7280;
      font-size: 14px;
      cursor: pointer;
      text-decoration: none;
    }
    .skip-link:hover {
      text-decoration: underline;
    }

    /* Material overrides */
    ::ng-deep .onboarding-field .mdc-text-field--outlined .mdc-notched-outline__leading,
    ::ng-deep .onboarding-field .mdc-text-field--outlined .mdc-notched-outline__notch,
    ::ng-deep .onboarding-field .mdc-text-field--outlined .mdc-notched-outline__trailing {
      border-color: #3d3d5c;
    }
    ::ng-deep .onboarding-field .mat-mdc-form-field-focus .mdc-notched-outline__leading,
    ::ng-deep .onboarding-field .mat-mdc-form-field-focus .mdc-notched-outline__notch,
    ::ng-deep .onboarding-field .mat-mdc-form-field-focus .mdc-notched-outline__trailing {
      border-color: #3b82f6;
      border-width: 2px;
    }
    ::ng-deep .onboarding-field .mdc-text-field--outlined .mdc-floating-label {
      color: #9ca3af;
    }
    ::ng-deep .onboarding-field .mdc-text-field--outlined:not(.mdc-text-field--disabled) {
      background: #0f0f1a;
    }
  `]
})
export class OnboardingVehicleComponent implements OnInit {
  private readonly vehicleService = inject(VehicleService);
  private readonly fleetService = inject(FleetService);
  private readonly organizationService = inject(OrganizationService);
  private readonly router = inject(Router);

  nickname = '';
  make = '';
  model = '';
  year: number | null = null;
  licensePlate = '';
  vin = '';

  isLoading = this.vehicleService.isLoading;
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    // Ensure fleets are loaded so we can get fleet_id for the new vehicle
    const org = this.organizationService.selectedOrganization();
    if (org && this.fleetService.fleets().length === 0) {
      await this.fleetService.loadFleets(org.id);
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.nickname.trim()) return;

    const fleets = this.fleetService.fleets();
    if (fleets.length === 0) {
      this.error.set('No fleet found. Please complete onboarding step 2 first.');
      return;
    }

    this.error.set(null);
    this.vehicleService.isLoading.set(true);

    try {
      const dto: Record<string, unknown> = {
        nickname: this.nickname.trim(),
        fleet_id: fleets[0].id,
      };
      if (this.make.trim()) dto['make'] = this.make.trim();
      if (this.model.trim()) dto['model'] = this.model.trim();
      if (this.year) dto['year'] = this.year;
      if (this.licensePlate.trim()) dto['license_plate'] = this.licensePlate.trim();
      if (this.vin.trim()) dto['vin'] = this.vin.trim();

      const vehicle = await this.vehicleService.createVehicle(dto as any);

      if (vehicle) {
        this.router.navigate(['/dashboard']);
      } else {
        this.error.set(this.vehicleService.error() ?? 'Failed to add vehicle');
      }
    } catch (err) {
      this.error.set((err as Error).message ?? 'Failed to add vehicle');
    } finally {
      this.vehicleService.isLoading.set(false);
    }
  }

  onSkip(): void {
    this.router.navigate(['/dashboard']);
  }
}
