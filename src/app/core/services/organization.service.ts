import { Injectable, signal, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { AuthService } from "./auth.service";
import { Organization, Invitation, OrgMember } from "../models/organization.model";

@Injectable({ providedIn: "root" })
export class OrganizationService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);

  readonly organizations = signal<Organization[]>([]);
  readonly selectedOrganization = signal<Organization | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  private _loaded = false;

  async loadOrganizations(force = false): Promise<void> {
    if (!force && this._loaded) return;
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.client
        .from("organizations")
        .select("*")
        .order("name");

      if (error) throw error;
      this.organizations.set(data ?? []);
      this._loaded = true;
      if (!this.selectedOrganization() && (data ?? []).length > 0) {
        this.selectOrganization(data![0].id);
      }
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to load organizations");
    } finally {
      this.isLoading.set(false);
    }
  }

  async getOrganizations(): Promise<Organization[]> {
    try {
      const { data, error } = await this.supabase.client
        .from("organizations")
        .select("*")
        .order("name");

      if (error) throw error;
      return data ?? [];
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to load organizations");
      return [];
    }
  }

  async getOrganization(id: string): Promise<Organization | null> {
    try {
      const { data, error } = await this.supabase.client
        .from("organizations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to load organization");
      return null;
    }
  }

  async createOrganization(name: string): Promise<Organization | null> {
    try {
      const currentUser = this.authService.currentUser();
      const ownerId = currentUser?.id ?? null;
      const { data, error } = await this.supabase.client
        .from("organizations")
        .insert({ name, owner_id: ownerId })
        .select()
        .single();

      if (error) throw error;

      this.organizations.update((orgs) => [...orgs, data]);
      return data;
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to create organization");
      return null;
    }
  }

  async updateOrganization(
    id: string,
    updates: Partial<Organization>,
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from("organizations")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      this.organizations.update((orgs) =>
        orgs.map((o) => (o.id === id ? { ...o, ...updates } : o)),
      );
      return true;
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to update organization");
      return false;
    }
  }

  async deleteOrganization(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from("organizations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      this.organizations.update((orgs) => orgs.filter((o) => o.id !== id));
      return true;
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to delete organization");
      return false;
    }
  }

  async getOrgMembers(orgId: string): Promise<OrgMember[]> {
    try {
      const { data, error } = await this.supabase.client
        .from("fleet_members")
        .select("*, user:users(*)")
        .eq("fleet_id", orgId);

      if (error) throw error;
      return data ?? [];
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to load members");
      return [];
    }
  }

  async inviteMember(
    orgId: string,
    email: string,
    role: Invitation["role"],
  ): Promise<Invitation | null> {
    try {
      const currentUser = this.authService.currentUser();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await this.supabase.client
        .from("invitations")
        .insert({
          organization_id: orgId,
          email,
          role,
          invited_by: currentUser?.id ?? null,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? "Failed to invite member");
      return null;
    }
  }

  selectOrganization(orgId: string | null): void {
    if (!orgId) {
      this.selectedOrganization.set(null);
      return;
    }
    const org = this.organizations().find((o) => o.id === orgId) ?? null;
    this.selectedOrganization.set(org);
  }
}
