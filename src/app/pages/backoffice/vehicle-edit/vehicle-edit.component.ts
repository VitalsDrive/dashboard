import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vehicle-edit',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="vehicle-edit">
      <h1>Edit Vehicle</h1>
      <p>Vehicle edit form coming soon...</p>
    </div>
  `,
  styles: [`
    .vehicle-edit { padding: 24px; }
    h1 { margin: 0 0 16px; font-size: 24px; }
    p { color: #9ca3af; }
  `]
})
export class VehicleEditComponent {}
