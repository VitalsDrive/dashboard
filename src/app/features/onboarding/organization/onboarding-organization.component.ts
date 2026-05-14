import { Component, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatIconModule } from "@angular/material/icon";
import { OrganizationService } from "../../../core/services/organization.service";
import { OnboardingLayoutComponent } from "../onboarding-layout.component";

@Component({
  selector: "app-onboarding-organization",
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
      stepLabel="Step 1 of 3"
      title="What's your company name?"
      subtitle="This will be the name of your organization. You can change this later."
      [error]="error()"
    >
      <form (ngSubmit)="onSubmit()" novalidate>
        <mat-form-field appearance="outline" class="onboarding-field">
          <mat-label>Company Name</mat-label>
          <input matInput type="text" [(ngModel)]="organizationName" name="organizationName"
            autocomplete="off" required aria-required="true"
            placeholder="e.g., Acme Logistics, My Company" autofocus />
          <mat-icon matPrefix aria-hidden="true">business</mat-icon>
        </mat-form-field>

        <div class="onboarding-actions">
          <button mat-raised-button color="primary" type="submit"
            [disabled]="isLoading() || !organizationName.trim()">
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
export class OnboardingOrganizationComponent {
  private readonly organizationService = inject(OrganizationService);
  private readonly router = inject(Router);

  organizationName = "";
  isLoading = this.organizationService.isLoading;
  error = signal<string | null>(null);

  async onSubmit(): Promise<void> {
    if (!this.organizationName.trim()) return;
    this.error.set(null);
    this.organizationService.isLoading.set(true);
    try {
      const org = await this.organizationService.createOrganization(this.organizationName.trim());
      if (org) {
        this.organizationService.selectOrganization(org.id);
        this.router.navigate(["/onboarding/fleet"]);
      } else {
        this.error.set(this.organizationService.error() ?? "Failed to create organization");
      }
    } catch (err) {
      this.error.set((err as Error).message ?? "Failed to create organization");
    } finally {
      this.organizationService.isLoading.set(false);
    }
  }
}
