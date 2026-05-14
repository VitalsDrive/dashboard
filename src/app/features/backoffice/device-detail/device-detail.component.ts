import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { DeviceService } from '../../../core/services/device.service';
import { DeviceAssignment } from '../../../core/models/device.model';
import { getVehicleDisplayName } from '../../../core/models/vehicle.model';

@Component({
  selector: 'app-device-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="device-detail">
      <header class="page-header">
        <div class="breadcrumb">
          <a routerLink="/backoffice/devices">Devices</a>
          <span class="separator">/</span>
          <span>{{ deviceImei() }}</span>
        </div>
      </header>

      @if (loading()) {
        <div class="loading">Loading...</div>
      } @else if (!deviceImei()) {
        <div class="error">Device not found.</div>
      } @else {
        <div class="content">
          <section class="info-card card">
            <div class="card-header">
              <h2>Device Info</h2>
            </div>
            <div class="card-body">
              <div class="info-row">
                <span class="label">IMEI</span>
                <code>{{ deviceImei() }}</code>
              </div>
              <div class="info-row">
                <span class="label">Fleet</span>
                <span>{{ fleetName() }}</span>
              </div>
              <div class="info-row">
                <span class="label">Status</span>
                <span class="status-badge" [class]="deviceStatus()">{{ deviceStatus() }}</span>
              </div>
              <div class="info-row">
                <span class="label">Last Seen</span>
                <span>{{ deviceLastSeen() ? (deviceLastSeen() | date:'medium') : 'Never' }}</span>
              </div>
              <div class="info-row">
                <span class="label">Current Vehicle</span>
                <span>{{ currentVehicleName() || '—' }}</span>
              </div>
            </div>
          </section>

          <section class="history-card card">
            <div class="card-header">
              <h2>Installation History</h2>
            </div>
            <div class="card-body">
              @if (history().length === 0) {
                <div class="empty">No installation history available.</div>
              } @else {
                <div class="timeline">
                  @for (record of history(); track record.id) {
                    <div class="timeline-item" [class.current]="!record.unassigned_at">
                      <div class="timeline-marker"></div>
                      <div class="timeline-content">
                        <div class="timeline-header">
                          <span class="vehicle-name">{{ record.vehicle?.make ? getVehicleName(record.vehicle) : 'Unknown Vehicle' }}</span>
                          <span class="timeline-date">{{ record.assigned_at | date:'medium' }}</span>
                        </div>
                        @if (record.unassigned_at) {
                          <div class="timeline-meta">
                            Installed {{ record.assigned_at | date:'short' }} —
                            Removed {{ record.unassigned_at | date:'short' }}
                            @if (record.notes) {
                              <span class="notes">"{{ record.notes }}"</span>
                            }
                          </div>
                        } @else {
                          <div class="timeline-meta current-badge">
                            Currently installed
                            @if (record.assigned_by_email) {
                              by {{ record.assigned_by_email }}
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    .device-detail { padding: 24px; max-width: 800px; }
    .page-header { margin-bottom: 24px; }
    .breadcrumb { font-size: 14px; color: #9ca3af; }
    .breadcrumb a { color: #3b82f6; text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    .separator { margin: 0 8px; }
    .content { display: flex; flex-direction: column; gap: 24px; }
    .card { background: #1a1a2e; border: 1px solid #2d2d44; border-radius: 12px; }
    .card-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 20px; border-bottom: 1px solid #2d2d44;
    }
    .card-header h2 { margin: 0; font-size: 16px; font-weight: 600; }
    .card-body { padding: 20px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-row .label { color: #9ca3af; }
    code { background: #0f0f1a; padding: 4px 8px; border-radius: 4px; font-size: 13px; }
    .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; text-transform: capitalize; }
    .status-badge.unassigned { background: #f59e0b; color: #000; }
    .status-badge.active { background: #22c55e; color: #fff; }
    .status-badge.inactive { background: #6b7280; color: #fff; }
    .timeline { display: flex; flex-direction: column; gap: 0; }
    .timeline-item { display: flex; gap: 16px; padding-bottom: 24px; position: relative; }
    .timeline-item:last-child { padding-bottom: 0; }
    .timeline-item:not(:last-child)::before {
      content: ''; position: absolute; left: 7px; top: 20px; bottom: 0;
      width: 2px; background: #2d2d44;
    }
    .timeline-marker {
      width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0;
      background: #2d2d44; border: 2px solid #3d3d5c; margin-top: 2px;
    }
    .timeline-item.current .timeline-marker { background: #22c55e; border-color: #22c55e; }
    .timeline-content { flex: 1; }
    .timeline-header { display: flex; justify-content: space-between; align-items: baseline; }
    .vehicle-name { font-weight: 500; }
    .timeline-date { font-size: 12px; color: #9ca3af; }
    .timeline-meta { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .timeline-meta.current-badge { color: #22c55e; }
    .notes { font-style: italic; }
    .empty { color: #9ca3af; text-align: center; padding: 24px; }
    .loading, .error { text-align: center; padding: 48px; color: #9ca3af; }
  `]
})
export class DeviceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly supabaseService = inject(SupabaseService);
  private readonly deviceService = inject(DeviceService);

  deviceImei = signal('');
  fleetName = signal('');
  deviceStatus = signal('');
  deviceLastSeen = signal<string | null>(null);
  currentVehicleName = signal('');
  history = signal<DeviceAssignment[]>([]);
  loading = signal(true);

  private deviceId = '';

  async ngOnInit(): Promise<void> {
    this.deviceId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.deviceId) {
      this.loading.set(false);
      return;
    }
    await this.loadDevice();
    await this.loadHistory();
    this.loading.set(false);
  }

  private async loadDevice(): Promise<void> {
    const { data } = await this.supabaseService.client
      .from('devices')
      .select('*, fleet:fleets(name), vehicle:vehicles(id, make, model, year)')
      .eq('id', this.deviceId)
      .single();

    if (data) {
      this.deviceImei.set(data.imei);
      this.fleetName.set(data.fleet?.name ?? 'Unknown');
      this.deviceStatus.set(data.status);
      this.deviceLastSeen.set(data.last_seen);
      if (data.vehicle) {
        const v = data.vehicle as any;
        this.currentVehicleName.set(v.make ? `${v.year ?? ''} ${v.make} ${v.model}`.trim() : 'Unknown');
      }
    }
  }

  private async loadHistory(): Promise<void> {
    const { data } = await this.supabaseService.client
      .from('device_assignments')
      .select('*, vehicle:vehicles(id, make, model, year, vin), assigned_by_email:users(email)')
      .eq('device_id', this.deviceId)
      .order('assigned_at', { ascending: false });

    this.history.set(data ?? []);
  }

  getVehicleName(vehicle: any): string {
    return vehicle ? `${vehicle.year ?? ''} ${vehicle.make} ${vehicle.model}`.trim() : 'Unknown';
  }

  getVehicleDisplayName = getVehicleDisplayName;
}