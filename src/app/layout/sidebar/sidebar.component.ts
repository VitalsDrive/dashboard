import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { AlertService } from '../../core/services/alert.service';
import { VehicleService } from '../../core/services/vehicle.service';
import { AuthService } from '../../core/services/auth.service';
import { OrganizationService } from '../../core/services/organization.service';

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
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatBadgeModule, MatMenuModule, MatButtonModule],
})
export class SidebarComponent {
  private readonly alertService = inject(AlertService);
  private readonly vehicleService = inject(VehicleService);
  private readonly auth = inject(AuthService);
  private readonly organizationService = inject(OrganizationService);
  private readonly router = inject(Router);

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
    {
      label: 'Backoffice',
      icon: 'settings',
      route: '/backoffice',
    },
  ];

  readonly vehicleCount = this.vehicleService.onlineVehicleCount;
  readonly alertVehicleCount = this.vehicleService.alertVehicleCount;

  readonly currentUser = this.auth.currentUser;
  readonly selectedOrganization = this.organizationService.selectedOrganization;

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  async onLogout(): Promise<void> {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }

  onNavClick(): void {
    this.navItemClicked.emit();
  }
}
