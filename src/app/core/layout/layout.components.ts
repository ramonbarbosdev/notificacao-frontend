import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  Bell,
  Building2,
  History,
  LayoutDashboard,
  LogOut,
  LucideAngularModule,
  LucideIconData,
  MessageCircle,
  Send,
  UserCheck,
  UserPlus,
} from 'lucide-angular';
import { AuthService } from '../auth/auth.service';

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
  readonly aberta = signal(true);
  readonly brandIcon = Bell;
  readonly logoutIcon = LogOut;

  readonly navItems: NavItem[] = [
    {
      label: 'Dashboard Global',
      rota: '/admin/dashboard',
      icon: LayoutDashboard,
      scope: 'ADMIN_GLOBAL',
    },
    {
      label: 'Nova Organizacao',
      rota: '/admin/organizacoes',
      icon: Building2,
      scope: 'ADMIN_GLOBAL',
    },
    {
      label: 'Usuarios por Organizacao',
      rota: '/admin/usuarios',
      icon: UserPlus,
      scope: 'ADMIN_GLOBAL',
    },
    {
      label: 'Definir Admin',
      rota: '/admin/definir-admin',
      icon: UserPlus,
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
      label: 'Notificacoes',
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
      label: 'Historico / Fila',
      rota: '/app/historico',
      icon: History,
      scope: 'ORG',
      roles: ['ADMIN', 'USER'],
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
}
