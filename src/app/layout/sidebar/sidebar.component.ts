import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { AlertService } from '../../core/services/alert.service';
import { VehicleService } from '../../core/services/vehicle.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badgeSignal?: () => number;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatBadgeModule],
})
export class SidebarComponent {
  private readonly alertService = inject(AlertService);
  private readonly vehicleService = inject(VehicleService);

  readonly navItemClicked = output<void>();

  readonly navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard',
    },
    {
      label: 'Fleet Map',
      icon: 'map',
      route: '/map',
    },
    {
      label: 'Alerts',
      icon: 'notifications',
      route: '/alerts',
      badgeSignal: this.alertService.activeAlertCount,
    },
  ];

  readonly vehicleCount = this.vehicleService.onlineVehicleCount;
  readonly alertVehicleCount = this.vehicleService.alertVehicleCount;

  onNavClick(): void {
    this.navItemClicked.emit();
  }
}
