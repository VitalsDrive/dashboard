import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FleetService } from '../../../core/services/fleet.service';
import { OrganizationService } from '../../../core/services/organization.service';

@Component({
  selector: 'app-onboarding-fleet',
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
          <span class="step-badge">Step 2 of 3</span>
          <h1>What's your first fleet called?</h1>
          <p class="text-secondary">
            You can add more fleets and vehicles after setup.
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
            <mat-label>Fleet Name</mat-label>
            <input
              matInput
              type="text"
              [(ngModel)]="fleetName"
              name="fleetName"
              autocomplete="off"
              required
              aria-required="true"
              placeholder="e.g., Delivery Fleet, Service Vehicles"
              autofocus
            />
            <mat-icon matPrefix aria-hidden="true">directions_car</mat-icon>
          </mat-form-field>

          <div class="onboarding-actions">
            <button
              mat-raised-button
              color="primary"
              type="submit"
              [disabled]="isLoading() || !fleetName.trim()"
            >
              @if (isLoading()) {
                Creating...
              } @else {
                Continue
              }
            </button>
          </div>
        </form>
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
      margin-bottom: 24px;
    }
    .onboarding-field mat-icon {
      color: #6b7280;
      margin-right: 8px;
    }
    .onboarding-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
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
export class OnboardingFleetComponent {
  private readonly fleetService = inject(FleetService);
  private readonly organizationService = inject(OrganizationService);
  private readonly router = inject(Router);

  fleetName = '';
  isLoading = this.fleetService.isLoading;
  error = signal<string | null>(null);

  async onSubmit(): Promise<void> {
    if (!this.fleetName.trim()) return;

    const orgId = this.organizationService.selectedOrganization()?.id;
    if (!orgId) {
      this.error.set('No organization selected');
      return;
    }

    this.error.set(null);
    this.fleetService.isLoading.set(true);

    try {
      const fleet = await this.fleetService.createFleet(this.fleetName.trim(), orgId);

      if (fleet) {
        this.router.navigate(['/onboarding/complete']);
      } else {
        this.error.set(this.fleetService.error() ?? 'Failed to create fleet');
      }
    } catch (err) {
      this.error.set((err as Error).message ?? 'Failed to create fleet');
    } finally {
      this.fleetService.isLoading.set(false);
    }
  }
}
