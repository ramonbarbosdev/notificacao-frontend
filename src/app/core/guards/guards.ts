
// src/app/core/guards/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { TokenService } from '../auth/token.service';

export const authGuard: CanActivateFn = () => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (tokenService.existe() && !tokenService.estaExpirado()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};


export const organizationGuard: CanActivateFn = () => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (!tokenService.existe() || tokenService.estaExpirado()) {
    return router.createUrlTree(['/login']);
  }

  if (tokenService.tipoGlobal() || tokenService.role() === 'SUPER_ADMIN') {
    return true;
  }

  const idOrg = tokenService.idOrganizacao();
  if (!idOrg) {
    // Tem token mas sem organização — volta pra seleção
    return router.createUrlTree(['/selecionar-organizacao']);
  }
  return true;
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

  if (roleUsuario && rolesPermitidas.includes(roleUsuario)) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
