// Minimal mock for @angular/common/http (Jest unit tests)
import { of } from 'rxjs';

export class HttpClient {
  get<T = any>(_url: string, _opts?: any) { return of({} as T); }
  post<T = any>(_url: string, _body: any, _opts?: any) { return of({} as T); }
  put<T = any>(_url: string, _body: any, _opts?: any) { return of({} as T); }
  delete<T = any>(_url: string, _opts?: any) { return of({} as T); }
}

export function provideHttpClient() { return {}; }
export function withInterceptors(_interceptors: any[]) { return {}; }
export function withFetch() { return {}; }
