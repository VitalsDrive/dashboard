import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FleetService } from '../../../core/services/fleet.service';
import { VehicleService } from '../../../core/services/vehicle.service';
import { Fleet } from '../../../core/models/fleet.model';
import { Vehicle } from '../../../core/models/vehicle.model';
import { FleetMember } from '../../../core/models/user.model';
import { getVehicleDisplayName } from '../../../core/models/vehicle.model';

@Component({
  selector: 'app-fleet-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="fleet-detail">
      <header class="page-header">
        <div class="breadcrumb">
          <a routerLink="/backoffice/fleets">Fleets</a>
          <span class="separator">/</span>
          <span>{{ fleet()?.name }}</span>
        </div>
      </header>

      @if (loading()) {
        <div class="loading">Loading...</div>
      } @else if (fleet()) {
        <div class="content">
          <section class="fleet-info card">
            <div class="card-header">
              <h2>Fleet Settings</h2>
              @if (editing()) {
                <div class="edit-actions">
                  <button class="btn-secondary" (click)="cancelEdit()">Cancel</button>
                  <button class="btn-primary" (click)="saveFleet()">Save</button>
                </div>
              } @else {
                <button class="btn-secondary" (click)="startEdit()">Edit</button>
              }
            </div>
            <div class="card-body">
              @if (editing()) {
                <div class="form-group">
                  <label>Name</label>
                  <input type="text" [(ngModel)]="editName" />
                </div>
              } @else {
                <div class="info-row">
                  <span class="label">Name</span>
                  <span>{{ fleet()!.name }}</span>
                </div>
              }
              <div class="info-row">
                <span class="label">Provisioning Code</span>
                <div class="code-group">
                  <code>{{ fleet()!.provisioning_code }}</code>
                  <button class="btn-small" (click)="regenerateCode()">Regenerate</button>
                </div>
              </div>
              <div class="info-row">
                <span class="label">Created</span>
                <span>{{ fleet()!.created_at | date:'medium' }}</span>
              </div>
            </div>
          </section>

          <section class="vehicles card">
            <div class="card-header">
              <h2>Vehicles</h2>
              <span class="count">{{ vehicles().length }}</span>
            </div>
            <div class="card-body">
              @if (vehicles().length === 0) {
                <div class="empty">No vehicles in this fleet</div>
              } @else {
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>VIN</th>
                      <th>Status</th>
                      <th>Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (vehicle of vehicles(); track vehicle.id) {
                      <tr [routerLink]="['/backoffice/vehicles', vehicle.id]">
                        <td>{{ getVehicleName(vehicle) }}</td>
                        <td><code>{{ vehicle.vin }}</code></td>
                        <td>
                          <span class="status-badge" [class]="vehicle.status">
                            {{ vehicle.status }}
                          </span>
                        </td>
                        <td>{{ vehicle.last_seen ? (vehicle.last_seen | date:'short') : 'Never' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>
          </section>

          <section class="members card">
            <div class="card-header">
              <h2>Team Members</h2>
              <button class="btn-primary" (click)="showInviteModal = true">Invite</button>
            </div>
            <div class="card-body">
              @if (members().length === 0) {
                <div class="empty">No members</div>
              } @else {
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (member of members(); track member.user_id) {
                      <tr>
                        <td>{{ member.user?.email || member.user_id }}</td>
                        <td>
                          <select 
                            [value]="member.role" 
                            (change)="updateRole(member, $event)"
                            [disabled]="member.role === 'owner'"
                          >
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </td>
                        <td>{{ member.joined_at | date:'short' }}</td>
                        <td>
                          @if (member.role !== 'owner') {
                            <button class="btn-danger" (click)="removeMember(member)">Remove</button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>
          </section>
        </div>
      }
    </div>

    @if (showInviteModal) {
      <div class="modal-overlay" (click)="showInviteModal = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>Invite Team Member</h2>
          <form (ngSubmit)="inviteMember()">
            <div class="form-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="inviteEmail" name="email" required />
            </div>
            <div class="form-group">
              <label>Role</label>
              <select [(ngModel)]="inviteRole" name="role">
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="showInviteModal = false">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="!inviteEmail">Invite</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .fleet-detail { padding: 24px; }
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
    .info-row .label { color: #9ca3af; }
    .code-group { display: flex; align-items: center; gap: 12px; }
    code { background: #0f0f1a; padding: 4px 8px; border-radius: 4px; font-size: 13px; }
    .btn-primary { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
    .btn-secondary { background: #2d2d44; color: #e5e7eb; border: 1px solid #3d3d5c; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
    .btn-small { background: #2d2d44; color: #9ca3af; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    .btn-danger { background: #dc2626; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    .edit-actions { display: flex; gap: 8px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 6px; font-size: 14px; color: #9ca3af; }
    .form-group input, .form-group select { 
      width: 100%; padding: 10px 12px; background: #0f0f1a; border: 1px solid #3d3d5c;
      border-radius: 8px; color: #e5e7eb; font-size: 14px; box-sizing: border-box;
    }
    select { cursor: pointer; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: #1a1a2e; border: 1px solid #2d2d44; border-radius: 16px; padding: 24px; width: 100%; max-width: 400px; }
    .modal h2 { margin: 0 0 20px; font-size: 20px; }
    .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { text-align: left; padding: 12px; border-bottom: 1px solid #2d2d44; }
    .data-table th { font-size: 12px; text-transform: uppercase; color: #9ca3af; font-weight: 500; }
    .data-table tr { cursor: pointer; transition: background 0.2s; }
    .data-table tbody tr:hover { background: #2d2d44; }
    .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .status-badge.pending { background: #f59e0b; color: #000; }
    .status-badge.active { background: #22c55e; color: #fff; }
    .status-badge.inactive { background: #6b7280; color: #fff; }
    .status-badge.maintenance { background: #8b5cf6; color: #fff; }
    .count { background: #2d2d44; padding: 4px 10px; border-radius: 12px; font-size: 13px; }
    .empty { color: #9ca3af; text-align: center; padding: 24px; }
    .loading { text-align: center; padding: 48px; color: #9ca3af; }
  `]
})
export class FleetDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fleetService = inject(FleetService);
  private readonly vehicleService = inject(VehicleService);

  fleet = signal<Fleet | null>(null);
  vehicles = signal<Vehicle[]>([]);
  members = signal<FleetMember[]>([]);
  loading = signal(true);
  editing = signal(false);
  editName = '';

  showInviteModal = false;
  inviteEmail = '';
  inviteRole: FleetMember['role'] = 'member';

  private fleetId = '';

  async ngOnInit(): Promise<void> {
    this.fleetId = this.route.snapshot.paramMap.get('id') ?? '';
    await this.loadData();
    this.loading.set(false);
  }

  private async loadData(): Promise<void> {
    const fleets = this.fleetService.fleets();
    if (fleets.length === 0) {
      await this.fleetService.loadFleets();
    }
    
    const fleet = this.fleetService.fleets().find(f => f.id === this.fleetId);
    this.fleet.set(fleet ?? null);
    
    if (fleet) {
      this.vehicles.set(await this.fleetService.getFleetVehicles(this.fleetId));
      this.members.set(await this.fleetService.getFleetMembers(this.fleetId));
    }
  }

  getVehicleName(vehicle: Vehicle): string {
    return getVehicleDisplayName(vehicle);
  }

  startEdit(): void {
    this.editName = this.fleet()?.name ?? '';
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  async saveFleet(): Promise<void> {
    if (!this.editName.trim()) return;
    await this.fleetService.updateFleet(this.fleetId, { name: this.editName.trim() });
    this.editing.set(false);
    this.fleet.set({ ...this.fleet()!, name: this.editName.trim() });
  }

  async regenerateCode(): Promise<void> {
    await this.fleetService.regenerateCode(this.fleetId);
    const code = this.fleetService.fleets().find(f => f.id === this.fleetId)?.provisioning_code;
    if (code) {
      this.fleet.set({ ...this.fleet()!, provisioning_code: code });
    }
  }

  async updateRole(member: FleetMember, event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    await this.fleetService.updateMemberRole(this.fleetId, member.user_id, select.value as FleetMember['role']);
    await this.loadData();
  }

  async removeMember(member: FleetMember): Promise<void> {
    if (confirm('Remove this member?')) {
      await this.fleetService.removeMember(this.fleetId, member.user_id);
      await this.loadData();
    }
  }

  async inviteMember(): Promise<void> {
    if (!this.inviteEmail.trim()) return;
    await this.fleetService.addFleetMember(this.fleetId, this.inviteEmail.trim(), this.inviteRole);
    this.inviteEmail = '';
    this.showInviteModal = false;
    await this.loadData();
  }
}
