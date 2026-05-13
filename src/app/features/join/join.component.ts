import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-join',
  standalone: true,
  imports: [MatProgressSpinnerModule, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './join.component.html',
  styleUrls: ['./join.component.scss'],
})
export class JoinComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly supabaseService = inject(SupabaseService);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  ngOnInit(): void {
    this.route.queryParams.subscribe(async (params) => {
      const token = params['token'];
      if (!token) {
        this.error.set('No invite token found.');
        this.isLoading.set(false);
        return;
      }
      await this.redeemToken(token);
    });
  }

  private async redeemToken(token: string): Promise<void> {
    // Step 1: Validate token against org_invites
    const { data: invite, error: inviteErr } = await this.supabaseService.client
      .from('org_invites')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (inviteErr || !invite) {
      this.error.set('This invite link is invalid or has expired.');
      this.isLoading.set(false);
      return;
    }

    // Step 2: Reject already-used single-use tokens
    if (invite.type === 'single-use' && invite.used_at) {
      this.error.set('This invite link has already been used.');
      this.isLoading.set(false);
      return;
    }

    // Step 3: Require authentication (T-02-06-03)
    if (!this.authService.isAuthenticated()) {
      await this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/join?token=${token}` },
      });
      return;
    }

    // Step 4: Get Auth0 sub — currentUser().id is user.sub (see auth.service.ts line 61)
    const user = this.authService.currentUser();
    const sub = user?.id;

    if (!sub) {
      this.error.set('Unable to identify your account. Please try signing in again.');
      this.isLoading.set(false);
      return;
    }

    // Step 5: Get first fleet for the org
    const { data: fleet, error: fleetErr } = await this.supabaseService.client
      .from('fleets')
      .select('id')
      .eq('organization_id', invite.org_id)
      .limit(1)
      .single();

    if (fleetErr || !fleet) {
      this.error.set('Unable to join — this organization has no fleet yet.');
      this.isLoading.set(false);
      return;
    }

    // Step 6: Insert fleet_member row — role comes from org_invites (T-02-06-02: never 'owner')
    const { error: memberErr } = await this.supabaseService.client
      .from('fleet_members')
      .insert({
        user_id: sub,
        fleet_id: fleet.id,
        organization_id: invite.org_id,
        role: invite.role,
      });

    if (memberErr) {
      // Conflict = already a member — treat as success
      if (memberErr.code !== '23505') {
        this.error.set('Failed to join the organization. Please try again.');
        this.isLoading.set(false);
        return;
      }
    }

    // Step 7: Mark single-use token as used (T-02-06-04)
    if (invite.type === 'single-use') {
      await this.supabaseService.client
        .from('org_invites')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);
    }

    // Step 8: Success — redirect after brief delay
    this.success.set(true);
    this.isLoading.set(false);

    setTimeout(() => {
      this.router.navigate(['/onboarding/org']);
    }, 1500);
  }
}
