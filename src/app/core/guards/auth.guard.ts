import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { ReturnUrlService } from '../services/return-url.service';

export const authGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const returnUrl = inject(ReturnUrlService);

  if (auth.isLoggedIn) return true;

  returnUrl.set(state.url);
  // Home + modal de login (la barra superior escucha el evento)
  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent('ed-open-login'));
  });
  router.navigateByUrl('/');
  return false;
};
