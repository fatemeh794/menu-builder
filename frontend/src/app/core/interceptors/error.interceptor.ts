import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

/** On a 401 from a dashboard call, try one silent refresh-and-retry before
 * giving up and sending the staff member back to login. Public/guest
 * endpoints never 401 (they don't require auth), so this only ever
 * triggers for the staff dashboard. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isDashboardRequest = req.url.includes('/dashboard/');
      const isRefreshCall = req.url.includes('/auth/token/refresh/');

      if (error.status === 401 && isDashboardRequest && !isRefreshCall) {
        return authService.refreshAccessToken().pipe(
          switchMap(() => {
            const token = authService.getAccessToken();
            return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
          }),
          catchError((refreshError) => {
            authService.logout();
            router.navigate(['/staff/login']);
            return throwError(() => refreshError);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
