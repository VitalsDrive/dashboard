import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';

export type GaugeSize = 'small' | 'medium' | 'large';

interface GaugeDimensions {
  width: number;
  height: number;
  cx: number;
  cy: number;
  r: number;
  strokeWidth: number;
  fontSize: number;
}

const DIMENSIONS: Record<GaugeSize, GaugeDimensions> = {
  small:  { width: 120, height: 90,  cx: 60,  cy: 70,  r: 52,  strokeWidth: 10, fontSize: 18 },
  medium: { width: 160, height: 120, cx: 80,  cy: 95,  r: 70,  strokeWidth: 12, fontSize: 22 },
  large:  { width: 200, height: 150, cx: 100, cy: 120, r: 88,  strokeWidth: 14, fontSize: 28 },
};

const MIN_TEMP = 0;
const MAX_TEMP = 130;
const START_ANGLE = -200;  // degrees from top (SVG)
const SWEEP_ANGLE = 220;   // total arc sweep

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = toRad(angleDeg - 90);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end   = polarToCartesian(cx, cy, r, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}

@Component({
  selector: 'app-health-gauge',
  templateUrl: './health-gauge.component.html',
  styleUrl: './health-gauge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
})
export class HealthGaugeComponent {
  /** Current temperature in °C */
  readonly value = input<number>(0);
  /** Display size */
  readonly size = input<GaugeSize>('medium');
  /** Show label below gauge */
  readonly showLabel = input(true);

  readonly dim = computed(() => DIMENSIONS[this.size()]);

  readonly clampedValue = computed(() =>
    Math.max(MIN_TEMP, Math.min(MAX_TEMP, this.value())),
  );

  readonly state = computed<'normal' | 'warning' | 'critical'>(() => {
    const v = this.clampedValue();
    if (v > 105) return 'critical';
    if (v > 100) return 'warning';
    return 'normal';
  });

  readonly gaugeColor = computed(() => {
    switch (this.state()) {
      case 'critical': return 'var(--color-critical)';
      case 'warning':  return 'var(--color-warning)';
      default:         return 'var(--color-healthy)';
    }
  });

  /** Background arc (full sweep) */
  readonly bgPath = computed(() => {
    const d = this.dim();
    return arcPath(d.cx, d.cy, d.r, START_ANGLE, START_ANGLE + SWEEP_ANGLE);
  });

  /** Filled arc (proportional to value) */
  readonly valuePath = computed(() => {
    const d = this.dim();
    const pct = (this.clampedValue() - MIN_TEMP) / (MAX_TEMP - MIN_TEMP);
    const endAngle = START_ANGLE + pct * SWEEP_ANGLE;
    if (pct <= 0) return '';
    return arcPath(d.cx, d.cy, d.r, START_ANGLE, endAngle);
  });

  /** Needle tip position */
  readonly needleTip = computed(() => {
    const d = this.dim();
    const pct = (this.clampedValue() - MIN_TEMP) / (MAX_TEMP - MIN_TEMP);
    const angle = START_ANGLE + pct * SWEEP_ANGLE;
    return polarToCartesian(d.cx, d.cy, d.r - d.strokeWidth / 2, angle);
  });

  /** Needle base position */
  readonly needleBase = computed(() => {
    const d = this.dim();
    return { x: d.cx, y: d.cy };
  });

  readonly isCritical = computed(() => this.state() === 'critical');
}
