import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type StatusState = 'healthy' | 'warning' | 'critical' | 'offline';

const STATE_COLORS: Record<StatusState, string> = {
  healthy: 'var(--vd-healthy)',
  warning: 'var(--vd-warning)',
  critical: 'var(--vd-critical)',
  offline: 'var(--vd-offline)',
};

@Component({
  selector: 'vd-status-dot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="vd-status-dot"
      [class.vd-status-dot--pulse]="pulse()"
      [style.background]="color()"
      role="img"
      [attr.aria-label]="state() + ' status'"
    ></span>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; }
    .vd-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }
    .vd-status-dot--pulse {
      animation: vd-pulse 1.5s ease-in-out infinite;
    }
  `],
})
export class VdStatusDotComponent {
  readonly state = input<StatusState>('healthy');
  readonly pulse = input(false);

  readonly color = computed(() => STATE_COLORS[this.state()]);
}
