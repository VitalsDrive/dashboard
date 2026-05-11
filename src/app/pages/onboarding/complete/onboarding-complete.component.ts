import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-onboarding-complete',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="onboarding-page" role="main">
      <div class="onboarding-card">
        <div class="success-icon">
          <mat-icon>check_circle</mat-icon>
        </div>

        <h1>Your account is ready!</h1>

        <p class="text-secondary">
          You can now start adding vehicles to your fleet and monitoring their vitals.
          We've created a sample fleet to get you started.
        </p>

        <div class="next-steps">
          <h2>Next steps</h2>
          <ul>
            <li>
              <mat-icon>directions_car</mat-icon>
              <span>Add vehicles to your fleet</span>
            </li>
            <li>
              <mat-icon>smartphone</mat-icon>
              <span>Install the mobile app on your devices</span>
            </li>
            <li>
              <mat-icon>analytics</mat-icon>
              <span>Monitor vehicle vitals in real-time</span>
            </li>
          </ul>
        </div>

        <button
          mat-raised-button
          color="primary"
          class="dashboard-btn"
          (click)="goToDashboard()"
        >
          Go to Dashboard
        </button>
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
      text-align: center;
    }
    .success-icon {
      margin-bottom: 24px;
    }
    .success-icon mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #22c55e;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      color: #e5e7eb;
      margin: 0 0 12px;
    }
    .text-secondary {
      margin: 0 0 32px;
      line-height: 1.6;
      color: #9ca3af;
    }
    .next-steps {
      text-align: left;
      margin-bottom: 32px;
      padding: 24px;
      background: #0f0f1a;
      border-radius: 12px;
    }
    .next-steps h2 {
      font-size: 16px;
      font-weight: 600;
      color: #e5e7eb;
      margin: 0 0 16px;
    }
    .next-steps ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .next-steps li {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      color: #9ca3af;
      font-size: 14px;
    }
    .next-steps li mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #3b82f6;
    }
    .dashboard-btn {
      width: 100%;
      height: 48px;
      font-size: 16px;
      font-weight: 600;
    }
  `]
})
export class OnboardingCompleteComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  async goToDashboard(): Promise<void> {
    await this.authService.completeOnboarding();
    this.router.navigate(['/dashboard']);
  }
}
