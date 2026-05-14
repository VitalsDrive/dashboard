import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';

interface PillPalette { bg: string; fg: string; border: string; pulse: boolean; }

const PILL_PALETTE: Record<ConnectionState, PillPalette> = {
  connected:    { bg: 'var(--vd-healthy-bg)',  fg: 'var(--vd-healthy)',  border: 'rgba(132,204,22,0.25)', pulse: true  },
  reconnecting: { bg: 'var(--vd-warning-bg)',  fg: 'var(--vd-warning)',  border: 'rgba(234,179,8,0.25)',  pulse: true  },
  disconnected: { bg: 'var(--vd-critical-bg)', fg: 'var(--vd-critical)', border: 'rgba(239,68,68,0.25)',  pulse: false },
};

@Component({
  selector: 'vd-connection-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="vd-connection-pill"
      [style.background]="palette().bg"
      [style.border-color]="palette().border"
      [style.color]="palette().fg"
    >
      <span
        class="vd-connection-pill__dot"
        [class.vd-connection-pill__dot--pulse]="palette().pulse"
        [style.background]="palette().fg"
      ></span>
      <span class="vd-connection-pill__label">{{ label() ?? state() }}</span>
    </div>
  `,
  styles: [`
    :host { display: inline-flex; }
    .vd-connection-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border: 1px solid transparent;
      border-radius: var(--vd-radius-full);
      font-size: var(--vd-text-sm);
      font-weight: 500;
      font-family: var(--vd-font-sans);
      white-space: nowrap;
    }
    .vd-connection-pill__dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .vd-connection-pill__dot--pulse {
      animation: vd-pulse 1.5s ease-in-out infinite;
    }
    .vd-connection-pill__label {
      text-transform: capitalize;
    }
  `],
})
export class VdConnectionPillComponent {
  readonly state = input<ConnectionState>('connected');
  readonly label = input<string | null>(null);

  readonly palette = computed(() => PILL_PALETTE[this.state()]);
}
