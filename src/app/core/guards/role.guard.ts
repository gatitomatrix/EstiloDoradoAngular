import { CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { SessionAdminStore } from '../state/session-admin.store';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const session = inject(SessionAdminStore);
  const required = (route.data['roles'] as string[]) || [];
  return session.hasAnyRole(required); // ahora lee de sessionStorage
};
