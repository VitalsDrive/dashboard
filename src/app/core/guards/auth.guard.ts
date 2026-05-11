import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { OrganizationService } from '../services/organization.service';
import { FleetService } from '../services/fleet.service';

const authCheck = async (): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  while (auth.isLoading()) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

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
 * allowlistGuard — ensures user has organization membership.
 * Redirects to /onboarding if user has no org or incomplete setup.
 * This guard is now equivalent to onboardingGuard (allowlist concept was replaced by org membership).
 * Kept for backwards compatibility - consider removing and using onboardingGuard only.
 */
export const allowlistGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  while (auth.isLoading()) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  if (!auth.isAllowlisted()) {
    return router.createUrlTree(['/onboarding']);
  }

  return true;
};

/**
 * onboardingGuard — ensures user has completed onboarding.
 * Redirects to /onboarding if org/fleet setup is incomplete.
 * Should be used after authGuard.
 */
export const onboardingGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  while (auth.isLoading()) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  if (!auth.isOnboardingComplete()) {
    return router.createUrlTree(['/onboarding']);
  }

  return true;
};

/**
 * onboardingStepGuard — prevents skipping ahead in the onboarding flow.
 * If authenticated but no org → allow only /onboarding/organization
 * If authenticated + org but no fleets → allow only /onboarding/fleet
 * If authenticated + org + fleets → redirect to /dashboard
 * If not authenticated → redirect to /login
 */
export const onboardingStepGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const organizationService = inject(OrganizationService);
  const fleetService = inject(FleetService);

  while (auth.isLoading()) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  await organizationService.loadOrganizations();
  const orgs = organizationService.organizations();

  if (orgs.length === 0) {
    const targetPath = route.routeConfig?.path;
    if (targetPath !== 'organization') {
      return router.createUrlTree(['/onboarding/organization']);
    }
    return true;
  }

  if (!organizationService.selectedOrganization()) {
    organizationService.selectOrganization(orgs[0].id);
  }

  await fleetService.loadFleets();
  const fleets = fleetService.fleets();

  if (fleets.length === 0) {
    const targetPath = route.routeConfig?.path;
    if (targetPath !== 'fleet') {
      return router.createUrlTree(['/onboarding/fleet']);
    }
    return true;
  }

  await auth.completeOnboarding();

  return router.createUrlTree(['/dashboard']);
};
