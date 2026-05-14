import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-onboarding-layout',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="onboarding-page" role="main">
      <div class="onboarding-card">
        <div class="onboarding-header">
          @if (stepLabel()) {
            <span class="step-badge">{{ stepLabel() }}</span>
          }
          <h1>{{ title() }}</h1>
          @if (subtitle()) {
            <p>{{ subtitle() }}</p>
          }
        </div>

        @if (error()) {
          <div class="error-banner" role="alert">
            <mat-icon>error_outline</mat-icon>
            <span>{{ error() }}</span>
          </div>
        }

        <ng-content />
      </div>
    </div>
  `,
  styles: [`
    .onboarding-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--vd-space-6);
      background: linear-gradient(135deg, var(--vd-bg-sidebar) 0%, var(--vd-bg-surface) 100%);
    }
    .onboarding-card {
      width: 100%;
      max-width: 480px;
      padding: var(--vd-space-12) var(--vd-space-10);
      background: var(--vd-bg-surface);
      border: 1px solid var(--vd-border);
      border-radius: var(--vd-radius-lg);
      box-shadow: var(--vd-shadow-modal);
    }
    .onboarding-header {
      margin-bottom: var(--vd-space-8);
    }
    .step-badge {
      display: inline-block;
      padding: var(--vd-space-1) var(--vd-space-3);
      background: var(--vd-brand-muted);
      border-radius: var(--vd-radius-full);
      font-size: var(--vd-text-sm);
      font-weight: 500;
      color: var(--vd-brand);
      margin-bottom: var(--vd-space-4);
    }
    h1 {
      font-family: var(--vd-font-display);
      font-size: var(--vd-text-2xl);
      font-weight: 700;
      color: var(--vd-fg-1);
      margin: 0 0 var(--vd-space-3);
    }
    p {
      margin: 0;
      color: var(--vd-fg-3);
      line-height: var(--vd-leading-base);
    }
    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--vd-space-2);
      padding: var(--vd-space-3) var(--vd-space-4);
      background: var(--vd-critical-bg);
      border: 1px solid var(--vd-critical);
      border-radius: var(--vd-radius-sm);
      color: var(--vd-critical);
      margin-bottom: var(--vd-space-5);
      font-size: var(--vd-text-base);
    }
    .error-banner mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
  `]
})
export class OnboardingLayoutComponent {
  readonly stepLabel = input<string>('');
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly error = input<string | null>(null);
}
