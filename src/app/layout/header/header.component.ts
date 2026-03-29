import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AlertService } from '../../core/services/alert.service';
import { TelemetryService } from '../../core/services/telemetry.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatTooltipModule,
  ],
})
export class HeaderComponent {
  private readonly alertService = inject(AlertService);
  readonly telemetryService = inject(TelemetryService);

  // Signal inputs
  readonly isMobile = input(false);
  readonly sidenavOpen = input(false);

  // Signal outputs
  readonly menuToggled = output<void>();

  readonly criticalAlertCount = this.alertService.criticalAlertCount;
  readonly activeAlertCount = this.alertService.activeAlertCount;
  readonly connectionStatus = this.telemetryService.connectionStatus;

  onMenuToggle(): void {
    this.menuToggled.emit();
  }
}
