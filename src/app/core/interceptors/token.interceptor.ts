// src/app/core/interceptors/token.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const CLIENT_TOKEN_KEY = 'ed_auth_token';

/**
 * Interceptor para TOKEN de CLIENTE.
 * - Aplica a TODAS las rutas del API que NO sean /admin
 * - Excluye solo los endpoints públicos de auth cliente
 */
const PUBLIC_AUTH_ENDPOINTS = [
  '/auth/check-email',
  '/auth/password/forgot',
  '/auth/password/reset',
  '/auth/password/reset-simple',
  '/auth/register',
  '/auth/login',
  '/auth/google',
];

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  try {
    const apiBase = environment.apiBaseUrl; // ej: http://127.0.0.1:8000/api
    const url = new URL(req.url, window.location.origin);
    const path = url.pathname; // ej: /api/pedidos/confirmar

    // No tocar /api/admin (eso lo maneja el interceptor de admin)
    const isAdminRoute = req.url.startsWith(`${apiBase}/admin`);
    if (isAdminRoute) {
      return next(req);
    }

    // Endpoints públicos de auth (cliente)
    const isPublic = PUBLIC_AUTH_ENDPOINTS.some(ep => path.includes(ep));
    if (isPublic) {
      return next(req);
    }

    // Token de CLIENTE (localStorage o sessionStorage por si acaso)
    const token =
      localStorage.getItem(CLIENT_TOKEN_KEY) ??
      sessionStorage.getItem(CLIENT_TOKEN_KEY);

    if (token) {
      const cloned = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
      return next(cloned);
    }
  } catch {
    // no-op
  }
  return next(req);
};
