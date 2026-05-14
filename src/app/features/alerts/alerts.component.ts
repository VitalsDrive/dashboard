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
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AlertService } from '../../core/services/alert.service';
import { SupabaseAlert } from '../../core/models/alert.model';

type AlertFilter = 'all' | 'critical' | 'warning' | 'acknowledged';

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
    MatPaginatorModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
  ],
})
export class AlertsComponent {
  private readonly alertService = inject(AlertService);

  readonly PAGE_SIZE = 25;
  readonly currentPage = signal(0);
  readonly activeFilter = signal<AlertFilter>('all');

  readonly filterChips: { label: string; value: AlertFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Critical', value: 'critical' },
    { label: 'Warning', value: 'warning' },
    { label: 'Acknowledged', value: 'acknowledged' },
  ];

  readonly allAlerts = this.alertService.dbAlerts;
  readonly unacknowledgedCount = this.alertService.unacknowledgedCount;
  readonly alertResource = this.alertService.alertResource;

  readonly filteredAlerts = computed(() => {
    const filter = this.activeFilter();
    const all = this.allAlerts();
    if (filter === 'all') return all;
    if (filter === 'critical') return all.filter((a) => a.severity === 'critical');
    if (filter === 'warning') return all.filter((a) => a.severity === 'warning');
    if (filter === 'acknowledged') return all.filter((a) => a.acknowledged);
    return all;
  });

  readonly totalCount = computed(() => this.filteredAlerts().length);

  readonly pagedAlerts = computed(() => {
    const from = this.currentPage() * this.PAGE_SIZE;
    return this.filteredAlerts().slice(from, from + this.PAGE_SIZE);
  });

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
  }

  setFilter(filter: AlertFilter): void {
    this.activeFilter.set(filter);
    this.currentPage.set(0);
  }

  async acknowledge(alert: SupabaseAlert): Promise<void> {
    await this.alertService.acknowledgeAlert(alert.id);
  }

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'warning':  return 'warning';
      default:         return 'info';
    }
  }
}
