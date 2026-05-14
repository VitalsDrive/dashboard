// Minimal mock for @auth0/auth0-angular (Jest unit tests)
import { of } from 'rxjs';

export class AuthService {
  isAuthenticated$ = of(false);
  user$ = of(null);
  isLoading$ = of(false);
  loginWithRedirect(_opts?: any) { return Promise.resolve(); }
  logout(_opts?: any) { return Promise.resolve(); }
  getAccessTokenSilently(_opts?: any) { return of('mock-token'); }
}

export interface User {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  [key: string]: any;
}

export function provideAuth0(_config: any) { return {}; }
