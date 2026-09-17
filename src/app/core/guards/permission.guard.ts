import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ALL_PERMISSIONS, AuthService, Permission } from '../services/auth.service';

export function permissionGuard(perm: Permission): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.hasPermission(perm)) return true;

    const fallback = ALL_PERMISSIONS.find(p => auth.hasPermission(p));
    router.navigate([fallback ? '/' + fallback : '/auth/login']);
    return false;
  };
}
