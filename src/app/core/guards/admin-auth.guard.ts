// src/app/core/guards/admin-auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';

export const adminAuthGuard: CanMatchFn = (): boolean | UrlTree => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  return auth.isAuthenticated()
    ? true
    : router.createUrlTree(['/admin/login']);   // 👈 redirección “oficial”
};
