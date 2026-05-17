
// src/app/core/guards/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { TokenService } from '../auth/token.service';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = () => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (tokenService.existe() && !tokenService.estaExpirado()) {
    return true;
  }

  if (authService.possuiSelecaoOrganizacaoPendente()) {
    return router.createUrlTree(['/selecionar-organizacao']);
  }

  return router.createUrlTree(['/login']);
};


export const organizationGuard: CanActivateFn = () => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (!tokenService.existe() || tokenService.estaExpirado()) {
    return router.createUrlTree(['/login']);
  }

  if (tokenService.isSuperAdmin()) {
    return router.createUrlTree(['/admin/dashboard']);
  }

  const idOrg = tokenService.idOrganizacao();
  if (!idOrg) {
    // Tem token mas sem organização — volta pra seleção
    return router.createUrlTree(['/selecionar-organizacao']);
  }
  return true;
};

export const superAdminGuard: CanActivateFn = () => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (!tokenService.existe() || tokenService.estaExpirado()) {
    return router.createUrlTree(['/login']);
  }

  if (tokenService.isSuperAdmin()) {
    return true;
  }

  return router.createUrlTree([
    tokenService.idOrganizacao() ? '/app/dashboard' : '/selecionar-organizacao',
  ]);
};



/**
 * Uso na rota:
 *   canActivate: [roleGuard],
 *   data: { roles: ['SUPER_ADMIN'] }
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  const rolesPermitidas: string[] = route.data['roles'] ?? [];
  const roleUsuario = tokenService.role();

  if (rolesPermitidas.includes('SUPER_ADMIN') && tokenService.isSuperAdmin()) {
    return true;
  }

  if (roleUsuario && rolesPermitidas.includes(roleUsuario)) {
    return true;
  }
  return router.createUrlTree([
    tokenService.isSuperAdmin() ? '/admin/dashboard' : '/app/dashboard',
  ]);
};

export const adminOnlyGuard: CanActivateFn = () => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (!tokenService.existe() || tokenService.estaExpirado()) {
    return router.createUrlTree(['/login']);
  }

  if (tokenService.role() === 'ADMIN') {
    return true;
  }

  return router.createUrlTree(['/app/dashboard']);
};
