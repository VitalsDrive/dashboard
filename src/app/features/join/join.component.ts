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
    // Require authentication before redemption (T-02-06-03)
    if (!this.authService.isAuthenticated()) {
      await this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/join?token=${token}` },
      });
      return;
    }

    // Get Auth0 sub — currentUser().id is user.sub (see auth.service.ts)
    const user = this.authService.currentUser();
    const sub = user?.id;

    if (!sub) {
      this.error.set('Unable to identify your account. Please try signing in again.');
      this.isLoading.set(false);
      return;
    }

    // Atomic redemption via DB function (CR-05: eliminates TOCTOU race condition).
    // redeem_invite() uses FOR UPDATE row locking, inserts fleet_member, marks used_at.
    // Raises 'invalid_token' or 'no_fleet' on failure.
    const { error: rpcErr } = await this.supabaseService.client
      .rpc('redeem_invite', { p_token: token, p_user_id: sub });

    if (rpcErr) {
      if (rpcErr.message?.includes('invalid_token')) {
        this.error.set('This invite link is invalid, expired, or has already been used.');
      } else if (rpcErr.message?.includes('no_fleet')) {
        this.error.set('Unable to join — this organization has no fleet yet.');
      } else {
        this.error.set('Failed to join the organization. Please try again.');
      }
      this.isLoading.set(false);
      return;
    }

    this.success.set(true);
    this.isLoading.set(false);

    setTimeout(() => {
      this.router.navigate(['/onboarding/organization']);
    }, 1500);
  }
}
