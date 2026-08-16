import { Injectable } from '@angular/core';

const KEY = 'ed_return_url';

/** Guarda a dónde volver tras login/registro (flujo de compra). */
@Injectable({ providedIn: 'root' })
export class ReturnUrlService {
  set(url: string | null | undefined) {
    if (!url || url === '/' || url.startsWith('/admin') || url.startsWith('/login')) {
      sessionStorage.removeItem(KEY);
      return;
    }
    sessionStorage.setItem(KEY, url);
  }

  peek(): string | null {
    return sessionStorage.getItem(KEY);
  }

  /** Lee y limpia. Por defecto vuelve a la tienda (como en la app). */
  consume(fallback = '/'): string {
    const u = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!u || u.startsWith('/admin') || u === '/login' || u === '/registro') {
      return fallback;
    }
    return u;
  }

  clear() {
    sessionStorage.removeItem(KEY);
  }
}
