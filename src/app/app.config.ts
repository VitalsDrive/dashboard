import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideRouter,
  withViewTransitions,
} from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { HTTP_INTERCEPTORS, provideHttpClient } from '@angular/common/http';
import { provideAuth0 } from '@auth0/auth0-angular';

import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withViewTransitions()),
    provideAnimationsAsync(),
    provideHttpClient(),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    provideAuth0({
      domain: 'ronbiter.auth0.com',
      clientId: 'vlGLhmcqPYQWjWrHzC49fwYnJ54Segmk',
      authorizationParams: {
        audience: 'https://ronbiter.auth0.com/api/v2/',
        redirect_uri: window.location.origin,
        scope: 'openid profile email',
      },
      useRefreshTokens: true,
      cacheLocation: 'localstorage',
    }),
  ],
};