import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
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
import { VehicleService } from '../../core/services/vehicle.service';

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
  ],
})
export class ShellComponent implements OnInit {
  private readonly vehicleService = inject(VehicleService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly isMobile = signal(false);
  readonly sidenavOpen = signal(true);

  constructor() {
    this.breakpointObserver
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(takeUntilDestroyed())
      .subscribe((state) => {
        const mobile = state.matches;
        this.isMobile.set(mobile);
        this.sidenavOpen.set(!mobile);
      });
  }

  ngOnInit(): void {
    this.vehicleService.loadVehicles().then(() => {
      this.vehicleService.loadInitialTelemetry();
    });
  }

  toggleSidenav(): void {
    this.sidenavOpen.update((open) => !open);
  }
}
