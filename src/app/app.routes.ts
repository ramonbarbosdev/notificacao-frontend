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
    path: 'app',
    canActivate: [authGuard, organizationGuard],
    loadComponent: () =>
      import('./core/layout/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'whatsapp',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'USER'] },
        loadComponent: () =>
          import('./features/whatsapp/whatsapp.component').then((m) => m.WhatsappComponent),
      },
      {
        path: 'notificacoes',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'USER'] },
        loadComponent: () =>
          import('./features/notificacoes/notificacoes.component').then((m) => m.NotificacoesComponent),
      },
      {
        path: 'contatos',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'USER'] },
        loadComponent: () =>
          import('./features/contatos/contatos.component').then((m) => m.ContatosComponent),
      },
      {
        path: 'templates',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'USER'] },
        loadComponent: () =>
          import('./features/templates/templates.component').then((m) => m.TemplatesComponent),
      },
      {
        path: 'tutorial',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'USER'] },
        loadComponent: () =>
          import('./features/tutorial/tutorial.component').then((m) => m.TutorialComponent),
      },
      {
        path: 'historico',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'USER'] },
        loadComponent: () =>
          import('./features/historico-fila/historico-fila.component').then((m) => m.HistoricoFilaComponent),
      },
      {
        path: 'fila',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'USER'] },
        loadComponent: () =>
          import('./features/historico-fila/historico-fila.component').then((m) => m.HistoricoFilaComponent),
      },
      {
        path: 'configuracoes',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'USER'] },
        loadComponent: () =>
          import('./features/configuracoes/configuracoes-organizacao.component').then(
            (m) => m.ConfiguracoesOrganizacaoComponent
          ),
      },
      {
        path: 'auditoria',
        canActivate: [adminOnlyGuard],
        loadComponent: () =>
          import('./features/auditoria/auditoria.component').then((m) => m.AuditoriaComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  {
    path: 'admin',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () =>
      import('./core/layout/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/admin.component').then((m) => m.AdminComponent),
      },
      {
        path: 'organizacoes',
        loadComponent: () =>
          import('./features/admin/nova-organizacao/nova-organizacao.component').then(
            (m) => m.NovaOrganizacaoComponent
          ),
      },
      {
        path: 'planos',
        loadComponent: () =>
          import('./features/admin/planos/planos.component').then((m) => m.PlanosComponent),
      },
      {
        path: 'configuracoes',
        loadComponent: () =>
          import('./features/admin/configuracoes-globais/configuracoes-globais.component').then(
            (m) => m.ConfiguracoesGlobaisComponent
          ),
      },
      {
        path: 'features',
        loadComponent: () =>
          import('./features/admin/feature-flags/feature-flags.component').then(
            (m) => m.FeatureFlagsComponent
          ),
      },
      {
        path: 'auditoria',
        loadComponent: () =>
          import('./features/admin/auditoria-global/auditoria-global.component').then(
            (m) => m.AuditoriaGlobalComponent
          ),
      },
      {
        path: 'monitoramento',
        loadComponent: () =>
          import('./features/admin/monitoramento/monitoramento.component').then(
            (m) => m.MonitoramentoComponent
          ),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/admin/usuarios-organizacao/usuarios-organizacao.component').then(
            (m) => m.UsuariosOrganizacaoComponent
          ),
      },
      {
        path: 'definir-admin',
        loadComponent: () =>
          import('./features/admin/usuarios-organizacao/usuarios-organizacao.component').then(
            (m) => m.UsuariosOrganizacaoComponent
          ),
      },
      {
        path: 'roles',
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN'] },
        loadComponent: () =>
          import('./features/admin/admin.component').then((m) => m.AdminComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  { path: 'dashboard', redirectTo: '/app/dashboard' },
  { path: 'whatsapp', redirectTo: '/app/whatsapp' },
  { path: 'notificacoes', redirectTo: '/app/notificacoes' },
  { path: 'contatos', redirectTo: '/app/contatos' },
  { path: 'templates', redirectTo: '/app/templates' },
  { path: 'tutorial', redirectTo: '/app/tutorial' },
  { path: 'historico', redirectTo: '/app/historico' },
  { path: 'fila', redirectTo: '/app/fila' },
  { path: 'configuracoes', redirectTo: '/app/configuracoes' },

  { path: '**', redirectTo: '/login' },
];
