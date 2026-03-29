import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { AlertService } from '../../../core/services/alert.service';
import { Alert, ALERT_AUTO_DISMISS } from '../../../core/models/alert.model';

const MAX_VISIBLE_TOASTS = 3;

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
})
export class ToastComponent implements OnDestroy {
  private readonly alertService = inject(AlertService);
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  /** Show newest critical first, then warnings, capped at MAX_VISIBLE */
  readonly visibleToasts = computed(() => {
    const active = this.alertService.activeAlerts();
    const sorted = [...active].sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
    });
    return sorted.slice(0, MAX_VISIBLE_TOASTS);
  });

  readonly hiddenCount = computed(() => {
    const total = this.alertService.activeAlertCount();
    return Math.max(0, total - MAX_VISIBLE_TOASTS);
  });

  dismiss(alertId: string): void {
    this.clearTimer(alertId);
    this.alertService.dismissAlert(alertId);
  }

  onToastEnter(alert: Alert): void {
    const duration = ALERT_AUTO_DISMISS[alert.severity];
    if (duration > 0) {
      this.clearTimer(alert.id);
      const timer = setTimeout(() => this.dismiss(alert.id), duration);
      this.timers.set(alert.id, timer);
    }
  }

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'warning':  return '⚠️';
      default:         return 'ℹ️';
    }
  }

  private clearTimer(id: string): void {
    const t = this.timers.get(id);
    if (t) {
      clearTimeout(t);
      this.timers.delete(id);
    }
  }

  ngOnDestroy(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
  }
}
