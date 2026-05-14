import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-pending',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="pending-page" role="main">
      <div class="pending-card">
        <div class="pending-icon">
          <mat-icon>hourglass_empty</mat-icon>
        </div>
        <h1>Account Pending Activation</h1>
        <p class="pending-text">
          Your account is currently under review. We'll send you an email once
          your organization has been activated.
        </p>
        <p class="pending-email">
          Signed in as <strong>{{ auth.getUserEmail() }}</strong>
        </p>
        <button mat-raised-button color="primary" (click)="signOut()">
          Sign Out
        </button>
      </div>
    </div>
  `,
  styles: [`
    .pending-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
    }
    .pending-card {
      width: 100%;
      max-width: 420px;
      padding: 48px 40px;
      background: #1a1a2e;
      border: 1px solid #2d2d44;
      border-radius: 16px;
      text-align: center;
    }
    .pending-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      border-radius: 50%;
      background: rgba(245, 158, 11, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pending-icon mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #f59e0b;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #e5e7eb;
      margin: 0 0 16px;
    }
    .pending-text {
      color: #9ca3af;
      line-height: 1.6;
      margin: 0 0 24px;
    }
    .pending-email {
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 32px;
    }
    .pending-email strong {
      color: #e5e7eb;
    }
    button {
      width: 100%;
      height: 48px;
      font-size: 16px;
      font-weight: 600;
    }
  `]
})
export class PendingComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}
