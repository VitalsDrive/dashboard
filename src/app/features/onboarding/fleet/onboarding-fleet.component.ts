import { Component, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatIconModule } from "@angular/material/icon";
import { FleetService } from "../../../core/services/fleet.service";
import { OrganizationService } from "../../../core/services/organization.service";
import { OnboardingLayoutComponent } from "../onboarding-layout.component";

@Component({
  selector: "app-onboarding-fleet",
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
      stepLabel="Step 2 of 3"
      title="What's your first fleet called?"
      subtitle="You can add more fleets and vehicles after setup."
      [error]="error()"
    >
      <form (ngSubmit)="onSubmit()" novalidate>
        <mat-form-field appearance="outline" class="onboarding-field">
          <mat-label>Fleet Name</mat-label>
          <input matInput type="text" [(ngModel)]="fleetName" name="fleetName"
            autocomplete="off" required aria-required="true"
            placeholder="e.g., Delivery Fleet, Service Vehicles" autofocus />
          <mat-icon matPrefix aria-hidden="true">directions_car</mat-icon>
        </mat-form-field>

        <div class="onboarding-actions">
          <button mat-raised-button color="primary" type="submit"
            [disabled]="isLoading() || !fleetName.trim()">
            {{ isLoading() ? "Creating..." : "Continue" }}
          </button>
        </div>
      </form>
    </app-onboarding-layout>
  `,
  styles: [`
    .onboarding-field { width: 100%; margin-bottom: var(--vd-space-6); }
    .onboarding-actions { display: flex; justify-content: flex-end; }
    button[mat-raised-button] { min-width: 140px; height: 48px; font-size: var(--vd-text-md); font-weight: 600; }
    button[disabled] { opacity: 0.6; cursor: not-allowed; }
  `],
})
export class OnboardingFleetComponent {
  private readonly fleetService = inject(FleetService);
  private readonly organizationService = inject(OrganizationService);
  private readonly router = inject(Router);

  fleetName = "";
  isLoading = this.fleetService.isLoading;
  error = signal<string | null>(null);

  async onSubmit(): Promise<void> {
    if (!this.fleetName.trim()) return;
    const orgId = this.organizationService.selectedOrganization()?.id;
    if (!orgId) { this.error.set("No organization selected"); return; }
    this.error.set(null);
    this.fleetService.isLoading.set(true);
    try {
      const fleet = await this.fleetService.createFleet(this.fleetName.trim(), orgId);
      if (fleet) {
        this.router.navigate(["/onboarding/vehicle"]);
      } else {
        this.error.set(this.fleetService.error() ?? "Failed to create fleet");
      }
    } catch (err) {
      this.error.set((err as Error).message ?? "Failed to create fleet");
    } finally {
      this.fleetService.isLoading.set(false);
    }
  }
}
