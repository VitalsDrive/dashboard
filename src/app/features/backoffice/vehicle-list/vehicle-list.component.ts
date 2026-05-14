import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Vehicle, VehicleStatus, getVehicleDisplayName } from '../../../core/models/vehicle.model';
import { Fleet } from '../../../core/models/fleet.model';

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="vehicle-list">
      <header class="page-header">
        <h1>Manage Vehicles</h1>
        <div class="filters">
          <select [(ngModel)]="statusFilter" (change)="applyFilters()">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
          </select>
          <select [(ngModel)]="fleetFilter" (change)="applyFilters()">
            <option value="">All Fleets</option>
            @for (fleet of fleets(); track fleet.id) {
              <option [value]="fleet.id">{{ fleet.name }}</option>
            }
          </select>
        </div>
      </header>

      @if (loading()) {
        <div class="loading">Loading vehicles...</div>
      } @else if (vehicles().length === 0) {
        <div class="empty-state">
          <p>No vehicles found.</p>
        </div>
      } @else {
        <table class="data-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>VIN</th>
              <th>Fleet</th>
              <th>Status</th>
              <th>Last Seen</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (vehicle of filteredVehicles(); track vehicle.id) {
              <tr>
                <td>
                  <div class="vehicle-cell">
                    <span class="vehicle-name">{{ getVehicleName(vehicle) }}</span>
                    <span class="vehicle-meta">{{ vehicle.license_plate || 'No plate' }}</span>
                  </div>
                </td>
                <td><code>{{ vehicle.vin }}</code></td>
                <td>{{ getFleetName(vehicle.fleet_id) }}</td>
                <td>
                  <span class="status-badge" [class]="vehicle.status">
                    {{ vehicle.status }}
                  </span>
                </td>
                <td>{{ vehicle.last_seen ? (vehicle.last_seen | date:'short') : 'Never' }}</td>
                <td>
                  <div class="action-buttons">
                    @if (vehicle.status === 'pending') {
                      <button class="btn-approve" (click)="approveVehicle(vehicle)">Approve</button>
                    }
                    <button class="btn-secondary" [routerLink]="['/backoffice/vehicles', vehicle.id]">Edit</button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [`
    .vehicle-list { padding: 24px; }
    .page-header { 
      display: flex; justify-content: space-between; align-items: center; 
      margin-bottom: 24px; flex-wrap: wrap; gap: 16px;
    }
    .page-header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .filters { display: flex; gap: 12px; }
    .filters select {
      padding: 8px 12px; background: #1a1a2e; border: 1px solid #3d3d5c;
      border-radius: 6px; color: #e5e7eb; font-size: 14px; cursor: pointer;
    }
    .data-table { width: 100%; border-collapse: collapse; background: #1a1a2e; border-radius: 12px; overflow: hidden; }
    .data-table th, .data-table td { text-align: left; padding: 14px 16px; border-bottom: 1px solid #2d2d44; }
    .data-table th { font-size: 12px; text-transform: uppercase; color: #9ca3af; font-weight: 500; background: #0f0f1a; }
    .data-table tbody tr:last-child td { border-bottom: none; }
    .data-table tbody tr:hover { background: #2d2d44; }
    .vehicle-cell { display: flex; flex-direction: column; gap: 4px; }
    .vehicle-name { font-weight: 500; }
    .vehicle-meta { font-size: 12px; color: #9ca3af; }
    code { background: #0f0f1a; padding: 4px 8px; border-radius: 4px; font-size: 13px; }
    .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; text-transform: capitalize; }
    .status-badge.pending { background: #f59e0b; color: #000; }
    .status-badge.active { background: #22c55e; color: #fff; }
    .status-badge.inactive { background: #6b7280; color: #fff; }
    .status-badge.maintenance { background: #8b5cf6; color: #fff; }
    .action-buttons { display: flex; gap: 8px; }
    .btn-approve { background: #22c55e; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .btn-secondary { background: #2d2d44; color: #e5e7eb; border: 1px solid #3d3d5c; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .btn-secondary:hover { background: #3d3d5c; }
    .loading, .empty-state { text-align: center; padding: 48px; color: #9ca3af; }
  `]
})
export class VehicleListComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);

  vehicles = signal<Vehicle[]>([]);
  filteredVehicles = signal<Vehicle[]>([]);
  fleets = signal<Fleet[]>([]);
  loading = signal(true);

  statusFilter = '';
  fleetFilter = '';

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadVehicles(), this.loadFleets()]);
    this.loading.set(false);
  }

  private async loadVehicles(): Promise<void> {
    const { data } = await this.supabase.client
      .from('vehicles')
      .select('*')
      .order('make');
    
    this.vehicles.set(data ?? []);
    this.applyFilters();
  }

  private async loadFleets(): Promise<void> {
    const { data } = await this.supabase.client
      .from('fleets')
      .select('*')
      .order('name');
    
    this.fleets.set(data ?? []);
  }

  applyFilters(): void {
    let result = this.vehicles();
    
    if (this.statusFilter) {
      result = result.filter(v => v.status === this.statusFilter);
    }
    
    if (this.fleetFilter) {
      result = result.filter(v => v.fleet_id === this.fleetFilter);
    }
    
    this.filteredVehicles.set(result);
  }

  getVehicleName(vehicle: Vehicle): string {
    return getVehicleDisplayName(vehicle);
  }

  getFleetName(fleetId: string): string {
    return this.fleets().find(f => f.id === fleetId)?.name ?? 'Unknown';
  }

  async approveVehicle(vehicle: Vehicle): Promise<void> {
    await this.supabase.client.rpc('approve_vehicle', { vehicle_uuid: vehicle.id });
    await this.loadVehicles();
  }
}
