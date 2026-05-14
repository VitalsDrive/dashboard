// Minimal mock for @angular/router (Jest unit tests)
import { of } from 'rxjs';

export class Router {
  navigate(_commands: any[], _extras?: any) { return Promise.resolve(true); }
  navigateByUrl(_url: string) { return Promise.resolve(true); }
  events = of();
  url = '/';
}

export class ActivatedRoute {
  snapshot = { params: {}, queryParams: {}, data: {} };
  params = of({});
  queryParams = of({});
  data = of({});
}

export function provideRouter(_routes: any[]) { return {}; }
export function withRouterConfig(_config: any) { return {}; }

export class RouterLink {}
export class RouterOutlet {}

export function inject(_token: any): any { return undefined; }
