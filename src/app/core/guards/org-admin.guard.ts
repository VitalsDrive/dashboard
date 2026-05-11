import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { OrganizationService } from '../services/organization.service';
import { SupabaseService } from '../services/supabase.service';

export const orgAdminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const organizationService = inject(OrganizationService);
  const supabase = inject(SupabaseService);

  while (auth.isLoading()) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  const currentUser = auth.currentUser();
  if (!currentUser) {
    return false;
  }

  const currentOrg = organizationService.selectedOrganization();
  if (!currentOrg) {
    return false;
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
