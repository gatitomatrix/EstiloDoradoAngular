import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { mergeApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { tokenInterceptor } from './app/core/interceptors/token.interceptor';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { adminTokenInterceptor } from './app/core/interceptors/admin-token.interceptor';

import { DOCUMENT } from '@angular/common';

// 👇 PrimeNG global (una sola vez)
import { providePrimeNG } from 'primeng/config';
import Lara from '@primeuix/themes/lara';
import { MessageService, ConfirmationService } from 'primeng/api';

(() => {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const isReload = nav?.type === 'reload';
  if (isReload) return;

  const path = (window.location?.pathname || '').toLowerCase();

  if (path.startsWith('/panel-ed-k7m2')) {
    const ADMIN_KEYS = ['ed_admin_token', 'ed_admin_roles', 'ed_admin_user'];
    ADMIN_KEYS.forEach(k => { try { sessionStorage.removeItem(k); } catch {} });
  } else {
    const LEGACY_KEYS = ['auth','auth_token','token','user','ed_auth','ed_user','jwt','access_token','refresh_token'];
    LEGACY_KEYS.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
      try { sessionStorage.removeItem(k); } catch {}
    });
  }
})();

const extra = {
  providers: [
    provideAnimations(),
    { provide: DOCUMENT, useValue: document },

    // ✅ PrimeNG global (evita duplicados y NG0912)
    providePrimeNG({
      theme: {
        preset: Lara,
        options: { cssLayer: { name: 'primeng', order: 'app-styles, primeng' } }
      },
      ripple: true
    }),
    MessageService,
    ConfirmationService,

    provideHttpClient(withInterceptors([
      tokenInterceptor,       // cliente
      adminTokenInterceptor,  // admin
    ])),
  ]
};

bootstrapApplication(
  AppComponent,
  mergeApplicationConfig(appConfig, extra)
).catch(console.error);
