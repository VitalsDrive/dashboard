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
 * onboardingGuard — ensures user has completed onboarding (org + fleet setup).
 * Redirects to /onboarding if setup is incomplete.
 * Should be used after authGuard.
 * Replaces allowlistGuard (D-13).
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
