import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TelemetryRecord } from '../../../core/models/telemetry.model';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-battery-status',
  templateUrl: './battery-status.component.html',
  styleUrl: './battery-status.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
})
export class BatteryStatusComponent implements OnDestroy {
  private readonly alertService = inject(AlertService);

  readonly vehicleId = input.required<string>();
  readonly history = input<TelemetryRecord[]>([]);
  readonly showPrediction = input(true);

  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('voltageCanvas');

  private animFrameId = 0;

  // === Computed state ===

  readonly latestVoltage = computed(() => {
    const h = this.history();
    return h.length > 0 ? h[0].voltage : null;
  });

  readonly voltageState = computed<'normal' | 'warning' | 'critical'>(() => {
    const v = this.latestVoltage();
    if (v === null) return 'normal';
    if (v < 12.0) return 'critical';
    if (v < 12.4) return 'warning';
    return 'normal';
  });

  readonly voltageColor = computed(() => {
    switch (this.voltageState()) {
      case 'critical': return 'var(--color-critical)';
      case 'warning':  return 'var(--color-warning)';
      default:         return 'var(--color-healthy)';
    }
  });

  readonly hasPredictiveAlert = computed(() =>
    this.alertService.batteryAlerts().some(
      (a) =>
        a.vehicleId === this.vehicleId() &&
        a.metadata?.['predicted'] !== undefined,
    ),
  );

  readonly predictiveMessage = computed(() => {
    const alert = this.alertService.batteryAlerts().find(
      (a) => a.vehicleId === this.vehicleId() && a.metadata?.['predicted'] !== undefined,
    );
    return alert?.message ?? null;
  });

  readonly voltageHistory30 = computed(() => {
    const h = this.history();
    return h.slice(0, 30).map((r) => r.voltage).reverse();
  });

  constructor() {
    // Redraw canvas whenever history changes
    effect(() => {
      const data = this.voltageHistory30();
      const canvas = this.canvasRef();
      if (canvas) {
        this.drawChart(canvas.nativeElement, data);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  private drawChart(canvas: HTMLCanvasElement, data: number[]): void {
    const ctx = canvas.getContext('2d');
    if (!ctx || data.length < 2) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const minV = 11.0;
    const maxV = 15.0;
    const range = maxV - minV;

    const xStep = w / (data.length - 1);

    const toY = (v: number) => h - ((v - minV) / range) * h;

    // Build path
    const points: { x: number; y: number }[] = data.map((v, i) => ({
      x: i * xStep,
      y: toY(v),
    }));

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    const color = this.voltageColor();
    grad.addColorStop(0, color.replace(')', ', 0.3)').replace('var(', 'rgba(').replace(/--color-\w+/, this.resolveColor(color)));
    grad.addColorStop(1, 'rgba(59,130,246,0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineTo(points[points.length - 1].x, h);
    ctx.lineTo(points[0].x, h);
    ctx.closePath();
    ctx.fillStyle = 'rgba(59,130,246,0.12)';
    ctx.fill();

    // Line stroke
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = this.resolveColor(color);
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Warning threshold line at 12.4V
    const warningY = toY(12.4);
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(0, warningY);
    ctx.lineTo(w, warningY);
    ctx.strokeStyle = 'rgba(245,158,11,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private resolveColor(cssVar: string): string {
    // Map CSS variables to actual hex for canvas
    const map: Record<string, string> = {
      'var(--color-critical)': '#ef4444',
      'var(--color-warning)':  '#f59e0b',
      'var(--color-healthy)':  '#22c55e',
      'var(--color-info)':     '#3b82f6',
    };
    return map[cssVar] ?? '#3b82f6';
  }
}
