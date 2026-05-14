import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeState = 'healthy' | 'warning' | 'critical' | 'info';

const BADGE_PALETTE: Record<BadgeState, [bg: string, fg: string]> = {
  healthy:  ['rgba(132,204,22,0.12)', 'var(--vd-healthy)'],
  warning:  ['rgba(234,179,8,0.12)',  'var(--vd-warning)'],
  critical: ['rgba(239,68,68,0.14)',  'var(--vd-critical)'],
  info:     ['rgba(245,158,11,0.10)', 'var(--vd-brand)'],
};

@Component({
  selector: 'vd-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="vd-badge" [style.background]="bg()" [style.color]="fg()">
      <ng-content />
    </span>
  `,
  styles: [`
    :host { display: inline-flex; }
    .vd-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: var(--vd-radius-full);
      font-size: var(--vd-text-xs);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-family: var(--vd-font-sans);
      line-height: 1.5;
      white-space: nowrap;
    }
  `],
})
export class VdBadgeComponent {
  readonly state = input<BadgeState>('info');

  readonly bg = computed(() => BADGE_PALETTE[this.state()][0]);
  readonly fg = computed(() => BADGE_PALETTE[this.state()][1]);
}
