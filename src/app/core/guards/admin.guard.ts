import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

/**
 * Admin guard — checks if user is fleet owner or admin.
 * For MVP, this is stubbed. Replace with actual role check when auth is implemented.
 */
export const adminGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  const { data: { session } } = await supabase.client.auth.getSession();
  
  if (!session?.user) {
    return router.createUrlTree(['/login']);
  }

  return true;
};

/**
 * Owner guard — checks if user is fleet owner.
 */
export const ownerGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  const { data: { session } } = await supabase.client.auth.getSession();
  
  if (!session?.user) {
    return router.createUrlTree(['/login']);
  }

  return true;
};
