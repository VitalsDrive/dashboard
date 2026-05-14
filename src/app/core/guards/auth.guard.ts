import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { OrganizationService } from '../services/organization.service';
import { FleetService } from '../services/fleet.service';

const waitForAuth = async (auth: AuthService): Promise<void> => {
  const TIMEOUT_MS = 5000;
  const POLL_MS = 50;
  let elapsed = 0;
  // Phase 1: wait for Auth0 SDK to finish processing the callback redirect
  while ((auth.isAuth0Loading() || auth.isLoading()) && elapsed < TIMEOUT_MS) {
    await new Promise(resolve => setTimeout(resolve, POLL_MS));
    elapsed += POLL_MS;
  }
  // Phase 2: if authenticated, wait for token exchange + state init to complete
  if (auth.isAuthenticated()) {
    elapsed = 0;
    while (!auth.isInitialized() && elapsed < TIMEOUT_MS) {
      await new Promise(resolve => setTimeout(resolve, POLL_MS));
      elapsed += POLL_MS;
    }
  }
};

const authCheck = async (): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await waitForAuth(auth);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  return true;
};

/**
 * authGuard — ensures user is authenticated.
 * Redirects to /login if no session.
 */
export const authGuard: CanActivateFn = authCheck;

/**
 * authGuardChild — ensures child routes are accessed by authenticated users.
 * Redirects to /login if no session.
 */
export const authGuardChild: CanActivateChildFn = authCheck;

/**
 * onboardingGuard — ensures user has completed onboarding (org + fleet setup).
 * Redirects to /onboarding if setup is incomplete.
 * Should be used after authGuard.
 * Replaces allowlistGuard (D-13).
 */
export const onboardingGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const organizationService = inject(OrganizationService);
  const fleetService = inject(FleetService);

  await waitForAuth(auth);

  // Fast path: already confirmed during init or a previous guard run
  if (auth.isOnboardingComplete()) return true;

  // Fallback: load orgs+fleets if not yet cached (covers direct navigation after
  // onboarding flow where onboardingStepGuard didn't re-run for child routes).
  await organizationService.loadOrganizations();
  if (organizationService.organizations().length > 0) {
    await fleetService.loadFleets();
    if (fleetService.fleets().length > 0) {
      auth.markOnboardingComplete();
      return true;
    }
  }

  console.log('[onboardingGuard] not complete → /onboarding');
  return router.createUrlTree(['/onboarding']);
};

/**
 * onboardingStepGuard — prevents skipping ahead in the onboarding flow.
 * If authenticated but no org → allow only /onboarding/organization
 * If authenticated + org but no fleets → allow only /onboarding/fleet
 * If authenticated + org + fleets → redirect to /dashboard
 * If not authenticated → redirect to /login
 */
export const onboardingStepGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const organizationService = inject(OrganizationService);
  const fleetService = inject(FleetService);

  await waitForAuth(auth);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  await organizationService.loadOrganizations();
  const orgs = organizationService.organizations();
  console.log('[onboardingStepGuard] orgs:', orgs);

  if (orgs.length === 0) {
    if (state.url.startsWith('/onboarding/organization')) return true;
    console.log('[onboardingStepGuard] no orgs → /onboarding/organization');
    return router.createUrlTree(['/onboarding/organization']);
  }

  if (!organizationService.selectedOrganization()) {
    organizationService.selectOrganization(orgs[0].id);
  }
  console.log('[onboardingStepGuard] selectedOrg:', organizationService.selectedOrganization()?.id);

  await fleetService.loadFleets();
  const fleets = fleetService.fleets();
  console.log('[onboardingStepGuard] fleets:', fleets);

  if (fleets.length === 0) {
    if (state.url.startsWith('/onboarding/fleet')) return true;
    console.log('[onboardingStepGuard] no fleets → /onboarding/fleet');
    return router.createUrlTree(['/onboarding/fleet']);
  }

  // Allow vehicle step — optional final onboarding step with a skip link
  if (state.url.startsWith('/onboarding/vehicle') || state.url.startsWith('/onboarding/complete')) {
    return true;
  }

  console.log('[onboardingStepGuard] org+fleet confirmed → markOnboardingComplete, /dashboard');
  // Guard has already confirmed org+fleet exist — set state directly, no re-query.
  auth.markOnboardingComplete();

  return router.createUrlTree(['/dashboard']);
};
