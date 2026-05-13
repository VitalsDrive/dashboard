import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const token = this.authService.getInternalToken();
    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // D-03: on 401, attempt one token refresh — but skip if request is the refresh call itself
        // to prevent infinite retry loops (T-02-03-03)
        if (error.status === 401 && !req.url.includes('/auth/refresh')) {
          return from(this.authService.refreshTokens()).pipe(
            switchMap(() => {
              const newToken = this.authService.getInternalToken();
              const retryReq = newToken
                ? req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })
                : req;
              return next.handle(retryReq);
            }),
            catchError((refreshError) => {
              // Refresh failed — sign out and propagate error
              this.authService.signOut();
              return throwError(() => refreshError);
            }),
          );
        }

        return throwError(() => error);
      }),
    );
  }
}
