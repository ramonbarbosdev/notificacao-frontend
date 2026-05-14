import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';

interface NavItem {
  label: string;
  rota: string;
  icon: string;
  roles?: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="fixed left-0 top-0 h-screen w-64 app-page border-r border-slate-800
                  flex flex-col z-40 transition-transform duration-300"
           [class.-translate-x-full]="!aberta()"
    >
      <!-- Brand -->
      <div class="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 app-title" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002
                     6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388
                     6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </div>
        <span class="app-title font-semibold text-sm tracking-tight">Notificação API</span>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

        <p class="px-3 text-xs font-semibold app-faint uppercase tracking-widest mb-2">
          Principal
        </p>

        @for (item of navItems; track item.rota) {
          @if (!item.roles || item.roles.includes(authService.role() ?? '')) {
            <a [routerLink]="item.rota"
               routerLinkActive="bg-indigo-600/15 text-indigo-400 border-indigo-500/30"
               class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                      app-muted hover:text-[var(--app-text)] hover:bg-slate-800
                      border border-transparent transition-all duration-150 group">
              <span class="w-4 h-4 flex-shrink-0" [innerHTML]="item.icon"></span>
              {{ item.label }}
            </a>
          }
        }
      </nav>

      <!-- User info -->
      <div class="border-t border-slate-800 p-4">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
            <span class="text-xs font-semibold text-slate-300">
              {{ (authService.nomeUsuario() ?? 'U')[0].toUpperCase() }}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="app-title text-sm font-medium truncate">
              {{ authService.nomeUsuario() ?? 'Usuário' }}
            </p>
            <p class="app-subtle text-xs truncate">
              {{ authService.usuario()?.role ?? '' }}
            </p>
          </div>
          <button (click)="authService.logout()"
                  title="Sair"
                  class="app-faint hover:text-[var(--app-danger)] transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3
                       3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  readonly authService = inject(AuthService);
  readonly aberta = signal(true);

  readonly navItems: NavItem[] = [
    {
      label: 'Dashboard',
      rota: '/dashboard',
      icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                     d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1
                        1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1
                        1 0 001 1m-6 0h6"/>
             </svg>`,
    },
    {
      label: 'WhatsApp',
      rota: '/whatsapp',
      icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                     d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03
                        8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512
                        15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
             </svg>`,
    },
    {
      label: 'Notificações',
      rota: '/notificacoes',
      icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                     d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002
                        6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388
                        6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0
                        11-6 0v-1m6 0H9"/>
             </svg>`,
    },
    {
      label: 'Admin',
      rota: '/admin',
      roles: ['SUPER_ADMIN'],
      icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                     d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0
                        002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065
                        2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066
                        2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572
                        1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724
                        1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924
                        0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31
                        2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                     d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
             </svg>`,
    },
  ];
}



@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="fixed top-0 left-64 right-0 h-16 app-header-surface backdrop-blur-md
                   border-b border-slate-800 flex items-center justify-between
                   px-6 z-30">

      <!-- Organização atual -->
      <div class="flex items-center gap-2">
        @if (authService.organizacaoAtual()) {
          <div class="flex items-center gap-2 app-surface-muted border
                      rounded-lg px-3 py-1.5">
            <span class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            <span class="text-slate-300 text-sm font-medium">
              {{ authService.organizacaoAtual() }}
            </span>
          </div>
        } @else if (authService.isSuperAdmin()) {
          <div class="flex items-center gap-2 bg-violet-950 border border-violet-800
                      rounded-lg px-3 py-1.5">
            <span class="w-2 h-2 bg-violet-400 rounded-full"></span>
            <span class="text-violet-300 text-sm font-medium">Super Admin</span>
          </div>
        }
      </div>

      <!-- Right side -->
      <div class="flex items-center gap-4">
        <!-- Usuário -->
        <div class="text-right hidden sm:block">
          <p class="app-title text-sm font-medium leading-none">
            {{ authService.nomeUsuario() ?? '...' }}
          </p>
          <p class="app-subtle text-xs mt-0.5">
            {{ authService.emailUsuario() ?? '' }}
          </p>
        </div>

        <!-- Avatar -->
        <div class="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
          <span class="text-xs font-bold app-title">
            {{ (authService.nomeUsuario() ?? 'U')[0].toUpperCase() }}
          </span>
        </div>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  readonly authService = inject(AuthService);
}
