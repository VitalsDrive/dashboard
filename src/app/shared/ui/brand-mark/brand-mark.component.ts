import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'vd-brand-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="vd-brand-mark" [style.font-size.px]="size()" aria-hidden="true">◕</span>`,
  styles: [`
    :host { display: inline-flex; align-items: center; }
    .vd-brand-mark {
      line-height: 1;
      color: var(--vd-brand);
      font-weight: 400;
      display: inline-block;
      user-select: none;
    }
  `],
})
export class VdBrandMarkComponent {
  readonly size = input(24);
}
