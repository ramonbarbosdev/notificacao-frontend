// src/app/features/selecionar-organizacao/selecionar-organizacao.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Organizacao } from '../../shared/types/dtos';

@Component({
  selector: 'app-selecionar-organizacao',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-slate-950 flex items-center justify-center p-4">

      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                    w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-3xl"></div>
      </div>

      <div class="relative w-full max-w-lg">

        <!-- Header -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl
                      bg-slate-800 border border-slate-700 mb-4">
            <svg class="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2
                       0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5
                       10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 class="text-xl font-bold text-white">Selecione a Organização</h1>
          <p class="text-slate-400 text-sm mt-1">
            Escolha para qual organização deseja acessar
          </p>
        </div>

        <!-- Lista de organizações -->
        <div class="space-y-3">
          @for (org of authService.organizacoes(); track org.idOrganizacao) {
            <button
              (click)="selecionar(org)"
              [disabled]="carregando() === org.idOrganizacao"
              class="w-full group bg-slate-900 hover:bg-slate-800 border border-slate-800
                     hover:border-indigo-500/50 rounded-xl p-4 text-left transition-all
                     duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-white font-medium text-sm group-hover:text-indigo-300
                             transition-colors">
                    {{ org.nmOrganizacao }}
                  </p>
                 
                </div>
                <div class="flex items-center gap-3">
                 <span class="px-2 py-0.5 bg-emerald-950 text-emerald-400 text-xs
                                 rounded-full border border-emerald-800">Ativa</span>
                  @if (carregando() === org.idOrganizacao) {
                    <svg class="animate-spin h-4 w-4 text-indigo-400" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10"
                              stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                  } @else {
                    <svg class="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors"
                         fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9 5l7 7-7 7" />
                    </svg>
                  }
                </div>
              </div>
            </button>
          }
        </div>

        @if (erro()) {
          <div class="mt-4 bg-red-950 border border-red-800 rounded-xl px-4 py-3">
            <p class="text-red-400 text-sm">{{ erro() }}</p>
          </div>
        }

        <!-- Logout link -->
        <div class="text-center mt-6">
          <button (click)="authService.logout()"
                  class="text-slate-500 hover:text-slate-300 text-sm transition-colors">
            ← Sair da conta
          </button>
        </div>
      </div>
    </div>
  `,
})
export class SelecionarOrganizacaoComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly carregando = signal<number | null>(null);
  readonly erro = signal<string | null>(null);

  selecionar(org: Organizacao): void {
    this.erro.set(null);
    this.carregando.set(org.idOrganizacao);

    this.authService.selecionarOrganizacao({ idOrganizacao: org.idOrganizacao }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.erro.set(err.error?.mensagem ?? 'Erro ao selecionar organização.');
        this.carregando.set(null);
      },
    });
  }
}
