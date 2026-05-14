import { Component, inject } from "@angular/core";
import { Router } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { AuthService } from "../../../core/services/auth.service";
import { OnboardingLayoutComponent } from "../onboarding-layout.component";

@Component({
  selector: "app-onboarding-complete",
  standalone: true,
  imports: [MatButtonModule, MatIconModule, OnboardingLayoutComponent],
  template: `
    <app-onboarding-layout title="Your account is ready!">
      <div class="success-icon">
        <mat-icon>check_circle</mat-icon>
      </div>

      <p class="subtitle">
        You can now start adding vehicles to your fleet and monitoring their vitals.
      </p>

      <div class="next-steps">
        <h2>Next steps</h2>
        <ul>
          <li><mat-icon>directions_car</mat-icon><span>Add vehicles to your fleet</span></li>
          <li><mat-icon>smartphone</mat-icon><span>Install the mobile app on your devices</span></li>
          <li><mat-icon>analytics</mat-icon><span>Monitor vehicle vitals in real-time</span></li>
        </ul>
      </div>

      <button mat-raised-button color="primary" class="dashboard-btn" (click)="goToDashboard()">
        Go to Dashboard
      </button>
    </app-onboarding-layout>
  `,
  styles: [`
    :host { display: contents; }
    .success-icon { text-align: center; margin-bottom: var(--vd-space-4); }
    .success-icon mat-icon { font-size: 64px; width: 64px; height: 64px; color: var(--vd-healthy); }
    .subtitle { margin: 0 0 var(--vd-space-8); color: var(--vd-fg-3); line-height: var(--vd-leading-base); text-align: center; }
    .next-steps {
      margin-bottom: var(--vd-space-8);
      padding: var(--vd-space-6);
      background: var(--vd-bg-sunken);
      border: 1px solid var(--vd-border-subtle);
      border-radius: var(--vd-radius-md);
    }
    .next-steps h2 { font-size: var(--vd-text-base); font-weight: 600; color: var(--vd-fg-2); margin: 0 0 var(--vd-space-4); }
    .next-steps ul { list-style: none; padding: 0; margin: 0; }
    .next-steps li { display: flex; align-items: center; gap: var(--vd-space-3); padding: var(--vd-space-2) 0; color: var(--vd-fg-3); font-size: var(--vd-text-base); }
    .next-steps li mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--vd-brand); }
    .dashboard-btn { width: 100%; height: 48px; font-size: var(--vd-text-md); font-weight: 600; }
  `],
})
export class OnboardingCompleteComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  async goToDashboard(): Promise<void> {
    await this.authService.completeOnboarding();
    this.router.navigate(["/dashboard"]);
  }
}
