import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AlertBannerComponent } from '../../shared/components/alert-banner/alert-banner.component';
import { ToastComponent } from '../../shared/components/toast/toast.component';
import { OrganizationService } from '../../core/services/organization.service';
import { FleetService } from '../../core/services/fleet.service';
import { TelemetryService } from '../../core/services/telemetry.service';
import { AlertService } from '../../core/services/alert.service';
import { VdConnectionPillComponent } from '../../shared/ui/connection-pill/connection-pill.component';

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    MatSidenavModule,
    HeaderComponent,
    SidebarComponent,
    AlertBannerComponent,
    ToastComponent,
    VdConnectionPillComponent,
  ],
})
export class ShellComponent {
  private readonly organizationService = inject(OrganizationService);
  private readonly fleetService = inject(FleetService);
  private readonly telemetryService = inject(TelemetryService);
  private readonly alertService = inject(AlertService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly isMobile = signal(false);
  readonly sidenavOpen = signal(true);
  readonly connectionStatus = this.telemetryService.connectionStatus;

  private previousConnectionStatus: string | null = null;

  constructor() {
    this.breakpointObserver
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(takeUntilDestroyed())
      .subscribe((state) => {
        const mobile = state.matches;
        this.isMobile.set(mobile);
        this.sidenavOpen.set(!mobile);
      });

    // Load orgs and fleets to seed the signals that vehicleResource.params() reads.
    // resource() in VehicleService auto-reacts to selectedOrganization changes.
    this.organizationService.loadOrganizations().then(() => {
      this.fleetService.loadFleets();
    });

    // Toast on connection status transitions (D-20)
    // Note: reconnect toast auto-dismisses at 8000ms (ALERT_AUTO_DISMISS.info),
    // not 3000ms as UI-SPEC specifies — ALERT_AUTO_DISMISS.info is the closest available.
    effect(() => {
      const status = this.telemetryService.connectionStatus();
      if (this.previousConnectionStatus !== null && this.previousConnectionStatus !== status) {
        if (status === 'disconnected') {
          this.alertService.pushAlert('Connection lost — reconnecting…', 'warning');
        } else if (status === 'connected' && this.previousConnectionStatus === 'disconnected') {
          this.alertService.pushAlert('Live data restored.', 'info');
        }
      }
      this.previousConnectionStatus = status;
    });
  }

  toggleSidenav(): void {
    this.sidenavOpen.update((open) => !open);
  }
}
