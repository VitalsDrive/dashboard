import { Injectable, signal, computed, inject } from "@angular/core";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { Router } from "@angular/router";
import { AuthService as Auth0Service, User } from "@auth0/auth0-angular";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom, catchError, of } from "rxjs";
import { environment } from "../../../environments/environment";
import { SupabaseService } from "./supabase.service";

export interface MockUser {
  id: string;
  email: string;
  role: string;
  roles?: string[];
}

export interface UserState {
  isAllowlisted: boolean;
  isOnboardingComplete: boolean;
  hasOrganization: boolean;
  hasFleet: boolean;
  organizationId: string | null;
}

export interface ExchangeResponse {
  accessToken: string;
  refreshToken: string;
  user: MockUser;
}

export interface MeResponse {
  sub: string;
  email: string;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly router = inject(Router);
  private readonly auth0 = inject(Auth0Service);
  private readonly http = inject(HttpClient);
  private readonly supabaseService = inject(SupabaseService);

  private readonly TOKEN_KEY = 'vd_access_token';
  private readonly REFRESH_KEY = 'vd_refresh_token';

  // Access token is stored in memory only — never persisted to localStorage (CR-03).
  private internalToken: string | null = null;

  // isAuthenticated: real boolean signal backed by Auth0 Observable (D-08)
  // Fix: replaces broken computed(() => firstValueFrom(...)) which returned a Promise
  readonly isAuthenticated = toSignal(this.auth0.isAuthenticated$, { initialValue: false });

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly auth0User = signal<User | null>(null);

  readonly currentUser = computed<MockUser | null>(() => {
    const user = this.auth0User();
    if (!user) return null;
    return {
      id: user.sub || "",
      email: user.email || user.name || "",
      role: "admin",
      roles: (user as any)['https://vitalsdrive.com/roles'] ?? [],
    };
  });

  readonly isOnboardingComplete = signal(false);
  readonly isAllowlisted = signal(false);
  readonly isAdmin = signal(false);
  readonly isOwner = signal(false);

  constructor() {
    this.auth0.user$.pipe(takeUntilDestroyed()).subscribe({
      next: (user) => {
        this.auth0User.set(user ?? null);
      },
      error: () => {
        this.auth0User.set(null);
      },
    });
  }

  async signIn(): Promise<{ user: MockUser; error: any }> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      // loginWithRedirect navigates away — code after this never executes (CR-06).
      // Token exchange is triggered in the auth callback flow, not here.
      await firstValueFrom(this.auth0.loginWithRedirect());
      return { user: null as any, error: null };
    } catch (err: any) {
      this.error.set(err.message || "Sign in failed");
      this.isLoading.set(false);
      return { user: null as any, error: err };
    }
  }

  async exchangeToken(auth0Token: string): Promise<void> {
    const data = await firstValueFrom(
      this.http.post<ExchangeResponse>(
        `${environment.authServiceUrl}/auth/exchange`,
        { auth0Token },
      )
    );

    // Store access token in memory only — not in localStorage (CR-03).
    this.internalToken = data.accessToken;
  }

  getInternalToken(): string | null {
    return this.internalToken;
  }

  async refreshTokens(): Promise<void> {
    this.internalToken = null;
    await this.getToken();
  }

  async getToken(): Promise<string | null> {
    if (this.internalToken) {
      return this.internalToken;
    }

    try {
      const auth0Token = await firstValueFrom(this.auth0.getAccessTokenSilently());
      await this.exchangeToken(auth0Token);
      return this.internalToken;
    } catch (err) {
      console.error("Failed to get token:", err);
      return null;
    }
  }

  async signOut(): Promise<{ error: any }> {
    this.internalToken = null;
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);

    this.isOnboardingComplete.set(false);
    this.isAllowlisted.set(false);
    this.isAdmin.set(false);
    this.isOwner.set(false);

    this.auth0.logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });

    return { error: null };
  }

  async getSession(): Promise<{
    data: { session: { user: MockUser } | null };
  }> {
    return {
      data: {
        session: this.currentUser() ? { user: this.currentUser()! } : null,
      },
    };
  }

  async getCurrentUser(): Promise<MockUser | null> {
    return this.currentUser();
  }

  async initializeUserState(): Promise<UserState> {
    // D-07: validate in-memory JWT against auth-service before any Supabase queries.
    // Token is memory-only (CR-03) — no localStorage read needed.
    if (this.internalToken) {
      try {
        const me = await firstValueFrom(
          this.http.get<MeResponse>(
            `${environment.authServiceUrl}/auth/me`,
            { headers: { Authorization: `Bearer ${this.internalToken}` } }
          ).pipe(
            catchError(() => {
              // 401 or network error — clear token
              this.signOut();
              return of(null);
            })
          )
        );

        if (!me) {
          return {
            isAllowlisted: false,
            isOnboardingComplete: false,
            hasOrganization: false,
            hasFleet: false,
            organizationId: null,
          };
        }
      } catch {
        await this.signOut();
        return {
          isAllowlisted: false,
          isOnboardingComplete: false,
          hasOrganization: false,
          hasFleet: false,
          organizationId: null,
        };
      }
    }

    const user = this.currentUser();
    if (!user) {
      return {
        isAllowlisted: false,
        isOnboardingComplete: false,
        hasOrganization: false,
        hasFleet: false,
        organizationId: null,
      };
    }

    // D-10: query fleet_members for organization membership (user_id is TEXT = Auth0 sub)
    const { data: membership, error: memberError } = await this.supabaseService.client
      .from('fleet_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (memberError) {
      console.error('Failed to load fleet membership:', memberError);
    }

    const hasOrganization = !!membership?.organization_id;
    const organizationId = membership?.organization_id ?? null;

    let hasFleet = false;

    // D-11: query fleets count for the organization
    if (hasOrganization && organizationId) {
      const { count, error: fleetError } = await this.supabaseService.client
        .from('fleets')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (fleetError) {
        console.error('Failed to load fleet count:', fleetError);
      } else {
        hasFleet = (count ?? 0) > 0;
      }
    }

    const isOnboardingComplete = hasOrganization && hasFleet;

    this.isAllowlisted.set(hasOrganization);
    this.isOnboardingComplete.set(isOnboardingComplete);

    return {
      isAllowlisted: hasOrganization,
      isOnboardingComplete,
      hasOrganization,
      hasFleet,
      organizationId,
    };
  }

  async checkUserRoles(): Promise<void> {
    const user = this.currentUser();
    const roles: string[] = user?.roles ?? [];
    this.isOwner.set(roles.includes('owner'));
    this.isAdmin.set(roles.includes('admin') || roles.includes('owner'));
  }

  navigateToDashboard(): void {
    this.router.navigate(["/dashboard"]);
  }

  navigateToLogin(): void {
    this.router.navigate(["/login"]);
  }

  navigateToOnboarding(): void {
    this.router.navigate(["/onboarding"]);
  }

  getUserEmail(): string {
    return this.currentUser()?.email ?? "";
  }

  async completeOnboarding(
    fleetName?: string,
  ): Promise<{ success: boolean; error: string | null }> {
    await this.initializeUserState();
    await this.checkUserRoles();
    return { success: true, error: null };
  }

  async signUp(): Promise<{ user: MockUser; error: any }> {
    return this.signIn();
  }

  async signInWithGoogle(): Promise<{ user: MockUser; error: any }> {
    return this.signIn();
  }
}
