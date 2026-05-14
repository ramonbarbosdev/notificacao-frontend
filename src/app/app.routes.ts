
import { Routes } from '@angular/router';
import { authGuard, organizationGuard, roleGuard } from './core/guards/guards';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },

  {
    path: 'selecionar-organizacao',
    loadComponent: () =>
      import('./features/selecionar-organizacao/selecionar-organizacao.component').then(
        (m) => m.SelecionarOrganizacaoComponent
      ),
  },

  {
    path: 'dashboard',
    canActivate: [authGuard, organizationGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },

  {
    path: 'whatsapp',
    canActivate: [authGuard, organizationGuard],
    loadComponent: () =>
      import('./features/whatsapp/whatsapp.component').then((m) => m.WhatsappComponent),
  },

  {
    path: 'notificacoes',
    canActivate: [authGuard, organizationGuard],
    loadComponent: () =>
      import('./features/notificacoes/notificacoes.component').then(
        (m) => m.NotificacoesComponent
      ),
  },

  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['SUPER_ADMIN'] },
    loadComponent: () =>
      import('./features/admin/admin.component').then((m) => m.AdminComponent),
  },

  { path: '**', redirectTo: '/login' },
];
