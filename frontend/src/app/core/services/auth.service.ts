import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { MyMembership } from '../models';

const ACCESS_TOKEN_KEY = 'rm_access_token';
const REFRESH_TOKEN_KEY = 'rm_refresh_token';

interface TokenPair {
  access: string;
  refresh: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  readonly isAuthenticated = signal<boolean>(!!this.getAccessToken());
  readonly memberships = signal<MyMembership[]>([]);

  login(username: string, password: string): Observable<TokenPair> {
    return this.http
      .post<TokenPair>(`${environment.apiBaseUrl}/auth/token/`, { username, password })
      .pipe(
        tap((tokens) => {
          localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
          localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
          this.isAuthenticated.set(true);
        }),
      );
  }

  refreshAccessToken(): Observable<{ access: string }> {
    const refresh = this.getRefreshToken();
    return this.http
      .post<{ access: string }>(`${environment.apiBaseUrl}/auth/token/refresh/`, { refresh })
      .pipe(
        tap((response) => {
          localStorage.setItem(ACCESS_TOKEN_KEY, response.access);
        }),
      );
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.isAuthenticated.set(false);
    this.memberships.set([]);
  }

  loadMyMemberships(): Observable<MyMembership[]> {
    return this.http
      .get<{ results: MyMembership[] }>(`${environment.apiBaseUrl}/dashboard/restaurants/`)
      .pipe(
        map((response) => response.results),
        tap((memberships) => this.memberships.set(memberships)),
      );
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
}
