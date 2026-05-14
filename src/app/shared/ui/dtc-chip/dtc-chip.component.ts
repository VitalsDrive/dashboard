import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type DtcSeverity = 'info' | 'warning' | 'critical';

const DTC_PALETTE: Record<DtcSeverity, [bg: string, fg: string, border: string]> = {
  info:     ['var(--vd-bg-elevated)', 'var(--vd-fg-2)',     'var(--vd-border)'],
  warning:  ['rgba(234,179,8,0.12)', 'var(--vd-warning)', 'transparent'],
  critical: ['rgba(239,68,68,0.14)', 'var(--vd-critical)', 'transparent'],
};

@Component({
  selector: 'vd-dtc-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="vd-dtc-chip"
      [style.background]="bg()"
      [style.color]="fg()"
      [style.border-color]="border()"
    >{{ code() }}</span>
  `,
  styles: [`
    :host { display: inline-flex; }
    .vd-dtc-chip {
      display: inline-block;
      padding: 3px 8px;
      border-radius: var(--vd-radius-sm);
      border: 1px solid transparent;
      font-family: var(--vd-font-mono);
      font-size: var(--vd-text-sm);
      font-weight: 600;
      line-height: 1.5;
      letter-spacing: 0;
      font-variant-numeric: tabular-nums;
    }
  `],
})
export class VdDtcChipComponent {
  readonly code = input.required<string>();
  readonly severity = input<DtcSeverity>('info');

  readonly bg     = computed(() => DTC_PALETTE[this.severity()][0]);
  readonly fg     = computed(() => DTC_PALETTE[this.severity()][1]);
  readonly border = computed(() => DTC_PALETTE[this.severity()][2]);
}
