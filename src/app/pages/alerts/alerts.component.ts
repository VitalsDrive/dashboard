import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { AlertService } from '../../core/services/alert.service';
import { Alert, AlertType } from '../../core/models/alert.model';

type FilterType = 'all' | AlertType;

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
  ],
})
export class AlertsComponent {
  private readonly alertService = inject(AlertService);

  readonly filterType = signal<FilterType>('all');

  readonly activeAlerts = this.alertService.activeAlerts;

  readonly filteredAlerts = computed(() => {
    const filter = this.filterType();
    const alerts = this.activeAlerts();
    if (filter === 'all') return alerts;
    return alerts.filter((a) => a.type === filter);
  });

  readonly hasAlerts = computed(() => this.activeAlerts().length > 0);

  readonly filterOptions: { label: string; value: FilterType; count: () => number }[] = [
    { label: 'All', value: 'all', count: this.alertService.activeAlertCount },
    { label: 'DTC', value: 'dtc', count: computed(() => this.alertService.dtcAlerts().length) },
    { label: 'Battery', value: 'battery', count: computed(() => this.alertService.batteryAlerts().length) },
    { label: 'Coolant', value: 'coolant', count: computed(() => this.alertService.coolantAlerts().length) },
  ];

  setFilter(type: FilterType): void {
    this.filterType.set(type);
  }

  dismiss(alert: Alert): void {
    this.alertService.dismissAlert(alert.id);
  }

  clearAll(): void {
    this.alertService.clearAllAlerts();
  }

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'warning':  return 'warning';
      default:         return 'info';
    }
  }
}
