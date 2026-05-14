import { Component, inject, signal, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatIconModule } from "@angular/material/icon";
import { VehicleService } from "../../../core/services/vehicle.service";
import { FleetService } from "../../../core/services/fleet.service";
import { OrganizationService } from "../../../core/services/organization.service";
import { OnboardingLayoutComponent } from "../onboarding-layout.component";

@Component({
  selector: "app-onboarding-vehicle",
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    OnboardingLayoutComponent,
  ],
  template: `
    <app-onboarding-layout
      stepLabel="Step 3 of 3"
      title="Add your first vehicle"
      subtitle="Register a vehicle to start tracking its health and telemetry."
      [error]="error()"
    >
      <form (ngSubmit)="onSubmit()" novalidate>
        <mat-form-field appearance="outline" class="onboarding-field">
          <mat-label>Vehicle Nickname</mat-label>
          <input matInput type="text" [(ngModel)]="nickname" name="nickname"
            autocomplete="off" required aria-required="true" placeholder="e.g. Truck 01" autofocus />
          <mat-icon matPrefix aria-hidden="true">directions_car</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="onboarding-field">
          <mat-label>Make <span class="optional-label">(optional)</span></mat-label>
          <input matInput type="text" [(ngModel)]="make" name="make" autocomplete="off" placeholder="e.g. Ford" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="onboarding-field">
          <mat-label>Model <span class="optional-label">(optional)</span></mat-label>
          <input matInput type="text" [(ngModel)]="model" name="model" autocomplete="off" placeholder="e.g. Transit" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="onboarding-field">
          <mat-label>Year <span class="optional-label">(optional)</span></mat-label>
          <input matInput type="number" [(ngModel)]="year" name="year" autocomplete="off"
            placeholder="e.g. 2022" min="1900" max="2099" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="onboarding-field">
          <mat-label>License Plate <span class="optional-label">(optional)</span></mat-label>
          <input matInput type="text" [(ngModel)]="licensePlate" name="licensePlate" autocomplete="off" placeholder="e.g. ABC-1234" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="onboarding-field">
          <mat-label>VIN <span class="optional-label">(optional)</span></mat-label>
          <input matInput type="text" [(ngModel)]="vin" name="vin" autocomplete="off" placeholder="17-character vehicle identifier" />
        </mat-form-field>

        <div class="onboarding-actions">
          <button mat-raised-button color="primary" type="submit"
            [disabled]="isLoading() || !nickname.trim()">
            {{ isLoading() ? "Adding..." : "Add Vehicle" }}
          </button>
        </div>
      </form>

      <div class="skip-container">
        <span class="skip-link" (click)="onSkip()" tabindex="0" role="button" (keydown.enter)="onSkip()">
          Skip — add vehicles from Fleet Management
        </span>
      </div>
    </app-onboarding-layout>
  `,
  styles: [`
    .onboarding-field { width: 100%; margin-bottom: var(--vd-space-4); }
    .optional-label { font-size: var(--vd-text-xs); color: var(--vd-fg-3); font-weight: 400; }
    .onboarding-actions { display: flex; justify-content: flex-end; margin-top: var(--vd-space-2); }
    button[mat-raised-button] { min-width: 140px; height: 48px; font-size: var(--vd-text-md); font-weight: 600; }
    button[disabled] { opacity: 0.6; cursor: not-allowed; }
    .skip-container { margin-top: var(--vd-space-5); text-align: center; }
    .skip-link { color: var(--vd-fg-3); font-size: var(--vd-text-base); cursor: pointer; }
    .skip-link:hover { color: var(--vd-fg-2); text-decoration: underline; }
  `],
})
export class OnboardingVehicleComponent implements OnInit {
  private readonly vehicleService = inject(VehicleService);
  private readonly fleetService = inject(FleetService);
  private readonly organizationService = inject(OrganizationService);
  private readonly router = inject(Router);

  nickname = "";
  make = "";
  model = "";
  year: number | null = null;
  licensePlate = "";
  vin = "";

  isLoading = this.vehicleService.isLoading;
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const org = this.organizationService.selectedOrganization();
    if (org && this.fleetService.fleets().length === 0) {
      await this.fleetService.loadFleets(org.id);
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.nickname.trim()) return;
    const fleets = this.fleetService.fleets();
    if (fleets.length === 0) {
      this.error.set("No fleet found. Please complete onboarding step 2 first.");
      return;
    }
    this.error.set(null);
    this.vehicleService.isLoading.set(true);
    try {
      const dto: Record<string, unknown> = { nickname: this.nickname.trim(), fleet_id: fleets[0].id };
      if (this.make.trim()) dto["make"] = this.make.trim();
      if (this.model.trim()) dto["model"] = this.model.trim();
      if (this.year) dto["year"] = this.year;
      if (this.licensePlate.trim()) dto["license_plate"] = this.licensePlate.trim();
      if (this.vin.trim()) dto["vin"] = this.vin.trim();
      const vehicle = await this.vehicleService.createVehicle(dto as any);
      if (vehicle) {
        this.router.navigate(["/dashboard"]);
      } else {
        this.error.set(this.vehicleService.error() ?? "Failed to add vehicle");
      }
    } catch (err) {
      this.error.set((err as Error).message ?? "Failed to add vehicle");
    } finally {
      this.vehicleService.isLoading.set(false);
    }
  }

  onSkip(): void {
    this.router.navigate(["/dashboard"]);
  }
}
