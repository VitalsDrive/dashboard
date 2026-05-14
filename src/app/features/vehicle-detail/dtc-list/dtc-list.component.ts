import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DtcTranslationService } from '../../../core/services/dtc-translation.service';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-dtc-list',
  templateUrl: './dtc-list.component.html',
  styleUrl: './dtc-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
})
export class DtcListComponent {
  private readonly dtcService = inject(DtcTranslationService);
  private readonly alertService = inject(AlertService);

  readonly vehicleId = input.required<string>();
  readonly dtcCodes = input<string[]>([]);

  readonly entries = computed(() =>
    this.dtcCodes().map((code) => ({
      code,
      entry: this.dtcService.translate(code),
      color: this.dtcService.getSeverityColor(this.dtcService.translate(code).severity),
    })),
  );

  readonly hasDtcs = computed(() => this.dtcCodes().length > 0);

  dismissCode(code: string): void {
    // Dismiss all alerts for this vehicle matching this DTC code
    const alert = this.alertService.alerts().find(
      (a) => a.vehicleId === this.vehicleId() && a.code === code,
    );
    if (alert) {
      this.alertService.dismissAlert(alert.id);
    }
  }
}
