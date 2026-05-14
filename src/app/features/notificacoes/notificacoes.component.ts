// src/app/features/notificacoes/notificacoes.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SidebarComponent, HeaderComponent } from '../../core/layout/layout.components';
import { NotificacaoService } from '../../core/http/services';
import {
  EnviarNotificacaoResponse,
  CanalNotificacao,
} from '../../shared/types/dtos';

interface OpcaoCanal {
  valor: CanalNotificacao;
  label: string;
  icon: string;
  cor: string;
}

@Component({
  selector: 'app-notificacoes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent, HeaderComponent],
  template: `
    <div class="min-h-screen app-page">
      <app-sidebar />
      <app-header />

      <main class="pl-64 pt-16">
        <div class="p-8 max-w-3xl mx-auto">

          <!-- Título -->
          <div class="mb-8">
            <h1 class="text-2xl font-bold app-title">Notificações</h1>
            <p class="app-muted text-sm mt-1">
              Dispare notificações por diferentes canais de comunicação
            </p>
          </div>

          <!-- Formulário principal -->
          <div class="app-surface border rounded-2xl p-8">

            <form [formGroup]="form" (ngSubmit)="enviar()" class="space-y-6">

              <!-- Seleção de Canal -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-3">Canal</label>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  @for (opcao of canais; track opcao.valor) {
                    <button type="button"
                            (click)="selecionarCanal(opcao.valor)"
                            class="flex flex-col items-center gap-2 p-4 rounded-xl border
                                   transition-all duration-200 text-sm font-medium"
                            [class]="canalSelecionado() === opcao.valor
                              ? 'bg-indigo-600/15 border-indigo-500/60 text-indigo-300'
                              : 'bg-slate-800 border-slate-700 app-muted hover:border-slate-600 hover:text-slate-300'">
                      <span class="text-xl" [innerHTML]="opcao.icon"></span>
                      {{ opcao.label }}
                    </button>
                  }
                </div>
              </div>

              <!-- Destinatário -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">
                  Destinatário
                </label>
                <input formControlName="destinatario"
                       type="text"
                       [placeholder]="placeholderDestinatario()"
                       class="w-full app-surface-muted border rounded-xl px-4 py-3
                              app-title placeholder-slate-500 text-sm
                              focus:outline-none focus:ring-2 focus:ring-indigo-500
                              focus:border-transparent transition-all duration-200" />
                @if (form.get('destinatario')?.invalid && form.get('destinatario')?.touched) {
                  <p class="app-alert-danger-text text-xs mt-1">Campo obrigatório</p>
                }
              </div>

              <!-- Assunto -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">
                  Assunto
                  <span class="app-faint ml-1 font-normal">
                    (opcional para WhatsApp)
                  </span>
                </label>
                <input formControlName="assunto"
                       type="text"
                       placeholder="Assunto da notificação"
                       class="w-full app-surface-muted border rounded-xl px-4 py-3
                              app-title placeholder-slate-500 text-sm
                              focus:outline-none focus:ring-2 focus:ring-indigo-500
                              focus:border-transparent transition-all duration-200" />
              </div>

              <!-- Mensagem -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">
                  Mensagem
                </label>
                <textarea formControlName="mensagem"
                          rows="6"
                          placeholder="Conteúdo da mensagem a ser enviada..."
                          class="w-full app-surface-muted border rounded-xl px-4 py-3
                                 app-title placeholder-slate-500 text-sm resize-none
                                 focus:outline-none focus:ring-2 focus:ring-indigo-500
                                 focus:border-transparent transition-all duration-200">
                </textarea>
                @if (form.get('mensagem')?.invalid && form.get('mensagem')?.touched) {
                  <p class="app-alert-danger-text text-xs mt-1">Mensagem obrigatória</p>
                }
                <p class="app-faint text-xs mt-1.5 text-right">
                  {{ form.get('mensagem')?.value?.length ?? 0 }} caracteres
                </p>
              </div>

              <!-- Botão enviar -->
              <button type="submit"
                      [disabled]="form.invalid || enviando()"
                      class="w-full app-button-primary disabled:opacity-50
                             disabled:cursor-not-allowed app-title font-semibold py-3.5
                             rounded-xl transition-all duration-200 text-sm flex items-center
                             justify-center gap-2 shadow-lg shadow-indigo-600/20">
                @if (enviando()) {
                  <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10"
                            stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Enviando notificação...
                } @else {
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                  </svg>
                  Enviar Notificação via {{ canalSelecionado() }}
                }
              </button>

            </form>
          </div>

          <!-- ── Resposta da API ───────────────────────────────────────────── -->
          @if (resposta()) {
            <div class="mt-6 bg-slate-900 border rounded-2xl p-6 transition-all"
                 [class.border-emerald-800]="resposta()!.sucesso"
                 [class.border-red-800]="!resposta()!.sucesso">

              <div class="flex items-center gap-3 mb-4">
                @if (resposta()!.sucesso) {
                  <div class="w-8 h-8 bg-emerald-950 rounded-lg flex items-center justify-center">
                    <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <h3 class="text-emerald-400 font-semibold">Notificação enviada!</h3>
                } @else {
                  <div class="w-8 h-8 bg-red-950 rounded-lg flex items-center justify-center">
                    <svg class="w-4 h-4 app-alert-danger-text" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </div>
                  <h3 class="app-alert-danger-text font-semibold">Falha no envio</h3>
                }
              </div>

              <!-- Dados da resposta -->
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-slate-800 rounded-xl p-3">
                  <p class="app-subtle text-xs mb-1">ID da Notificação</p>
                  <p class="app-title text-sm font-mono font-semibold">
                    #{{ resposta()!.idNotificacao }}
                  </p>
                </div>
                <div class="bg-slate-800 rounded-xl p-3">
                  <p class="app-subtle text-xs mb-1">Canal</p>
                  <p class="app-title text-sm font-semibold">{{ resposta()!.canal }}</p>
                </div>
                <div class="bg-slate-800 rounded-xl p-3">
                  <p class="app-subtle text-xs mb-1">Status</p>
                  <span class="text-sm font-semibold px-2 py-0.5 rounded-full"
                        [class.text-emerald-400]="resposta()!.status === 'ENVIADO'"
                        [class.app-alert-danger-text]="resposta()!.status === 'ERRO'"
                        [class.text-amber-400]="resposta()!.status === 'PENDENTE'">
                    {{ resposta()!.status }}
                  </span>
                </div>
                @if (resposta()!.erro) {
                  <div class="bg-red-950/50 rounded-xl p-3 col-span-2">
                    <p class="app-subtle text-xs mb-1">Erro</p>
                    <p class="app-alert-danger-text text-sm">{{ resposta()!.erro }}</p>
                  </div>
                }
              </div>

              <!-- JSON completo (toggle) -->
              <div class="mt-3">
                <button (click)="mostrarJson.set(!mostrarJson())"
                        class="app-subtle hover:text-slate-300 text-xs flex items-center gap-1
                               transition-colors">
                  <svg class="w-3 h-3 transition-transform"
                       [class.rotate-90]="mostrarJson()"
                       fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M9 5l7 7-7 7"/>
                  </svg>
                  {{ mostrarJson() ? 'Ocultar' : 'Ver' }} JSON da resposta
                </button>
                @if (mostrarJson()) {
                  <pre class="mt-2 app-page border border-slate-800 rounded-xl p-4
                              text-xs app-muted overflow-x-auto font-mono">{{
                    resposta() | json
                  }}</pre>
                }
              </div>

            </div>
          }

          <!-- Erro de rede -->
          @if (erroRede()) {
            <div class="mt-6 app-alert-danger border rounded-2xl px-5 py-4">
              <p class="app-alert-danger-text text-sm">{{ erroRede() }}</p>
            </div>
          }

        </div>
      </main>
    </div>
  `,
})
export class NotificacoesComponent {
  private readonly notificacaoService = inject(NotificacaoService);
  private readonly fb = inject(FormBuilder);

  readonly canalSelecionado = signal<CanalNotificacao>('WHATSAPP');
  readonly enviando = signal(false);
  readonly resposta = signal<EnviarNotificacaoResponse | null>(null);
  readonly erroRede = signal<string | null>(null);
  readonly mostrarJson = signal(false);

  readonly canais: OpcaoCanal[] = [
    { valor: 'WHATSAPP',  label: 'WhatsApp',  icon: '', cor: 'emerald' },
    { valor: 'EMAIL',     label: 'Email',     icon: '',  cor: 'blue' },
    { valor: 'TELEGRAM',  label: 'Telegram',  icon: '',  cor: 'sky' },
    { valor: 'WEBHOOK',   label: 'Webhook',   icon: '', cor: 'violet' },
  ];

  readonly form = this.fb.group({
    destinatario: ['', [Validators.required]],
    assunto:      [''],
    mensagem:     ['', [Validators.required]],
  });

  readonly placeholderDestinatario = () => {
    const mapa: Record<CanalNotificacao, string> = {
      WHATSAPP: '5571991180200',
      EMAIL:    'destinatario@email.com',
      TELEGRAM: '@usuario ou chat_id',
      WEBHOOK:  'https://seu-webhook.com/endpoint',
    };
    return mapa[this.canalSelecionado()];
  };

  selecionarCanal(canal: CanalNotificacao): void {
    this.canalSelecionado.set(canal);
    this.form.patchValue({ destinatario: '' });
    this.resposta.set(null);
    this.erroRede.set(null);
  }

  enviar(): void {
    if (this.form.invalid) return;

    this.enviando.set(true);
    this.resposta.set(null);
    this.erroRede.set(null);
    this.mostrarJson.set(false);

    const { destinatario, assunto, mensagem } = this.form.getRawValue();

    this.notificacaoService
      .enviar({
        canal:       this.canalSelecionado(),
        destinatario: destinatario!,
        assunto:      assunto ?? '',
        mensagem:     mensagem!,
      })
      .subscribe({
        next: (res) => {
          this.resposta.set(res);
          this.enviando.set(false);
          if (res.sucesso) this.form.reset();
        },
        error: (err) => {
          this.erroRede.set(err.error?.mensagem ?? 'Falha na comunicação com a API.');
          this.enviando.set(false);
        },
      });
  }
}
