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
      label: 'Dashboard',
      rota: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'WhatsApp',
      rota: '/whatsapp',
      icon: MessageCircle,
    },
    {
      label: 'Notificacoes',
      rota: '/notificacoes',
      icon: Send,
    },
    {
      label: 'Admin',
      rota: '/admin',
      roles: ['SUPER_ADMIN'],
      icon: Settings,
    },
  ];
}
