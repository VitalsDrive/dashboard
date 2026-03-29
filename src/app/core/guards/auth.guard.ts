import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Auth guard — stubbed for MVP.
 * Always returns true. Replace with Supabase Auth check when auth is implemented.
 */
export const authGuard: CanActivateFn = () => {
  // TODO: Implement Supabase Auth check
  // const supabase = inject(SupabaseService);
  // const router = inject(Router);
  // const session = await supabase.client.auth.getSession();
  // if (!session.data.session) return router.createUrlTree(['/login']);
  return true;
};
