import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';
import { VehicleWithHealth, getVehicleDisplayName } from '../../../core/models/vehicle.model';

@Component({
  selector: 'app-vehicle-info',
  templateUrl: './vehicle-info.component.html',
  styleUrl: './vehicle-info.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleInfoComponent {
  readonly vehicle = input.required<VehicleWithHealth>();
  readonly displayName = getVehicleDisplayName;
  readonly showBadge = input(false);
}
