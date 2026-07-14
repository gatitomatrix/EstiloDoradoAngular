// src/app/core/services/admin-auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap, switchMap, map, finalize } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

const ADMIN_TOKEN_KEY = 'ed_admin_token';
const ADMIN_USER_KEY = 'ed_admin_user';
const ADMIN_ROLES_KEY = 'ed_admin_roles';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/admin/auth`;

  // ====== STORAGE ======
  private setSession(token: string, user: any, roles: string[]) {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
    sessionStorage.setItem(ADMIN_ROLES_KEY, JSON.stringify(roles ?? []));
  }
  private setTokenOnly(token: string) {
    if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  }
  clearSession() {
    [sessionStorage, localStorage].forEach(s => {
      try { s.removeItem(ADMIN_TOKEN_KEY); } catch { }
      try { s.removeItem(ADMIN_USER_KEY); } catch { }
      try { s.removeItem(ADMIN_ROLES_KEY); } catch { }
    });
  }

  getToken(): string | null { return sessionStorage.getItem(ADMIN_TOKEN_KEY); }
  getRoles(): string[] { try { return JSON.parse(sessionStorage.getItem(ADMIN_ROLES_KEY) || '[]'); } catch { return []; } }
  isAuthenticated(): boolean { return !!this.getToken(); }

  // ====== API ======
  login(payload: { email: string; password: string }) {
    return this.http.post<any>(`${this.base}/login`, payload);
  }
  me() { return this.http.get<any>(`${this.base}/me`); }
  logout() {
    // Limpia la sesión SIEMPRE, independientemente de si el backend responde OK o falla.
    return this.http.post(`${this.base}/logout`, {}).pipe(
      finalize(() => this.clearSession())
    );
  }

  // ====== FLOW RECOMENDADO ======
  /** Hace login, guarda token temporal, consulta /me, persiste user+roles */
  loginAndBootstrap(payload: { email: string; password: string }): Observable<void> {
    return this.login(payload).pipe(
      tap((res) => {
        const token = res?.token || res?.access_token || res?.data?.token || '';
        this.clearSession();        // limpia restos viejos
        this.setTokenOnly(token);   // para que el interceptor mande Bearer en /me
      }),
      switchMap(() => this.me()),
      tap((meRes) => {
        const token = this.getToken() || '';
        const user = meRes?.user ?? meRes;
        const roles = this.extractRoles(user, meRes?.roles);
        this.clearSession();
        this.setSession(token, user, roles);
      }),
      map(() => void 0)
    );
  }

  /** Intenta armar roles desde payloads típicos: roles[] o user.cargo */
  private extractRoles(user: any, rolesFromMe?: any[]): string[] {
    if (Array.isArray(rolesFromMe) && rolesFromMe.length) {
      return rolesFromMe
        .map((r: any) => (typeof r === 'string' ? r : (r?.nombre ?? r?.name ?? r?.cargo ?? '')))
        .filter(Boolean).map((s: string) => s.toUpperCase());
    }
    if (Array.isArray(user?.roles) && user.roles.length) {
      return user.roles
        .map((r: any) => (typeof r === 'string' ? r : (r?.nombre ?? r?.name ?? r?.cargo ?? '')))
        .filter(Boolean).map((s: string) => s.toUpperCase());
    }
    if (user?.cargo) return [String(user.cargo).toUpperCase()];
    return [];
  }

  /** Aún la puedes usar si ya tienes todo junto en una sola respuesta */
  persistLogin(res: any) {
    const token = res?.token || res?.access_token || '';
    const user = res?.user ?? {};
    const roles = this.extractRoles(user, res?.roles);
    this.clearSession();
    this.setSession(token, user, roles);
  }
}
