import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatIconModule } from "@angular/material/icon";
import { AuthService } from "../../core/services/auth.service";
import { OnboardingLayoutComponent } from "./onboarding-layout.component";

@Component({
  selector: "app-onboarding",
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
      stepLabel="Step 1 of 2"
      title="Name Your Fleet"
      subtitle="What would you like to call your first fleet? You can add more fleets and vehicles after setup."
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
          <button mat-stroked-button type="button" (click)="skip()" [disabled]="isLoading()">
            Skip for now
          </button>
          <button mat-raised-button color="primary" type="submit"
            [disabled]="isLoading() || !fleetName.trim()">
            {{ isLoading() ? "Creating..." : "Create Fleet" }}
          </button>
        </div>
      </form>
    </app-onboarding-layout>
  `,
  styles: [`
    .onboarding-field { width: 100%; margin-bottom: var(--vd-space-6); }
    .onboarding-actions { display: flex; gap: var(--vd-space-3); justify-content: flex-end; }
    button[mat-raised-button] { min-width: 140px; height: 48px; font-size: var(--vd-text-md); font-weight: 600; }
    button[disabled] { opacity: 0.6; cursor: not-allowed; }
  `],
})
export class OnboardingComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  fleetName = "";
  isLoading = this.auth.isLoading;
  error = signal<string | null>(null);

  async onSubmit(): Promise<void> {
    if (!this.fleetName.trim()) return;
    this.error.set(null);
    const result = await this.auth.completeOnboarding(this.fleetName.trim());
    if (result.success) {
      this.router.navigate(["/dashboard"]);
    } else {
      this.error.set(result.error ?? "Failed to create fleet");
    }
  }

  async skip(): Promise<void> {
    await this.auth.completeOnboarding("My Fleet");
    this.router.navigate(["/dashboard"]);
  }
}
