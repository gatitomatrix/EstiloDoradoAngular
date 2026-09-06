import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const redirectIfLoggedGuard: CanActivateFn = () => {
  const token = sessionStorage.getItem('ed_admin_token');
  if (token) {
    inject(Router).navigate(['/panel-ed-k7m2','dashboard'], { replaceUrl: true });
    return false;
  }
  return true;
};