import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  Bell,
  LayoutDashboard,
  LogOut,
  LucideAngularModule,
  LucideIconData,
  MessageCircle,
  Send,
  Settings,
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
      label: 'Organizacoes',
      rota: '/admin/organizacoes',
      icon: Settings,
      scope: 'ADMIN_GLOBAL',
    },
    {
      label: 'Usuarios',
      rota: '/admin/usuarios',
      icon: Send,
      scope: 'ADMIN_GLOBAL',
    },
    {
      label: 'Definir Admin',
      rota: '/admin/definir-admin',
      icon: Settings,
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
