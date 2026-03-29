import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  template: `
    <div
      class="spinner-wrapper"
      [class.spinner-wrapper--fullpage]="fullPage()"
      role="status"
      aria-label="Loading..."
    >
      <div class="spinner" aria-hidden="true"></div>
      @if (message()) {
        <p class="spinner-message text-secondary text-sm">{{ message() }}</p>
      }
    </div>
  `,
  styles: [`
    .spinner-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-4);
      padding: var(--space-12);
    }

    .spinner-wrapper--fullpage {
      min-height: 60vh;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-brand);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner-message {
      text-align: center;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSpinnerComponent {
  readonly message = input('Loading...');
  readonly fullPage = input(false);
}
