// src/app/features/dashboard/dashboard.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../core/layout/layout.components';
import { HeaderComponent } from '../../core/layout/layout.components';
import { AuthService } from '../../core/auth/auth.service';
import { WhatsappService } from '../../core/http/services';
import { WhatsappStatusResponse } from '../../shared/types/dtos';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, HeaderComponent],
  template: `
    <div class="min-h-screen app-page">
      <app-sidebar />
      <app-header />

      <!-- Conteúdo principal -->
      <main class="pl-64 pt-16">
        <div class="p-8 max-w-7xl mx-auto">

          <!-- Boas-vindas -->
          <div class="mb-8">
            <h1 class="text-2xl font-bold app-title">
              Bom dia, {{ primeiroNome() }}
            </h1>
            <p class="app-muted text-sm mt-1">
              Aqui está um resumo da sua organização
            </p>
          </div>

          <!-- Cards de métricas -->
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">

            <!-- Status WhatsApp -->
            <div class="bg-slate-900 border rounded-2xl p-5 transition-all duration-200
                        hover:border-slate-700"
                 [class.border-emerald-800]="whatsappStatus()?.conectado"
                 [class.border-slate-800]="!whatsappStatus()?.conectado">
              <div class="flex items-start justify-between mb-4">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                     [class.bg-emerald-950]="whatsappStatus()?.conectado"
                     [class.bg-slate-800]="!whatsappStatus()?.conectado">
                  <svg class="w-5 h-5"
                       [class.text-emerald-400]="whatsappStatus()?.conectado"
                       [class.app-subtle]="!whatsappStatus()?.conectado"
                       fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9
                             8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512
                             15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                </div>
                <span class="text-xs px-2 py-0.5 rounded-full border font-medium"
                      [class.bg-emerald-950]="whatsappStatus()?.conectado"
                      [class.text-emerald-400]="whatsappStatus()?.conectado"
                      [class.border-emerald-800]="whatsappStatus()?.conectado"
                      [class.bg-slate-800]="!whatsappStatus()?.conectado"
                      [class.app-muted]="!whatsappStatus()?.conectado"
                      [class.border-slate-700]="!whatsappStatus()?.conectado">
                  {{ whatsappStatus()?.conectado ? 'Online' : 'Offline' }}
                </span>
              </div>
              <p class="app-muted text-xs uppercase tracking-widest mb-1">WhatsApp</p>
              <p class="app-title font-semibold text-lg">
                {{ whatsappStatus()?.status ?? (carregandoStatus() ? '...' : 'Desconhecido') }}
              </p>
              @if (whatsappStatus()?.telefone) {
                <p class="app-subtle text-xs mt-1 truncate">
                  {{ whatsappStatus()!.telefone }}
                </p>
              }
            </div>

            <!-- Notificações Enviadas (placeholder) -->
            <div class="app-surface border hover:border-slate-700
                        rounded-2xl p-5 transition-all duration-200">
              <div class="flex items-start justify-between mb-4">
                <div class="w-10 h-10 bg-indigo-950 rounded-xl flex items-center justify-center">
                  <svg class="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24"
                       stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                  </svg>
                </div>
                <span class="text-emerald-400 text-xs font-medium">+12% hoje</span>
              </div>
              <p class="app-muted text-xs uppercase tracking-widest mb-1">Enviadas</p>
              <p class="app-title font-semibold text-2xl">—</p>
              <p class="app-faint text-xs mt-1">Conecte sua API para ver</p>
            </div>

            <!-- Notificações com Erro (placeholder) -->
            <div class="app-surface border hover:border-slate-700
                        rounded-2xl p-5 transition-all duration-200">
              <div class="flex items-start justify-between mb-4">
                <div class="w-10 h-10 bg-red-950 rounded-xl flex items-center justify-center">
                  <svg class="w-5 h-5 app-alert-danger-text" fill="none" viewBox="0 0 24 24"
                       stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
              </div>
              <p class="app-muted text-xs uppercase tracking-widest mb-1">Com Erro</p>
              <p class="app-title font-semibold text-2xl">—</p>
              <p class="app-faint text-xs mt-1">Sem erros registrados</p>
            </div>

            <!-- Canal ativo -->
            <div class="app-surface border hover:border-slate-700
                        rounded-2xl p-5 transition-all duration-200">
              <div class="flex items-start justify-between mb-4">
                <div class="w-10 h-10 bg-amber-950 rounded-xl flex items-center justify-center">
                  <svg class="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24"
                       stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </div>
              </div>
              <p class="app-muted text-xs uppercase tracking-widest mb-1">Canal Ativo</p>
              <p class="app-title font-semibold text-lg">WHATSAPP</p>
              <p class="app-faint text-xs mt-1">Canal padrão configurado</p>
            </div>

          </div>

          <!-- Atalhos -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

            <!-- Ir para WhatsApp -->
            <a routerLink="/whatsapp"
               class="group app-surface border hover:border-indigo-500/40
                      rounded-2xl p-6 flex items-center gap-5 transition-all duration-200
                      hover:bg-slate-800/50">
              <div class="w-12 h-12 bg-emerald-950 group-hover:bg-emerald-900 rounded-xl
                          flex items-center justify-center transition-colors flex-shrink-0">
                <svg class="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03
                           8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512
                           15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
              </div>
              <div>
                <h3 class="app-title font-semibold">Gerenciar WhatsApp</h3>
                <p class="app-subtle text-sm mt-0.5">
                  Conecte, envie mensagens e veja o status da sessão
                </p>
              </div>
              <svg class="w-5 h-5 app-faint group-hover:text-indigo-400 ml-auto
                         transition-colors flex-shrink-0"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 5l7 7-7 7"/>
              </svg>
            </a>

            <!-- Ir para Notificações -->
            <a routerLink="/notificacoes"
               class="group app-surface border hover:border-indigo-500/40
                      rounded-2xl p-6 flex items-center gap-5 transition-all duration-200
                      hover:bg-slate-800/50">
              <div class="w-12 h-12 bg-indigo-950 group-hover:bg-indigo-900 rounded-xl
                          flex items-center justify-center transition-colors flex-shrink-0">
                <svg class="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002
                           6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6
                           8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6
                           0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
              </div>
              <div>
                <h3 class="app-title font-semibold">Enviar Notificação</h3>
                <p class="app-subtle text-sm mt-0.5">
                  Dispare notificações por WhatsApp, Email, Telegram ou Webhook
                </p>
              </div>
              <svg class="w-5 h-5 app-faint group-hover:text-indigo-400 ml-auto
                         transition-colors flex-shrink-0"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 5l7 7-7 7"/>
              </svg>
            </a>

          </div>

        </div>
      </main>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly whatsappService = inject(WhatsappService);

  readonly whatsappStatus = signal<WhatsappStatusResponse | null>(null);
  readonly carregandoStatus = signal(true);

  readonly primeiroNome = () => {
    const nome = this.authService.nomeUsuario() ?? '';
    return nome.split(' ')[0];
  };

  ngOnInit(): void {
    this.carregarStatus();
  }

  carregarStatus(): void {
    this.carregandoStatus.set(true);
    this.whatsappService.status().subscribe({
      next: (s) => {
        this.whatsappStatus.set(s);
        this.carregandoStatus.set(false);
      },
      error: () => this.carregandoStatus.set(false),
    });
  }
}
