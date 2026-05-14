// src/app/features/whatsapp/whatsapp.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SidebarComponent, HeaderComponent } from '../../core/layout/layout.components';
import { WhatsappService } from '../../core/http/services';
import { WhatsappStatusResponse, EnviarMensagemResponse } from '../../shared/types/dtos';

@Component({
  selector: 'app-whatsapp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent, HeaderComponent],
  template: `
    <div class="min-h-screen bg-slate-950">
      <app-sidebar />
      <app-header />

      <main class="pl-64 pt-16">
        <div class="p-8 max-w-4xl mx-auto">

          <!-- Título -->
          <div class="mb-8">
            <h1 class="text-2xl font-bold text-white">WhatsApp</h1>
            <p class="text-slate-400 text-sm mt-1">
              Gerencie a sessão e envie mensagens diretamente
            </p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <!-- ── Card de Status ─────────────────────────────────────────── -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-white font-semibold">Status da Sessão</h2>
                <button (click)="atualizarStatus()"
                        [disabled]="carregando()"
                        class="text-slate-400 hover:text-white disabled:opacity-40
                               transition-colors p-1.5 rounded-lg hover:bg-slate-800">
                  <svg class="w-4 h-4" [class.animate-spin]="carregando()"
                       fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582
                             9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0
                             01-15.357-2m15.357 2H15"/>
                  </svg>
                </button>
              </div>

              <!-- Indicador principal -->
              <div class="flex items-center gap-4 mb-6">
                <div class="w-14 h-14 rounded-2xl flex items-center justify-center border"
                     [class.bg-emerald-950]="status()?.conectado"
                     [class.border-emerald-800]="status()?.conectado"
                     [class.bg-slate-800]="!status()?.conectado"
                     [class.border-slate-700]="!status()?.conectado">
                  <svg class="w-7 h-7"
                       [class.text-emerald-400]="status()?.conectado"
                       [class.text-slate-500]="!status()?.conectado"
                       fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03
                             8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512
                             15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-white font-semibold text-lg">
                    {{ status()?.status ?? '—' }}
                  </p>
                  @if (status()?.telefone) {
                    <p class="text-slate-500 text-sm">{{ status()!.telefone }}</p>
                  } @else {
                    <p class="text-slate-600 text-sm">Nenhum telefone vinculado</p>
                  }
                </div>
              </div>

              <!-- QR Code -->
              @if (status()?.qrImagem) {
                <div class="mb-6">
                  <p class="text-slate-400 text-sm mb-3 flex items-center gap-2">
                    <span class="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                    Escaneie o QR Code no WhatsApp
                  </p>
                  <div class="bg-white p-3 rounded-xl inline-block">
                    <img [src]="qrImagemSrc()"
                         alt="QR Code WhatsApp"
                         class="w-48 h-48 object-contain" />
                  </div>
                </div>
              }

              @if (status()?.erro) {
                <div class="mb-4 bg-red-950 border border-red-800 rounded-xl px-4 py-3">
                  <p class="text-red-400 text-sm">{{ status()!.erro }}</p>
                </div>
              }

              <!-- Ações -->
              <div class="flex flex-col gap-3">
                @if (!status()?.conectado) {
                  <button (click)="conectar()"
                          [disabled]="carregando()"
                          class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50
                                 disabled:cursor-not-allowed text-white font-semibold py-2.5
                                 rounded-xl transition-all duration-200 text-sm flex items-center
                                 justify-center gap-2">
                    @if (carregando()) {
                      <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle class="opacity-25" cx="12" cy="12" r="10"
                                stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                    }
                    Conectar WhatsApp
                  </button>
                } @else {
                  <button (click)="desconectar()"
                          [disabled]="carregando()"
                          class="w-full bg-slate-800 hover:bg-red-950 hover:border-red-800
                                 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed
                                 text-slate-300 hover:text-red-400 font-semibold py-2.5
                                 rounded-xl transition-all duration-200 text-sm">
                    Desconectar
                  </button>
                }
              </div>
            </div>

            <!-- ── Formulário de Envio ─────────────────────────────────────── -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 class="text-white font-semibold mb-6">Enviar Mensagem</h2>

              <form [formGroup]="formMensagem" (ngSubmit)="enviarMensagem()" class="space-y-4">

                <!-- Telefone -->
                <div>
                  <label class="block text-sm font-medium text-slate-300 mb-2">
                    Telefone
                  </label>
                  <input formControlName="telefone"
                         type="text"
                         placeholder="5571991180200"
                         class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3
                                text-white placeholder-slate-500 text-sm
                                focus:outline-none focus:ring-2 focus:ring-indigo-500
                                focus:border-transparent transition-all duration-200" />
                  @if (formMensagem.get('telefone')?.invalid && formMensagem.get('telefone')?.touched) {
                    <p class="text-red-400 text-xs mt-1">
                      Informe o telefone no formato internacional (ex: 5571991180200)
                    </p>
                  }
                  <p class="text-slate-600 text-xs mt-1">
                    Código do país + DDD + número, sem espaços
                  </p>
                </div>

                <!-- Mensagem -->
                <div>
                  <label class="block text-sm font-medium text-slate-300 mb-2">
                    Mensagem
                  </label>
                  <textarea formControlName="mensagem"
                            rows="5"
                            placeholder="Digite a mensagem que será enviada..."
                            class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3
                                   text-white placeholder-slate-500 text-sm resize-none
                                   focus:outline-none focus:ring-2 focus:ring-indigo-500
                                   focus:border-transparent transition-all duration-200">
                  </textarea>
                  @if (formMensagem.get('mensagem')?.invalid && formMensagem.get('mensagem')?.touched) {
                    <p class="text-red-400 text-xs mt-1">Mensagem obrigatória</p>
                  }
                </div>

                <!-- Feedback de sucesso -->
                @if (respostaMensagem()?.sucesso === true) {
                  <div class="bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-3
                              flex items-center gap-3">
                    <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M5 13l4 4L19 7"/>
                    </svg>
                    <p class="text-emerald-400 text-sm">Mensagem enviada com sucesso!</p>
                  </div>
                }

                <!-- Feedback de erro -->
                @if (respostaMensagem()?.sucesso === false) {
                  <div class="bg-red-950 border border-red-800 rounded-xl px-4 py-3">
                    <p class="text-red-400 text-sm">
                      {{ respostaMensagem()?.erro ?? 'Erro ao enviar mensagem.' }}
                    </p>
                  </div>
                }

                <!-- Erro de conexão -->
                @if (erroEnvio()) {
                  <div class="bg-red-950 border border-red-800 rounded-xl px-4 py-3">
                    <p class="text-red-400 text-sm">{{ erroEnvio() }}</p>
                  </div>
                }

                <button type="submit"
                        [disabled]="formMensagem.invalid || enviando() || !status()?.conectado"
                        class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50
                               disabled:cursor-not-allowed text-white font-semibold py-3
                               rounded-xl transition-all duration-200 text-sm flex items-center
                               justify-center gap-2">
                  @if (enviando()) {
                    <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10"
                              stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Enviando...
                  } @else {
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                    </svg>
                    Enviar Mensagem
                  }
                </button>

                @if (!status()?.conectado) {
                  <p class="text-center text-slate-600 text-xs">
                    Conecte o WhatsApp antes de enviar mensagens
                  </p>
                }

              </form>
            </div>

          </div>
        </div>
      </main>
    </div>
  `,
})
export class WhatsappComponent implements OnInit {
  private readonly whatsappService = inject(WhatsappService);
  private readonly fb = inject(FormBuilder);

  readonly status = signal<WhatsappStatusResponse | null>(null);
  readonly carregando = signal(false);
  readonly enviando = signal(false);
  readonly respostaMensagem = signal<EnviarMensagemResponse | null>(null);
  readonly erroEnvio = signal<string | null>(null);

  readonly formMensagem = this.fb.group({
    telefone: ['', [Validators.required, Validators.minLength(10)]],
    mensagem: ['', [Validators.required]],
  });

  readonly qrImagemSrc = () => {
    const qrImagem = this.status()?.qrImagem;
    if (!qrImagem) return '';
    return qrImagem.startsWith('data:image/') ? qrImagem : `data:image/png;base64,${qrImagem}`;
  };

  ngOnInit(): void {
    this.atualizarStatus();
  }

  atualizarStatus(): void {
    this.carregando.set(true);
    this.whatsappService.status().subscribe({
      next: (s) => {
        this.status.set(s);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }

  conectar(): void {
    this.carregando.set(true);
    this.whatsappService.conectar().subscribe({
      next: (s) => {
        this.status.set(s);
        this.carregando.set(false);
        // Se veio QR, fica atualizando a cada 5s para detectar conexão
        if (s.qrImagem && !s.conectado) {
          setTimeout(() => this.atualizarStatus(), 5000);
        }
      },
      error: () => this.carregando.set(false),
    });
  }

  desconectar(): void {
    this.carregando.set(true);
    this.whatsappService.desconectar().subscribe({
      next: (s) => {
        this.status.set(s);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }

  enviarMensagem(): void {
    if (this.formMensagem.invalid) return;
    this.enviando.set(true);
    this.respostaMensagem.set(null);
    this.erroEnvio.set(null);

    const { telefone, mensagem } = this.formMensagem.getRawValue();

    this.whatsappService.enviarMensagem({ telefone: telefone!, mensagem: mensagem! }).subscribe({
      next: (res) => {
        this.respostaMensagem.set(res);
        this.enviando.set(false);
        if (res.sucesso) {
          this.formMensagem.reset();
        }
      },
      error: (err) => {
        this.erroEnvio.set(err.error?.mensagem ?? 'Erro de comunicação com a API.');
        this.enviando.set(false);
      },
    });
  }
}
