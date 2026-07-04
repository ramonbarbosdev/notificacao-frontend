import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  Bell,
  BookOpen,
  Building2,
  ClipboardList,
  Flag,
  History,
  LayoutDashboard,
  LogOut,
  LucideAngularModule,
  LucideIconData,
  MessageCircle,
  MessageSquareText,
  Package,
  Send,
  Settings,
  Shield,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-angular';
import { AuthService } from '../auth/auth.service';
import { LayoutService } from './layout.service';

interface NavItem {
  label: string;
  rota: string;
  icon: LucideIconData;
  scope: 'ADMIN_GLOBAL' | 'ORG';
  roles?: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './layout.component.html',
})
export class SidebarComponent {
  readonly authService = inject(AuthService);
  readonly layout = inject(LayoutService);
  readonly brandIcon = Bell;
  readonly logoutIcon = LogOut;
  readonly closeIcon = X;

  readonly navItems: NavItem[] = [
    {
      label: 'Dashboard Global',
      rota: '/admin/dashboard',
      icon: LayoutDashboard,
      scope: 'ADMIN_GLOBAL',
    },
    {
      label: 'Nova Organização',
      rota: '/admin/organizacoes',
      icon: Building2,
      scope: 'ADMIN_GLOBAL',
    },
    {
      label: 'Planos',
      rota: '/admin/planos',
      icon: Package,
      scope: 'ADMIN_GLOBAL',
    },
    {
      label: 'Configurações Globais',
      rota: '/admin/configuracoes',
      icon: Settings,
      scope: 'ADMIN_GLOBAL',
    },
    {
      label: 'Feature Flags',
      rota: '/admin/features',
      icon: Flag,
      scope: 'ADMIN_GLOBAL',
    },
    {
      label: 'Monitoramento',
      rota: '/admin/monitoramento',
      icon: ClipboardList,
      scope: 'ADMIN_GLOBAL',
    },
    {
      label: 'Auditoria Global',
      rota: '/admin/auditoria',
      icon: History,
      scope: 'ADMIN_GLOBAL',
    },
    {
      label: 'Usuários por Organização',
      rota: '/admin/usuarios',
      icon: UserPlus,
      scope: 'ADMIN_GLOBAL',
    },
    {
      label: 'Definir Admin',
      rota: '/admin/definir-admin',
      icon: Shield,
      scope: 'ADMIN_GLOBAL',
    },
    {
      label: 'Dashboard',
      rota: '/app/dashboard',
      icon: LayoutDashboard,
      scope: 'ORG',
      roles: ['ADMIN', 'USER'],
    },
    {
      label: 'WhatsApp',
      rota: '/app/whatsapp',
      icon: MessageCircle,
      scope: 'ORG',
      roles: ['ADMIN', 'USER'],
    },
    {
      label: 'Notificações',
      rota: '/app/notificacoes',
      icon: Send,
      scope: 'ORG',
      roles: ['ADMIN', 'USER'],
    },
    {
      label: 'Contatos',
      rota: '/app/contatos',
      icon: UserCheck,
      scope: 'ORG',
      roles: ['ADMIN', 'USER'],
    },
    {
      label: 'Templates',
      rota: '/app/templates',
      icon: MessageSquareText,
      scope: 'ORG',
      roles: ['ADMIN', 'USER'],
    },
    {
      label: 'Tutorial',
      rota: '/app/tutorial',
      icon: BookOpen,
      scope: 'ORG',
      roles: ['ADMIN', 'USER'],
    },
    {
      label: 'Histórico / Fila',
      rota: '/app/fila',
      icon: History,
      scope: 'ORG',
      roles: ['ADMIN', 'USER'],
    },
    {
      label: 'Configurações',
      rota: '/app/configuracoes',
      icon: Settings,
      scope: 'ORG',
      roles: ['ADMIN', 'USER'],
    },
    {
      label: 'Auditoria',
      rota: '/app/auditoria',
      icon: History,
      scope: 'ORG',
      roles: ['ADMIN'],
    },
  ];

  podeVer(item: NavItem): boolean {
    if (item.scope === 'ADMIN_GLOBAL' && !this.authService.isSuperAdmin()) {
      return false;
    }

    if (item.scope === 'ORG' && this.authService.isSuperAdmin()) {
      return false;
    }

    return !item.roles || item.roles.includes(this.authService.role() ?? '');
  }

  fecharAoNavegar(): void {
    if (window.innerWidth < 1024) {
      this.layout.fecharSidebar();
    }
  }
}
