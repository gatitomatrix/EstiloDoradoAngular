import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id_cliente: number;
  nombre: string;
  apellido: string | null;
  telefono?: string | null;
  direccion?: string | null;
  email: string;
}

interface LoginResp {
  cliente: AuthUser;
  token: string;
  rehash?: boolean;
}

interface RegisterResp {
  cliente: AuthUser;
  token: string;
}

const API = environment.apiBaseUrl;
const KEYU = 'ed_auth_user';
const KEYT = 'ed_auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private _user$ = new BehaviorSubject<AuthUser | null>(loadUser());
  user$ = this._user$.asObservable();

  get user() {
    return this._user$.value;
  }

  get isLoggedIn() {
    return !!localStorage.getItem(KEYT);
  }

  register(p: {
    nombre: string;
    apellido?: string;
    telefono?: string;
    direccion?: string;
    email: string;
    contrasena: string;
  }): Observable<RegisterResp> {
    return this.http.post<RegisterResp>(`${API}/auth/register`, p)
      .pipe(tap(r => persist(r.cliente, r.token, this._user$)));
  }

  login(email: string, contrasena: string): Observable<LoginResp> {
    return this.http.post<LoginResp>(`${API}/auth/login`, { email, contrasena })
      .pipe(tap(r => persist(r.cliente, r.token, this._user$)));
  }

  me(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${API}/auth/me`)
      .pipe(tap(u => saveUser(u, this._user$)));
  }

  updateMe(p: {
    nombre: string;
    apellido?: string;
    telefono?: string;
    direccion?: string;
  }): Observable<AuthUser> {
    return this.http.put<AuthUser>(`${API}/auth/me`, p)
      .pipe(tap(u => saveUser(u, this._user$)));
  }

  logout(): Observable<any> {
    return this.http.post(`${API}/auth/logout`, {})
      .pipe(tap(() => clear(this._user$)));
  }

  /**
   * ✅ Verifica si el token almacenado sigue siendo válido.
   * Si no lo es, limpia la sesión automáticamente.
   */
  checkAuth() {
    const token = localStorage.getItem(KEYT);
    if (!token) {
      this.forceLogout();
      return;
    }

    this.http.get<AuthUser>(`${API}/auth/me`).subscribe({
      next: (user) => saveUser(user, this._user$),
      error: () => this.forceLogout()
    });
  }

  /**
   * 🔒 Fuerza logout local sin llamar al backend
   */
  private forceLogout() {
    localStorage.removeItem(KEYT);
    localStorage.removeItem(KEYU);
    this._user$.next(null);
  }
}

/* ===== Helpers internos ===== */
function persist(user: AuthUser, token: string, s: BehaviorSubject<AuthUser | null>) {
  localStorage.setItem(KEYT, token);
  saveUser(user, s);
}

function saveUser(user: AuthUser, s: BehaviorSubject<AuthUser | null>) {
  localStorage.setItem(KEYU, JSON.stringify(user));
  s.next(user);
}

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(KEYU);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clear(s: BehaviorSubject<AuthUser | null>) {
  localStorage.removeItem(KEYT);
  localStorage.removeItem(KEYU);
  s.next(null);
}
