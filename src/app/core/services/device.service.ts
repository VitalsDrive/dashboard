import { Injectable, signal, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { OrganizationService } from "./organization.service";
import { FleetService } from "./fleet.service";
import { Device, DeviceWithDetails, DeviceAssignment, AssignResult } from "../models/device.model";
import { Vehicle } from "../models/vehicle.model";

@Injectable({ providedIn: "root" })
export class DeviceService {
  private readonly supabase = inject(SupabaseService);
  private readonly organizationService = inject(OrganizationService);
  private readonly fleetService = inject(FleetService);

  readonly devices = signal<Device[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  // ============================================================
  // Device CRUD
  // ============================================================

  private async getOrgFleetIds(): Promise<string[]> {
    const org = this.organizationService.selectedOrganization();
    if (!org) return [];
    const fleets = this.fleetService.fleets();
    return fleets.filter((f) => f.organization_id === org.id).map((f) => f.id);
  }

  async loadDevices(fleetId?: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const orgFleetIds = await this.getOrgFleetIds();
      if (orgFleetIds.length === 0 && !fleetId) {
        this.devices.set([]);
        return;
      }

      let query = this.supabase.client
        .from("devices")
        .select("*, fleet:fleets(name, organization_id), vehicle:vehicles(id, make, model, year)")
        .order("created_at", { ascending: false });

      if (fleetId) {
        if (!orgFleetIds.includes(fleetId)) {
          this.error.set("Fleet not found in organization");
          this.devices.set([]);
          return;
        }
        query = query.eq("fleet_id", fleetId);
      } else {
        query = query.in("fleet_id", orgFleetIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      this.devices.set(data ?? []);
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to load devices");
    } finally {
      this.isLoading.set(false);
    }
  }

  async getDevices(fleetId?: string): Promise<Device[]> {
    try {
      const orgFleetIds = await this.getOrgFleetIds();
      if (orgFleetIds.length === 0 && !fleetId) return [];

      let query = this.supabase.client
        .from("devices")
        .select("*, fleet:fleets(name, organization_id), vehicle:vehicles(id, make, model, year)")
        .order("created_at", { ascending: false });

      if (fleetId) {
        if (!orgFleetIds.includes(fleetId)) return [];
        query = query.eq("fleet_id", fleetId);
      } else {
        query = query.in("fleet_id", orgFleetIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to get devices");
      return [];
    }
  }

  async getDevice(id: string): Promise<Device | null> {
    try {
      const orgFleetIds = await this.getOrgFleetIds();
      if (orgFleetIds.length === 0) return null;

      const { data, error } = await this.supabase.client
        .from("devices")
        .select("*, fleet:fleets(name, organization_id), vehicle:vehicles(id, make, model, year)")
        .eq("id", id)
        .single();

      if (error) return null;
      if (!orgFleetIds.includes(data.fleet_id)) return null;

      return data;
    } catch {
      return null;
    }
  }

  async createDevice(
    imei: string,
    fleetId: string,
    deviceType: string = "obd2",
  ): Promise<Device | null> {
    try {
      const orgFleetIds = await this.getOrgFleetIds();
      if (!orgFleetIds.includes(fleetId)) {
        this.error.set("Fleet not found in organization");
        return null;
      }

      const { data, error } = await this.supabase.client
        .from("devices")
        .insert({
          imei,
          fleet_id: fleetId,
          device_type: deviceType,
          status: "unassigned",
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      this.devices.update((devices) => [...devices, data]);
      return data;
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to create device");
      return null;
    }
  }

  private async verifyDeviceInOrg(deviceId: string): Promise<boolean> {
    const device = await this.getDevice(deviceId);
    return device !== null;
  }

  async deactivateDevice(deviceId: string): Promise<boolean> {
    try {
      if (!(await this.verifyDeviceInOrg(deviceId))) {
        this.error.set("Device not found in organization");
        return false;
      }

      const { error } = await this.supabase.client
        .from("devices")
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .eq("id", deviceId);

      if (error) throw error;
      this.devices.update((devices) =>
        devices.map((d) =>
          d.id === deviceId ? { ...d, status: "inactive" } : d,
        ),
      );
      return true;
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to deactivate device");
      return false;
    }
  }

  async deleteDevice(deviceId: string): Promise<boolean> {
    try {
      if (!(await this.verifyDeviceInOrg(deviceId))) {
        this.error.set("Device not found in organization");
        return false;
      }

      const { error } = await this.supabase.client
        .from("devices")
        .delete()
        .eq("id", deviceId);

      if (error) throw error;
      this.devices.update((devices) => devices.filter((d) => d.id !== deviceId));
      return true;
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to delete device");
      return false;
    }
  }

  // ============================================================
  // Assign / Unassign
  // ============================================================

  /**
   * Calls the assign_device_to_vehicle RPC.
   * Returns result with error type so caller can show appropriate UI.
   */
  async assignDeviceToVehicle(
    deviceId: string,
    vehicleId: string,
  ): Promise<AssignResult> {
    try {
      if (!(await this.verifyDeviceInOrg(deviceId))) {
        return { success: false, error: "device_not_found" };
      }

      const { data, error } = await this.supabase.client.rpc(
        "assign_device_to_vehicle",
        {
          p_device_id: deviceId,
          p_vehicle_id: vehicleId,
          p_assigned_by: (await this.supabase.client.auth.getUser()).data.user?.id,
        },
      );

      if (error) throw error;

      const result = data as AssignResult;
      if (result.success) {
        await this.loadDevices();
      }
      return result;
    } catch (err: unknown) {
      const message = (err as Error).message ?? "Failed to assign device";
      this.error.set(message);
      return { success: false, error: "device_not_found" };
    }
  }

  async unassignDevice(deviceId: string, notes?: string): Promise<boolean> {
    try {
      if (!(await this.verifyDeviceInOrg(deviceId))) {
        this.error.set("Device not found in organization");
        return false;
      }

      const { error } = await this.supabase.client.rpc("unassign_device", {
        p_device_id: deviceId,
        p_assigned_by: (await this.supabase.client.auth.getUser()).data.user?.id,
        p_notes: notes ?? null,
      });

      if (error) throw error;
      await this.loadDevices();
      return true;
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to unassign device");
      return false;
    }
  }

  // ============================================================
  // Assignment History
  // ============================================================

  async getAssignmentHistory(deviceId: string): Promise<DeviceAssignment[]> {
    try {
      if (!(await this.verifyDeviceInOrg(deviceId))) {
        this.error.set("Device not found in organization");
        return [];
      }

      const { data, error } = await this.supabase.client
        .from("device_assignments")
        .select(
          "*, vehicle:vehicles(id, make, model, year), assigned_by_email:users(email)",
        )
        .eq("device_id", deviceId)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    } catch (err: unknown) {
      this.error.set(
        (err as Error).message ?? "Failed to load assignment history",
      );
      return [];
    }
  }

  async getFleetVehicles(fleetId: string): Promise<Vehicle[]> {
    try {
      const orgFleetIds = await this.getOrgFleetIds();
      if (!orgFleetIds.includes(fleetId)) {
        this.error.set("Fleet not found in organization");
        return [];
      }

      const { data, error } = await this.supabase.client
        .from("vehicles")
        .select("*")
        .eq("fleet_id", fleetId)
        .order("make");

      if (error) throw error;
      return data ?? [];
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to load fleet vehicles");
      return [];
    }
  }
}