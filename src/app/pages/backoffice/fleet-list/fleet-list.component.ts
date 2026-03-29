import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FleetService } from '../../../core/services/fleet.service';
import { Fleet } from '../../../core/models/fleet.model';

@Component({
  selector: 'app-fleet-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="fleet-list">
      <header class="page-header">
        <h1>Fleets</h1>
        <button class="btn-primary" (click)="showCreateModal = true">
          + New Fleet
        </button>
      </header>

      @if (fleetService.isLoading()) {
        <div class="loading">Loading fleets...</div>
      } @else if (fleetService.error()) {
        <div class="error">{{ fleetService.error() }}</div>
      } @else if (fleetService.fleets().length === 0) {
        <div class="empty-state">
          <p>No fleets found. Create your first fleet to get started.</p>
        </div>
      } @else {
        <div class="fleet-grid">
          @for (fleet of fleetService.fleets(); track fleet.id) {
            <div class="fleet-card" [routerLink]="['/backoffice/fleets', fleet.id]">
              <div class="fleet-header">
                <h3>{{ fleet.name }}</h3>
                <span class="badge">Active</span>
              </div>
              <div class="fleet-info">
                <div class="info-row">
                  <span class="label">Fleet Code:</span>
                  <code>{{ fleet.provisioning_code }}</code>
                </div>
                <div class="info-row">
                  <span class="label">Created:</span>
                  <span>{{ fleet.created_at | date:'short' }}</span>
                </div>
              </div>
              <div class="fleet-actions">
                <button class="btn-secondary" (click)="copyCode(fleet.provisioning_code, $event)">
                  Copy Code
                </button>
                <button class="btn-secondary" (click)="regenerateCode(fleet.id, $event)">
                  Regenerate
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    @if (showCreateModal) {
      <div class="modal-overlay" (click)="showCreateModal = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>Create New Fleet</h2>
          <form (ngSubmit)="createFleet()">
            <div class="form-group">
              <label for="fleetName">Fleet Name</label>
              <input
                type="text"
                id="fleetName"
                [(ngModel)]="newFleetName"
                name="fleetName"
                placeholder="My Fleet"
                required
              />
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="showCreateModal = false">
                Cancel
              </button>
              <button type="submit" class="btn-primary" [disabled]="!newFleetName.trim()">
                Create Fleet
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .fleet-list {
      padding: 24px;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .page-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .btn-primary {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: #2d2d44;
      color: #e5e7eb;
      border: 1px solid #3d3d5c;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
    }
    .fleet-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }
    .fleet-card {
      background: #1a1a2e;
      border: 1px solid #2d2d44;
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .fleet-card:hover {
      border-color: #3b82f6;
    }
    .fleet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .fleet-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    .badge {
      background: #22c55e;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .fleet-info {
      margin-bottom: 16px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .label {
      color: #9ca3af;
    }
    code {
      background: #2d2d44;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
    .fleet-actions {
      display: flex;
      gap: 8px;
    }
    .fleet-actions button {
      flex: 1;
    }
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal {
      background: #1a1a2e;
      border: 1px solid #2d2d44;
      border-radius: 16px;
      padding: 24px;
      width: 100%;
      max-width: 400px;
    }
    .modal h2 {
      margin: 0 0 20px;
      font-size: 20px;
    }
    .form-group {
      margin-bottom: 16px;
    }
    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-size: 14px;
      color: #9ca3af;
    }
    .form-group input {
      width: 100%;
      padding: 10px 12px;
      background: #0f0f1a;
      border: 1px solid #3d3d5c;
      border-radius: 8px;
      color: #e5e7eb;
      font-size: 14px;
      box-sizing: border-box;
    }
    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    .loading, .empty-state {
      text-align: center;
      padding: 48px;
      color: #9ca3af;
    }
    .error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid #ef4444;
      color: #ef4444;
      padding: 12px;
      border-radius: 8px;
    }
  `]
})
export class FleetListComponent implements OnInit {
  readonly fleetService = inject(FleetService);
  
  showCreateModal = false;
  newFleetName = '';

  ngOnInit(): void {
    this.fleetService.loadFleets();
  }

  async createFleet(): Promise<void> {
    if (!this.newFleetName.trim()) return;
    
    await this.fleetService.createFleet(this.newFleetName.trim(), '');
    this.newFleetName = '';
    this.showCreateModal = false;
  }

  async regenerateCode(fleetId: string, event: Event): Promise<void> {
    event.stopPropagation();
    await this.fleetService.regenerateCode(fleetId);
  }

  copyCode(code: string, event: Event): void {
    event.stopPropagation();
    navigator.clipboard.writeText(code);
  }
}
