import { Injectable, signal, computed, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { OrganizationService } from "./organization.service";
import { AuthService } from "./auth.service";
import { Fleet, FleetWithStats } from "../models/fleet.model";
import { Vehicle } from "../models/vehicle.model";
import { FleetMember, User } from "../models/user.model";

@Injectable({ providedIn: "root" })
export class FleetService {
  private readonly supabase = inject(SupabaseService);
  private readonly organizationService = inject(OrganizationService);
  private readonly authService = inject(AuthService);

  readonly fleets = signal<Fleet[]>([]);
  readonly selectedFleet = signal<Fleet | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  private _loaded = false;

  readonly fleetsWithStats = computed<FleetWithStats[]>(() => {
    return this.fleets().map((f) => ({
      ...f,
      vehicle_count: 0,
      member_count: 0,
      active_vehicle_count: 0,
    }));
  });

  private getSelectedOrgId(): string | null {
    return this.organizationService.selectedOrganization()?.id ?? null;
  }

  async loadFleets(organizationId?: string, force = false): Promise<void> {
    if (!force && this._loaded) return;
    this.isLoading.set(true);
    this.error.set(null);

    const orgId = organizationId ?? this.getSelectedOrgId();
    if (!orgId) {
      this.fleets.set([]);
      this.isLoading.set(false);
      return;
    }

    try {
      const { data, error } = await this.supabase.client
        .from("fleets")
        .select("*")
        .eq("organization_id", orgId)
        .order("name");

      if (error) throw error;
      this.fleets.set(data ?? []);
      this._loaded = true;
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to load fleets");
    } finally {
      this.isLoading.set(false);
    }
  }

  async createFleet(
    name: string,
    organizationId?: string,
  ): Promise<Fleet | null> {
    const orgId = organizationId ?? this.getSelectedOrgId();
    if (!orgId) {
      this.error.set("No organization selected");
      return null;
    }

    try {
      const currentUser = this.authService.currentUser();
      const ownerId = currentUser?.id ?? null;
      const { data, error } = await this.supabase.client
        .from("fleets")
        .insert({ name, owner_id: ownerId, organization_id: orgId })
        .select()
        .single();

      if (error) throw error;

      this.fleets.update((fleets) => [...fleets, data]);
      return data;
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to create fleet");
      return null;
    }
  }

  async updateFleet(
    id: string,
    updates: Partial<Fleet>,
    organizationId?: string,
  ): Promise<boolean> {
    const orgId = organizationId ?? this.getSelectedOrgId();
    if (!orgId) {
      this.error.set("No organization selected");
      return false;
    }

    try {
      const { error } = await this.supabase.client
        .from("fleets")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("organization_id", orgId);

      if (error) throw error;

      this.fleets.update((fleets) =>
        fleets.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      );
      return true;
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to update fleet");
      return false;
    }
  }

  async deleteFleet(id: string, organizationId?: string): Promise<boolean> {
    const orgId = organizationId ?? this.getSelectedOrgId();
    if (!orgId) {
      this.error.set("No organization selected");
      return false;
    }

    try {
      const { error } = await this.supabase.client
        .from("fleets")
        .delete()
        .eq("id", id)
        .eq("organization_id", orgId);

      if (error) throw error;

      this.fleets.update((fleets) => fleets.filter((f) => f.id !== id));
      return true;
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to delete fleet");
      return false;
    }
  }

  async regenerateCode(
    fleetId: string,
    organizationId?: string,
  ): Promise<string | null> {
    const orgId = organizationId ?? this.getSelectedOrgId();
    if (!orgId) {
      this.error.set("No organization selected");
      return null;
    }

    try {
      const { data, error } = (await this.supabase.client.rpc(
        "regenerate_provisioning_code",
        { fleet_uuid: fleetId },
      )) as { data: string | null; error: any };

      if (error) throw error;
      if (data == null) return null;

      this.fleets.update((fleets) =>
        fleets.map((f) =>
          f.id === fleetId ? { ...f, provisioning_code: data } : f,
        ),
      );
      return data;
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to regenerate code");
      return null;
    }
  }

  selectFleet(fleetId: string | null): void {
    if (!fleetId) {
      this.selectedFleet.set(null);
      return;
    }
    const fleet = this.fleets().find((f) => f.id === fleetId) ?? null;
    this.selectedFleet.set(fleet);
  }

  async getFleetVehicles(fleetId: string): Promise<Vehicle[]> {
    try {
      const { data, error } = await this.supabase.client
        .from("vehicles")
        .select("*")
        .eq("fleet_id", fleetId)
        .order("make");

      if (error) throw error;
      return data ?? [];
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to load vehicles");
      return [];
    }
  }

  async getFleetMembers(fleetId: string): Promise<FleetMember[]> {
    try {
      const { data, error } = await this.supabase.client
        .from("fleet_members")
        .select("*, user:users(*)")
        .eq("fleet_id", fleetId);

      if (error) throw error;
      return data ?? [];
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to load members");
      return [];
    }
  }

  async addFleetMember(
    fleetId: string,
    userEmail: string,
    role: FleetMember["role"],
  ): Promise<boolean> {
    try {
      const { data: userData, error: userError } = await this.supabase.client
        .from("users")
        .select("id")
        .eq("email", userEmail)
        .single();

      if (userError || !userData) {
        this.error.set("User not found");
        return false;
      }

      const { error } = await this.supabase.client
        .from("fleet_members")
        .insert({ fleet_id: fleetId, user_id: userData.id, role });

      if (error) throw error;
      return true;
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to add member");
      return false;
    }
  }

  async updateMemberRole(
    fleetId: string,
    userId: string,
    role: FleetMember["role"],
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from("fleet_members")
        .update({ role })
        .eq("fleet_id", fleetId)
        .eq("user_id", userId);

      if (error) throw error;
      return true;
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to update role");
      return false;
    }
  }

  async removeMember(fleetId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from("fleet_members")
        .delete()
        .eq("fleet_id", fleetId)
        .eq("user_id", userId);

      if (error) throw error;
      return true;
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to remove member");
      return false;
    }
  }
}
