import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Vehicle } from '../../core/models/vehicle.model';

export interface RemoveVehicleDialogData {
  vehicle: Vehicle;
}

@Component({
  selector: 'app-remove-vehicle-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <div class="vd-dialog">
      <h2 mat-dialog-title class="dialog-title">Remove {{ data.vehicle.nickname ?? 'Vehicle' }}?</h2>

      <mat-dialog-content>
        <p class="dialog-body">
          This vehicle will be deactivated and removed from your fleet.
          Historical telemetry data is preserved.
        </p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button class="cancel-btn" (click)="cancel()">Cancel</button>
        <button mat-raised-button class="remove-btn" (click)="confirm()">Remove Vehicle</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .vd-dialog {
      background: var(--vd-bg-elevated, #241a12);
      border-radius: var(--vd-radius-xl, 20px);
      padding: var(--vd-space-6, 24px);
      max-width: 400px;
    }
    .dialog-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: var(--vd-text-xl, 22px);
      font-weight: 600;
      color: var(--vd-fg-1, #f5e6d3);
      margin: 0 0 12px;
    }
    .dialog-body {
      font-size: var(--vd-text-md, 15px);
      color: var(--vd-fg-2, #c4a986);
      line-height: 1.5;
      margin: 0;
    }
    .cancel-btn {
      color: var(--vd-fg-2, #c4a986) !important;
      border-color: var(--vd-border, #3a2a1d) !important;
      border-radius: var(--vd-radius-md, 10px) !important;
    }
    .remove-btn {
      background-color: var(--vd-critical, #ef4444) !important;
      color: #fff !important;
      border-radius: var(--vd-radius-md, 10px) !important;
      font-weight: 600;
    }
  `],
})
export class RemoveVehicleDialogComponent {
  readonly data = inject<RemoveVehicleDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<RemoveVehicleDialogComponent>);

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}
