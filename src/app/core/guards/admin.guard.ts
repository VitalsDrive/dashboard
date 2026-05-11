import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { OrganizationService } from '../services/organization.service';
import { SupabaseService } from '../services/supabase.service';

/**
 * adminGuard — ensures user has admin/owner role in their organization.
 * Redirects to /dashboard if user is not an admin.
 * Should be used after authGuard and allowlistGuard.
 */
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const organizationService = inject(OrganizationService);
  const supabase = inject(SupabaseService);

  while (auth.isLoading()) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  const currentUser = auth.currentUser();
  if (!currentUser) {
    return router.createUrlTree(['/dashboard']);
  }

  const currentOrg = organizationService.selectedOrganization();
  if (!currentOrg) {
    return router.createUrlTree(['/dashboard']);
  }

  const { data, error } = await supabase.client
    .from('fleet_members')
    .select('role')
    .eq('user_id', currentUser.id)
    .eq('organization_id', currentOrg.id)
    .in('role', ['owner', 'admin'])
    .maybeSingle();

  if (error || !data) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};

/**
 * ownerGuard — ensures user has owner role in their organization.
 */
export const ownerGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const organizationService = inject(OrganizationService);
  const supabase = inject(SupabaseService);

  while (auth.isLoading()) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  const currentUser = auth.currentUser();
  if (!currentUser) {
    return router.createUrlTree(['/dashboard']);
  }

  const currentOrg = organizationService.selectedOrganization();
  if (!currentOrg) {
    return router.createUrlTree(['/dashboard']);
  }

  const { data, error } = await supabase.client
    .from('fleet_members')
    .select('role')
    .eq('user_id', currentUser.id)
    .eq('organization_id', currentOrg.id)
    .eq('role', 'owner')
    .maybeSingle();

  if (error || !data) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
