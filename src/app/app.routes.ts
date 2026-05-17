import { Routes } from '@angular/router';
import {
  adminOnlyGuard,
  authGuard,
  organizationGuard,
  roleGuard,
  superAdminGuard,
} from './core/guards/guards';

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
    path: 'app/dashboard',
    canActivate: [authGuard, organizationGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },

  {
    path: 'app/whatsapp',
    canActivate: [authGuard, organizationGuard, roleGuard],
    data: { roles: ['ADMIN', 'USER'] },
    loadComponent: () =>
      import('./features/whatsapp/whatsapp.component').then((m) => m.WhatsappComponent),
  },

  {
    path: 'app/notificacoes',
    canActivate: [authGuard, organizationGuard, roleGuard],
    data: { roles: ['ADMIN', 'USER'] },
    loadComponent: () =>
      import('./features/notificacoes/notificacoes.component').then(
        (m) => m.NotificacoesComponent
      ),
  },

  {
    path: 'app/contatos',
    canActivate: [authGuard, organizationGuard, roleGuard],
    data: { roles: ['ADMIN', 'USER'] },
    loadComponent: () =>
      import('./features/contatos/contatos.component').then((m) => m.ContatosComponent),
  },

  {
    path: 'app/templates',
    canActivate: [authGuard, organizationGuard, roleGuard],
    data: { roles: ['ADMIN', 'USER'] },
    loadComponent: () =>
      import('./features/templates/templates.component').then((m) => m.TemplatesComponent),
  },

  {
    path: 'app/historico',
    canActivate: [authGuard, organizationGuard, roleGuard],
    data: { roles: ['ADMIN', 'USER'] },
    loadComponent: () =>
      import('./features/historico-fila/historico-fila.component').then(
        (m) => m.HistoricoFilaComponent
      ),
  },

  {
    path: 'app/fila',
    canActivate: [authGuard, organizationGuard, roleGuard],
    data: { roles: ['ADMIN', 'USER'] },
    loadComponent: () =>
      import('./features/historico-fila/historico-fila.component').then(
        (m) => m.HistoricoFilaComponent
      ),
  },

  {
    path: 'app/configuracoes',
    canActivate: [authGuard, organizationGuard, roleGuard],
    data: { roles: ['ADMIN', 'USER'] },
    loadComponent: () =>
      import('./features/configuracoes/configuracoes-organizacao.component').then(
        (m) => m.ConfiguracoesOrganizacaoComponent
      ),
  },

  {
    path: 'app/auditoria',
    canActivate: [authGuard, organizationGuard, adminOnlyGuard],
    loadComponent: () => import('./features/auditoria/auditoria.component').then((m) => m.AuditoriaComponent),
  },

  {
    path: 'admin/dashboard',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () =>
      import('./features/admin/admin.component').then((m) => m.AdminComponent),
  },

  {
    path: 'admin/organizacoes',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () =>
      import('./features/admin/nova-organizacao/nova-organizacao.component').then(
        (m) => m.NovaOrganizacaoComponent
      ),
  },

  {
    path: 'admin/planos',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () => import('./features/admin/planos/planos.component').then((m) => m.PlanosComponent),
  },

  {
    path: 'admin/configuracoes',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () =>
      import('./features/admin/configuracoes-globais/configuracoes-globais.component').then(
        (m) => m.ConfiguracoesGlobaisComponent
      ),
  },

  {
    path: 'admin/features',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () =>
      import('./features/admin/feature-flags/feature-flags.component').then(
        (m) => m.FeatureFlagsComponent
      ),
  },

  {
    path: 'admin/auditoria',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () =>
      import('./features/admin/auditoria-global/auditoria-global.component').then(
        (m) => m.AuditoriaGlobalComponent
      ),
  },

  {
    path: 'admin/monitoramento',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () =>
      import('./features/admin/monitoramento/monitoramento.component').then(
        (m) => m.MonitoramentoComponent
      ),
  },

  {
    path: 'admin/usuarios',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () =>
      import('./features/admin/usuarios-organizacao/usuarios-organizacao.component').then(
        (m) => m.UsuariosOrganizacaoComponent
      ),
  },

  {
    path: 'admin/definir-admin',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () =>
      import('./features/admin/usuarios-organizacao/usuarios-organizacao.component').then(
        (m) => m.UsuariosOrganizacaoComponent
      ),
  },

  {
    path: 'admin/roles',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['SUPER_ADMIN'] },
    loadComponent: () =>
      import('./features/admin/admin.component').then((m) => m.AdminComponent),
  },

  { path: 'admin', pathMatch: 'full', redirectTo: '/admin/dashboard' },
  { path: 'app', pathMatch: 'full', redirectTo: '/app/dashboard' },

  // Compatibilidade com rotas antigas.
  { path: 'dashboard', redirectTo: '/app/dashboard' },
  { path: 'whatsapp', redirectTo: '/app/whatsapp' },
  { path: 'notificacoes', redirectTo: '/app/notificacoes' },
  { path: 'contatos', redirectTo: '/app/contatos' },
  { path: 'templates', redirectTo: '/app/templates' },
  { path: 'historico', redirectTo: '/app/historico' },
  { path: 'fila', redirectTo: '/app/fila' },
  { path: 'configuracoes', redirectTo: '/app/configuracoes' },

  { path: '**', redirectTo: '/login' },
];
