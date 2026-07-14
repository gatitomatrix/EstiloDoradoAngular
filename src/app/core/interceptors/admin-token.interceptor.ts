// src/app/core/interceptors/admin-token.interceptor.ts
// src/app/core/interceptors/admin-token.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const ADMIN_TOKEN_KEY = 'ed_admin_token';

// Solo agrega Authorization a rutas /api/admin
export const adminTokenInterceptor: HttpInterceptorFn = (req, next) => {
  try {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    const adminBase = `${environment.apiBaseUrl}/admin`; // p.ej. http://127.0.0.1:8000/api/admin

    // Soporta URLs absolutas y relativas
    const url = (() => {
      try { return new URL(req.url).href; } catch { return req.url; }
    })();

    if (token && (url.startsWith(adminBase) || url.includes('/api/admin/'))) {
      const cloned = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
      return next(cloned);
    }
  } catch { /* ignore */ }

  return next(req);
};
