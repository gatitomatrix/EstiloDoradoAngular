import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionAdminStore {
  private storage = sessionStorage;
  private tokenKey = 'ed_admin_token';
  private rolesKey = 'ed_admin_roles';

  // ✅ usar sessionStorage (igual que AdminAuthService)
  isLoggedIn(): boolean { return !!sessionStorage.getItem(this.tokenKey); }

  hasAnyRole(roles: string[]): boolean {
    if (!roles?.length) return true; // si no pides roles, deja pasar
    const raw = sessionStorage.getItem(this.rolesKey) || '[]';
    try {
      const mine = JSON.parse(raw) as string[];
      return mine.some(r => roles.includes(r));
    } catch {
      return false;
    }
  }

  setSession(token: string, roles: string[]) {
    this.storage.setItem(this.tokenKey, token);
    this.storage.setItem(this.rolesKey, JSON.stringify(roles));
  }

  clear() {
    this.storage.removeItem(this.tokenKey);
    this.storage.removeItem(this.rolesKey);
  }
}
