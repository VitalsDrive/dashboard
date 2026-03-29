import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-dtc-indicator',
  templateUrl: './dtc-indicator.component.html',
  styleUrl: './dtc-indicator.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTooltipModule],
})
export class DtcIndicatorComponent {
  readonly dtcCodes = input<string[]>([]);

  readonly hasDtc = computed(() => this.dtcCodes().length > 0);
  readonly count = computed(() => this.dtcCodes().length);
  readonly tooltipText = computed(() => {
    const codes = this.dtcCodes();
    if (codes.length === 0) return 'No fault codes';
    return codes.join(', ');
  });
}
