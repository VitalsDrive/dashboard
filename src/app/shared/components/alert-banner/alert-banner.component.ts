import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-alert-banner',
  templateUrl: './alert-banner.component.html',
  styleUrl: './alert-banner.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, MatButtonModule],
})
export class AlertBannerComponent {
  private readonly alertService = inject(AlertService);

  readonly isExpanded = signal(false);

  readonly activeAlerts = this.alertService.activeAlerts;
  readonly activeAlertCount = this.alertService.activeAlertCount;
  readonly criticalAlertCount = this.alertService.criticalAlertCount;

  /** The highest-priority alert shown in collapsed state */
  readonly topAlert = computed(() => {
    const alerts = this.activeAlerts();
    if (alerts.length === 0) return null;
    return (
      alerts.find((a) => a.severity === 'critical') ??
      alerts.find((a) => a.severity === 'warning') ??
      alerts[0]
    );
  });

  readonly hasCritical = computed(() => this.criticalAlertCount() > 0);

  toggleExpand(): void {
    this.isExpanded.update((v) => !v);
  }

  dismiss(alertId: string, event: Event): void {
    event.stopPropagation();
    this.alertService.dismissAlert(alertId);
  }
}
