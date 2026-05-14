import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

@Component({
  selector: 'vd-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <button
      [class]="btnClasses()"
      [disabled]="disabled() ? true : null"
      (click)="clicked.emit($event)"
    >
      @if (icon()) {
        <mat-icon class="vd-btn__icon">{{ icon() }}</mat-icon>
      }
      <ng-content />
    </button>
  `,
  styles: [`
    :host { display: inline-flex; }
    .vd-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--vd-space-2);
      padding: 10px 18px;
      border-radius: var(--vd-radius-md);
      font-family: var(--vd-font-sans);
      font-size: var(--vd-text-base);
      font-weight: 600;
      border: 1px solid transparent;
      cursor: pointer;
      transition:
        background var(--vd-dur-fast) var(--vd-ease-out),
        color var(--vd-dur-fast) var(--vd-ease-out),
        box-shadow var(--vd-dur-fast);
      line-height: 1;
      white-space: nowrap;
      width: 100%;
    }
    .vd-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* ── Variants ── */
    .vd-btn--primary {
      background: var(--vd-brand);
      color: var(--vd-fg-inverse);
    }
    .vd-btn--primary:hover:not(:disabled) {
      background: var(--vd-brand-hover);
    }
    .vd-btn--primary:active:not(:disabled) {
      background: var(--vd-brand-active);
    }
    .vd-btn--primary:focus-visible {
      box-shadow: var(--vd-glow-amber);
      outline: none;
    }

    .vd-btn--secondary {
      background: transparent;
      color: var(--vd-fg-1);
      border-color: var(--vd-border-strong);
    }
    .vd-btn--secondary:hover:not(:disabled) {
      background: var(--vd-bg-elevated);
    }

    .vd-btn--ghost {
      background: transparent;
      color: var(--vd-fg-2);
    }
    .vd-btn--ghost:hover:not(:disabled) {
      background: var(--vd-bg-elevated);
      color: var(--vd-fg-1);
    }

    .vd-btn--destructive {
      background: var(--vd-critical-bg);
      color: var(--vd-critical);
      border-color: rgba(239, 68, 68, 0.4);
    }
    .vd-btn--destructive:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.22);
    }
    .vd-btn--destructive:focus-visible {
      box-shadow: var(--vd-glow-critical);
      outline: none;
    }

    /* ── Icon sizing ── */
    .vd-btn__icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      line-height: 16px !important;
      flex-shrink: 0;
    }
  `],
})
export class VdButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly disabled = input(false);
  readonly icon = input<string | null>(null);
  readonly clicked = output<MouseEvent>();

  readonly btnClasses = computed(() => `vd-btn vd-btn--${this.variant()}`);
}
