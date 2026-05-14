import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HeaderComponent, SidebarComponent } from '../../core/layout/layout.components';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent],
  template: `
    <div class="min-h-screen bg-slate-950">
      <app-sidebar />
      <app-header />

      <main class="pl-64 pt-16">
        <div class="p-8 max-w-3xl mx-auto">
          <div class="mb-8 flex items-center gap-3">
            <div class="w-10 h-10 bg-violet-950 rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112
                         2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02
                         0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332
                         9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-white">Painel Administrativo</h1>
              <p class="text-slate-400 text-sm">Acesso restrito - Super Admin</p>
            </div>
          </div>

          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-white font-semibold">Status do Sistema</h2>
              <button (click)="carregarStatus()"
                      [disabled]="carregando()"
                      class="text-slate-400 hover:text-white disabled:opacity-50 transition-colors text-sm">
                Atualizar
              </button>
            </div>

            @if (carregando()) {
              <div class="flex items-center gap-3 py-4">
                <svg class="animate-spin h-4 w-4 text-indigo-400" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10"
                          stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                <p class="text-slate-400 text-sm">Consultando API...</p>
              </div>
            } @else if (statusData()) {
              <pre class="bg-slate-950 border border-slate-800 rounded-xl p-4
                         text-xs text-slate-400 overflow-x-auto font-mono">{{ statusData() | json }}</pre>
            } @else if (erro()) {
              <div class="bg-red-950 border border-red-800 rounded-xl px-4 py-3">
                <p class="text-red-400 text-sm">{{ erro() }}</p>
              </div>
            }
          </div>
        </div>
      </main>
    </div>
  `,
})
export class AdminComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly statusData = signal<unknown>(null);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    this.carregarStatus();
  }

  carregarStatus(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.http.get(`${environment.apiUrl}/admin/status`).subscribe({
      next: (data) => {
        this.statusData.set(data);
        this.carregando.set(false);
      },
      error: (err) => {
        this.erro.set(err.error?.mensagem ?? 'Erro ao consultar o status do sistema.');
        this.carregando.set(false);
      },
    });
  }
}
