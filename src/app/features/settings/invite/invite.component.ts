import {
  Component,
  computed,
  inject,
  linkedSignal,
  resource,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { SupabaseService } from "../../../core/services/supabase.service";
import { AuthService } from "../../../core/services/auth.service";
import { OrganizationService } from "../../../core/services/organization.service";

@Component({
  selector: "app-invite",
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonToggleModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: "./invite.component.html",
  styleUrl: "./invite.component.scss",
})
export class InviteComponent {
  private readonly supabaseService = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  private readonly organizationService = inject(OrganizationService);
  private readonly snackBar = inject(MatSnackBar);

  // resource() reacts to selectedOrganization() — re-fetches fleets whenever org changes
  private readonly fleetResource = resource({
    params: () => this.organizationService.selectedOrganization()?.id,
    loader: async ({ params: orgId }) => {
      if (!orgId) return [];
      const { data } = await this.supabaseService.client
        .from('fleets').select('*').eq('organization_id', orgId).order('name');
      return data ?? [];
    },
  });

  readonly fleets = computed(() => this.fleetResource.value() ?? []);
  readonly selectedFleetId = linkedSignal(() => this.fleets()[0]?.id ?? null);

  readonly inviteType = signal<"single-use" | "multi-use">("single-use");
  readonly inviteRole = signal<"viewer" | "driver" | "fleet_admin">("viewer");
  readonly inviteLink = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  get singleFleet(): boolean {
    return this.fleets().length === 1;
  }

  async generateInvite(): Promise<void> {
    this.error.set(null);
    this.inviteLink.set(null);
    this.isLoading.set(true);

    try {
      const createdBy = this.authService.currentUser()?.id ?? null;
      if (!createdBy) {
        this.error.set("You must be signed in to generate an invite link.");
        return;
      }

      const orgId = this.organizationService.selectedOrganization()?.id;
      if (!orgId) {
        this.error.set(
          "No organization selected. Please complete onboarding first.",
        );
        return;
      }

      const fleetId = this.selectedFleetId();
      if (!fleetId) {
        this.error.set("Please select a fleet to invite members to.");
        return;
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const { error: dbError } = await this.supabaseService.client
        .from("org_invites")
        .insert({
          token,
          org_id: orgId,
          fleet_id: fleetId,
          created_by: createdBy,
          type: this.inviteType(),
          role: this.inviteRole(),
          expires_at: expiresAt,
        });

      if (dbError) {
        this.error.set(dbError.message);
        return;
      }

      this.inviteLink.set(`${window.location.origin}/join?token=${token}`);
    } catch (err: unknown) {
      this.error.set(
        (err as Error).message ?? "Failed to generate invite link",
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  copyLink(): void {
    const link = this.inviteLink();
    if (!link) return;

    navigator.clipboard.writeText(link).then(() => {
      this.snackBar.open("Link copied to clipboard", "", {
        duration: 2000,
        panelClass: "vd-snackbar",
      });
    });
  }
}
