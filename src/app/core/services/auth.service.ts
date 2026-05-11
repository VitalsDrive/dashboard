import { Injectable, signal, computed, inject, effect } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Router } from "@angular/router";
import { AuthService as Auth0Service, User } from "@auth0/auth0-angular";
import { firstValueFrom } from "rxjs";

export interface MockUser {
  id: string;
  email: string;
  role: string;
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

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly router = inject(Router);
  private readonly auth0 = inject(Auth0Service);
  private internalToken: string | null = null;

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
    };
  });

  readonly isAuthenticated = computed(() => {
    return firstValueFrom(this.auth0.isAuthenticated$);
  });

  readonly isOnboardingComplete = signal(false);
  readonly isAllowlisted = signal(false);
  readonly isAdmin = signal(false);
  readonly isOwner = signal(false);

  constructor() {
    const user$ = this.auth0.user$;
    user$.pipe(takeUntilDestroyed()).subscribe({
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
      await firstValueFrom(this.auth0.loginWithRedirect());
      
      // Get Auth0 token and exchange it with auth-service
      const auth0Token = await firstValueFrom(this.auth0.getAccessTokenSilently());
      await this.exchangeToken(auth0Token);
      
      return { user: this.currentUser()!, error: null };
    } catch (err: any) {
      this.error.set(err.message || "Sign in failed");
      this.isLoading.set(false);
      return { user: null as any, error: err };
    }
  }

  private async exchangeToken(auth0Token: string): Promise<void> {
    try {
      const response = await fetch('http://localhost:3001/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth0Token }),
      });

      if (!response.ok) {
        throw new Error('Token exchange failed');
      }

      const data: ExchangeResponse = await response.json();
      this.internalToken = data.accessToken;
      console.log('Token exchanged successfully');
    } catch (err) {
      console.error('Failed to exchange token:', err);
      throw err;
    }
  }

  async signUp(): Promise<{ user: MockUser; error: any }> {
    return this.signIn();
  }

  async signInWithGoogle(): Promise<{ user: MockUser; error: any }> {
    return this.signIn();
  }

  async getToken(): Promise<string | null> {
    // Return internal token if available, otherwise try to get Auth0 token
    if (this.internalToken) {
      return this.internalToken;
    }
    
    // If no internal token, try to exchange the Auth0 token
    try {
      const auth0Token = await firstValueFrom(this.auth0.getAccessTokenSilently());
      await this.exchangeToken(auth0Token);
      return this.internalToken;
    } catch (err) {
      console.error("Failed to get token:", err);
      return null;
    }
  }

  getInternalToken(): string | null {
    return this.internalToken;
  }

  async signOut(): Promise<{ error: any }> {
    this.internalToken = null;
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
    const user = this.currentUser();
    const state: UserState = {
      isAllowlisted: true,
      isOnboardingComplete: true,
      hasOrganization: true,
      hasFleet: true,
      organizationId: "mock-org-1",
    };

    this.isAllowlisted.set(state.isAllowlisted);
    this.isOnboardingComplete.set(state.isOnboardingComplete);
    return state;
  }

  async checkUserRoles(): Promise<void> {
    this.isAdmin.set(true);
    this.isOwner.set(true);
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
}
