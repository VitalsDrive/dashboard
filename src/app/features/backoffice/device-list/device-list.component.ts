import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { DeviceService } from '../../../core/services/device.service';
import { FleetService } from '../../../core/services/fleet.service';
import { Device } from '../../../core/models/device.model';
import { Vehicle } from '../../../core/models/vehicle.model';

interface DeviceRow {
  id: string;
  imei: string;
  fleet_id: string;
  fleet_name?: string;
  vehicle_id: string | null;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_vin?: string;
  status: string;
  last_seen: string | null;
  created_at: string;
}

@Component({
  selector: 'app-device-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="device-list">
      <header class="page-header">
        <h1>Devices</h1>
        <div class="header-actions">
          <select [(ngModel)]="fleetFilter" (change)="applyFilters()">
            <option value="">All Fleets</option>
            @for (fleet of fleets(); track fleet.id) {
              <option [value]="fleet.id">{{ fleet.name }}</option>
            }
          </select>
          <select [(ngModel)]="statusFilter" (change)="applyFilters()">
            <option value="">All Statuses</option>
            <option value="unassigned">Unassigned</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button class="btn-primary" (click)="showAddModal = true">+ Add Device</button>
        </div>
      </header>

      @if (loading()) {
        <div class="loading">Loading devices...</div>
      } @else if (filteredDevices().length === 0) {
        <div class="empty-state">
          <p>No devices found.</p>
        </div>
      } @else {
        <table class="data-table">
          <thead>
            <tr>
              <th>IMEI</th>
              <th>Fleet</th>
              <th>Vehicle</th>
              <th>Status</th>
              <th>Last Seen</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (device of filteredDevices(); track device.id) {
              <tr [routerLink]="['/backoffice/devices', device.id]" class="clickable-row">
                <td><code>{{ device.imei }}</code></td>
                <td>{{ device.fleet_name || 'Unknown' }}</td>
                <td>{{ getVehicleName(device) }}</td>
                <td>
                  <span class="status-badge" [class]="device.status">
                    {{ device.status }}
                  </span>
                </td>
                <td>{{ device.last_seen ? (device.last_seen | date:'short') : 'Never' }}</td>
                <td>
                  <div class="action-buttons">
                    @if (device.status === 'unassigned') {
                      <button class="btn-assign" (click)="openAssignModal(device)">Assign</button>
                    }
                    @if (device.status === 'active') {
                      <button class="btn-secondary" (click)="unassignDevice(device)">Unassign</button>
                    }
                    @if (device.status !== 'inactive') {
                      <button class="btn-danger" (click)="deactivateDevice(device)">Deactivate</button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <!-- Add Device Modal -->
    @if (showAddModal) {
      <div class="modal-overlay" (click)="closeAddModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>Add Device</h2>
          <form (ngSubmit)="createDevice()">
            <div class="form-group">
              <label>IMEI</label>
              <input type="text" [(ngModel)]="newImei" name="imei" placeholder="15-digit IMEI" required />
            </div>
            <div class="form-group">
              <label>Fleet</label>
              <select [(ngModel)]="newFleetId" name="fleet" required>
                <option value="">Select fleet</option>
                @for (fleet of fleets(); track fleet.id) {
                  <option [value]="fleet.id">{{ fleet.name }}</option>
                }
              </select>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="closeAddModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="!newImei || !newFleetId">Add Device</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Assign to Vehicle Modal -->
    @if (showAssignModal && selectedDevice()) {
      <div class="modal-overlay" (click)="closeAssignModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>Assign Device to Vehicle</h2>
          <p class="modal-info">
            Device <code>{{ selectedDevice()!.imei }}</code> will be installed on a vehicle in
            <strong>{{ selectedDevice()!.fleet_name }}</strong>.
          </p>
          @if (fleetVehicles().length === 0) {
            <div class="alert alert-warning">
              No vehicles in this fleet. Add a vehicle first before assigning a device.
            </div>
          } @else {
            <div class="form-group">
              <label>Select Vehicle</label>
              <select [(ngModel)]="assignVehicleId">
                <option value="">Choose a vehicle</option>
                @for (vehicle of fleetVehicles(); track vehicle.id) {
                  <option [value]="vehicle.id">{{ getVehicleDisplayName(vehicle) }} ({{ vehicle.vin }})</option>
                }
              </select>
            </div>
          }
          <div class="modal-actions">
            <button type="button" class="btn-secondary" (click)="closeAssignModal()">Cancel</button>
            <button
              type="button"
              class="btn-primary"
              [disabled]="!assignVehicleId || assigning()"
              (click)="confirmAssign()"
            >
              {{ assigning() ? 'Assigning...' : 'Assign' }}
            </button>
          </div>

          @if (assignError()) {
            <div class="alert" [class.alert-error]="assignErrorType() === 'fleet_mismatch_different_client'" [class.alert-warning]="assignErrorType() === 'fleet_mismatch_same_client'">
              @if (assignErrorType() === 'fleet_mismatch_different_client') {
                <strong>Error:</strong> This vehicle belongs to a different client. Please contact support.
              } @else if (assignErrorType() === 'fleet_mismatch_same_client') {
                <strong>Attention!</strong> Vehicle is registered to a different fleet. Correct the vehicle registration first.
              } @else if (assignErrorType() === 'insufficient_permissions') {
                <strong>Error:</strong> You don't have permission to perform this action.
              } @else {
                {{ assignError() }}
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .device-list { padding: 24px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 24px; flex-wrap: wrap; gap: 16px;
    }
    .page-header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .header-actions { display: flex; gap: 12px; align-items: center; }
    .header-actions select {
      padding: 8px 12px; background: #1a1a2e; border: 1px solid #3d3d5c;
      border-radius: 6px; color: #e5e7eb; font-size: 14px; cursor: pointer;
    }
    .btn-primary { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: #2d2d44; color: #e5e7eb; border: 1px solid #3d3d5c; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .btn-assign { background: #22c55e; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .btn-danger { background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .data-table { width: 100%; border-collapse: collapse; background: #1a1a2e; border-radius: 12px; overflow: hidden; }
    .data-table th, .data-table td { text-align: left; padding: 14px 16px; border-bottom: 1px solid #2d2d44; }
    .data-table th { font-size: 12px; text-transform: uppercase; color: #9ca3af; font-weight: 500; background: #0f0f1a; }
    .data-table tbody tr:last-child td { border-bottom: none; }
    .data-table tbody tr:hover { background: #2d2d44; }
    .clickable-row { cursor: pointer; }
    code { background: #0f0f1a; padding: 4px 8px; border-radius: 4px; font-size: 13px; }
    .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; text-transform: capitalize; }
    .status-badge.unassigned { background: #f59e0b; color: #000; }
    .status-badge.active { background: #22c55e; color: #fff; }
    .status-badge.inactive { background: #6b7280; color: #fff; }
    .action-buttons { display: flex; gap: 8px; }
    .loading, .empty-state { text-align: center; padding: 48px; color: #9ca3af; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: #1a1a2e; border: 1px solid #2d2d44; border-radius: 16px; padding: 24px; width: 100%; max-width: 480px; }
    .modal h2 { margin: 0 0 20px; font-size: 20px; }
    .modal-info { font-size: 14px; color: #9ca3af; margin-bottom: 16px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 6px; font-size: 14px; color: #9ca3af; }
    .form-group input, .form-group select {
      width: 100%; padding: 10px 12px; background: #0f0f1a; border: 1px solid #3d3d5c;
      border-radius: 8px; color: #e5e7eb; font-size: 14px; box-sizing: border-box;
    }
    .modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
    .alert { padding: 12px 16px; border-radius: 8px; margin-top: 12px; font-size: 14px; }
    .alert-warning { background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; color: #f59e0b; }
    .alert-error { background: rgba(220, 38, 38, 0.15); border: 1px solid #dc2626; color: #dc2626; }
  `]
})
export class DeviceListComponent implements OnInit {
  private readonly supabaseService = inject(SupabaseService);
  private readonly deviceService = inject(DeviceService);
  private readonly fleetService = inject(FleetService);

  devices = signal<DeviceRow[]>([]);
  filteredDevices = signal<DeviceRow[]>([]);
  fleets = signal<any[]>([]);
  fleetVehicles = signal<Vehicle[]>([]);
  loading = signal(true);
  assigning = signal(false);

  fleetFilter = '';
  statusFilter = '';

  showAddModal = false;
  newImei = '';
  newFleetId = '';

  showAssignModal = false;
  selectedDevice = signal<DeviceRow | null>(null);
  assignVehicleId = '';
  assignError = signal<string | null>(null);
  assignErrorType = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadDevices(), this.loadFleets()]);
    this.loading.set(false);
  }

  private async loadDevices(): Promise<void> {
    const { data } = await this.supabaseService.client
      .from('devices')
      .select('*, fleet:fleets(name), vehicle:vehicles(id, make, model, year, vin)')
      .order('created_at', { ascending: false });

    const rows: DeviceRow[] = (data ?? []).map((d: any) => ({
      id: d.id,
      imei: d.imei,
      fleet_id: d.fleet_id,
      fleet_name: d.fleet?.name,
      vehicle_id: d.vehicle_id,
      vehicle_make: d.vehicle?.make,
      vehicle_model: d.vehicle?.model,
      vehicle_year: d.vehicle?.year,
      vehicle_vin: d.vehicle?.vin,
      status: d.status,
      last_seen: d.last_seen,
      created_at: d.created_at,
    }));

    this.devices.set(rows);
    this.applyFilters();
  }

  private async loadFleets(): Promise<void> {
    const { data } = await this.supabaseService.client
      .from('fleets').select('*').order('name');
    this.fleets.set(data ?? []);
  }

  applyFilters(): void {
    let result = this.devices();
    if (this.fleetFilter) {
      result = result.filter(d => d.fleet_id === this.fleetFilter);
    }
    if (this.statusFilter) {
      result = result.filter(d => d.status === this.statusFilter);
    }
    this.filteredDevices.set(result);
  }

  getVehicleName(device: DeviceRow): string {
    if (!device.vehicle_make) return '—';
    return `${device.vehicle_year ?? ''} ${device.vehicle_make} ${device.vehicle_model}`.trim();
  }

  getVehicleDisplayName(vehicle: Vehicle): string {
    return `${vehicle.year ? vehicle.year + ' ' : ''}${vehicle.make} ${vehicle.model}`.trim();
  }

  async createDevice(): Promise<void> {
    if (!this.newImei.trim() || !this.newFleetId) return;
    const device = await this.deviceService.createDevice(this.newImei.trim(), this.newFleetId);
    if (device) {
      this.closeAddModal();
      await this.loadDevices();
    }
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.newImei = '';
    this.newFleetId = '';
  }

  async openAssignModal(device: DeviceRow): Promise<void> {
    this.selectedDevice.set(device);
    this.assignVehicleId = '';
    this.assignError.set(null);
    this.assignErrorType.set(null);
    this.showAssignModal = true;

    const { data } = await this.supabaseService.client
      .from('vehicles')
      .select('*')
      .eq('fleet_id', device.fleet_id)
      .order('make');
    this.fleetVehicles.set(data ?? []);
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.selectedDevice.set(null);
    this.assignVehicleId = '';
    this.assignError.set(null);
    this.assignErrorType.set(null);
  }

  async confirmAssign(): Promise<void> {
    const device = this.selectedDevice();
    if (!device || !this.assignVehicleId) return;

    this.assigning.set(true);
    this.assignError.set(null);
    this.assignErrorType.set(null);

    const result = await this.deviceService.assignDeviceToVehicle(device.id, this.assignVehicleId);
    this.assigning.set(false);

    if (result.success) {
      this.closeAssignModal();
      await this.loadDevices();
    } else {
      this.assignError.set(this.getErrorMessage(result.error));
      this.assignErrorType.set(result.error ?? null);
    }
  }

  private getErrorMessage(error?: string): string {
    switch (error) {
      case 'device_not_found': return 'Device not found.';
      case 'vehicle_not_found': return 'Vehicle not found.';
      case 'fleet_mismatch_same_client': return 'Vehicle is registered to a different fleet. Correct the vehicle registration first.';
      case 'fleet_mismatch_different_client': return 'This vehicle belongs to a different client. Please contact support.';
      case 'insufficient_permissions': return 'You do not have permission to perform this action.';
      default: return error ?? 'Unknown error.';
    }
  }

  async unassignDevice(device: DeviceRow): Promise<void> {
    if (!confirm(`Unassign device ${device.imei} from its vehicle?`)) return;
    await this.deviceService.unassignDevice(device.id);
    await this.loadDevices();
  }

  async deactivateDevice(device: DeviceRow): Promise<void> {
    if (!confirm(`Deactivate device ${device.imei}? It will stop receiving telemetry.`)) return;
    await this.deviceService.deactivateDevice(device.id);
    await this.loadDevices();
  }
}