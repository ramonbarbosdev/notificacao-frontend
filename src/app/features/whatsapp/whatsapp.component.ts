// src/app/features/whatsapp/whatsapp.component.ts
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { HeaderComponent, SidebarComponent } from '../../core/layout/layout.components';
import { AuthService } from '../../core/auth/auth.service';
import { WhatsappEventsService } from '../../core/http/whatsapp-events.service';
import { WhatsappService } from '../../core/http/services';
import {
  EnviarMensagemResponse,
  WhatsappEvento,
  WhatsappStatusResponse,
} from '../../shared/types/dtos';

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
          <div class="mb-8">
            <h1 class="text-2xl font-bold text-white">WhatsApp</h1>
            <p class="text-slate-400 text-sm mt-1">
              Gerencie a sessao e envie mensagens diretamente
            </p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-white font-semibold">Status da Sessao</h2>
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
                    {{ status()?.status ?? '-' }}
                  </p>
                  @if (status()?.telefone) {
                    <p class="text-slate-500 text-sm">{{ status()!.telefone }}</p>
                  } @else if (tentativaEmAndamento()) {
                    <p class="text-slate-500 text-sm">Tentativa de conexao em andamento</p>
                  } @else {
                    <p class="text-slate-600 text-sm">Nenhum telefone vinculado</p>
                  }
                </div>
              </div>

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

              @if (erroConexao()) {
                <div class="mb-4 bg-red-950 border border-red-800 rounded-xl px-4 py-3">
                  <p class="text-red-400 text-sm">{{ erroConexao() }}</p>
                </div>
              }

              @if (mensagemEvento()) {
                <div class="mb-4 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
                  <p class="text-slate-300 text-sm">{{ mensagemEvento() }}</p>
                </div>
              }

              <div class="flex flex-col gap-3">
                @if (!status()?.conectado && tentativaEmAndamento()) {
                  <button
                    type="button"
                    disabled
                    class="w-full bg-slate-800 border border-slate-700 opacity-80
                           text-slate-300 font-semibold py-2.5 rounded-xl text-sm
                           flex items-center justify-center gap-2"
                  >
                    <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10"
                              stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Conexao em andamento
                  </button>

                  <button (click)="cancelarConexao()"
                          [disabled]="carregando()"
                          class="w-full bg-slate-800 hover:bg-red-950 hover:border-red-800
                                 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed
                                 text-slate-300 hover:text-red-400 font-semibold py-2.5
                                 rounded-xl transition-all duration-200 text-sm">
                    Cancelar conexao
                  </button>
                } @else if (!status()?.conectado) {
                  <button (click)="conectar()"
                          [disabled]="conectarBloqueado()"
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

                  @if (segundosRestantes() > 0) {
                    <p class="text-center text-slate-600 text-xs">
                      Aguarde {{ segundosRestantes() }}s para tentar novamente
                    </p>
                  }
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

            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 class="text-white font-semibold mb-6">Enviar Mensagem</h2>

              <form [formGroup]="formMensagem" (ngSubmit)="enviarMensagem()" class="space-y-4">
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
                    Codigo do pais + DDD + numero, sem espacos
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-300 mb-2">
                    Mensagem
                  </label>
                  <textarea formControlName="mensagem"
                            rows="5"
                            placeholder="Digite a mensagem que sera enviada..."
                            class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3
                                   text-white placeholder-slate-500 text-sm resize-none
                                   focus:outline-none focus:ring-2 focus:ring-indigo-500
                                   focus:border-transparent transition-all duration-200">
                  </textarea>
                  @if (formMensagem.get('mensagem')?.invalid && formMensagem.get('mensagem')?.touched) {
                    <p class="text-red-400 text-xs mt-1">Mensagem obrigatoria</p>
                  }
                </div>

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

                @if (respostaMensagem()?.sucesso === false) {
                  <div class="bg-red-950 border border-red-800 rounded-xl px-4 py-3">
                    <p class="text-red-400 text-sm">
                      {{ respostaMensagem()?.erro ?? 'Erro ao enviar mensagem.' }}
                    </p>
                  </div>
                }

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
export class WhatsappComponent implements OnInit, OnDestroy {
  private readonly whatsappService = inject(WhatsappService);
  private readonly whatsappEventsService = inject(WhatsappEventsService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private countdownId: ReturnType<typeof setInterval> | null = null;
  private eventosSubscription: Subscription | null = null;

  readonly status = signal<WhatsappStatusResponse | null>(null);
  readonly carregando = signal(false);
  readonly enviando = signal(false);
  readonly respostaMensagem = signal<EnviarMensagemResponse | null>(null);
  readonly erroEnvio = signal<string | null>(null);
  readonly erroConexao = signal<string | null>(null);
  readonly mensagemEvento = signal<string | null>(null);
  readonly podeConectar = signal(true);
  readonly segundosRestantes = signal(0);

  readonly statusEmTentativa = computed(() => {
    const status = this.status()?.status;
    return this.ehStatusDeTentativa(status);
  });

  readonly tentativaEmAndamento = computed(
    () => this.statusEmTentativa() || !this.podeConectar()
  );

  readonly conectarBloqueado = computed(
    () => this.carregando() || !this.podeConectar() || this.statusEmTentativa()
  );

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
    this.conectarEventosDaOrganizacao();
    this.atualizarStatus();
  }

  ngOnDestroy(): void {
    this.pararContador();
    this.eventosSubscription?.unsubscribe();
  }

  atualizarStatus(): void {
    this.carregando.set(true);
    this.whatsappService.status().subscribe({
      next: (s) => {
        this.status.set(s);
        this.carregando.set(false);
        this.sincronizarBotaoComStatus(s);
        if (!s.qrImagem && this.ehStatusDeTentativa(s.status)) {
          this.buscarStatusSemLoading();
        }
      },
      error: () => this.carregando.set(false),
    });
  }

  conectar(): void {
    if (this.conectarBloqueado()) return;

    this.carregando.set(true);
    this.erroConexao.set(null);
    this.mensagemEvento.set(null);
    this.podeConectar.set(false);
    this.segundosRestantes.set(30);
    this.iniciarContador();

    this.whatsappService.conectar().subscribe({
      next: (s) => {
        this.status.set(s);
        this.carregando.set(false);
        this.sincronizarBotaoComStatus(s);
        console.log(s)
      },
      error: (err: HttpErrorResponse) => {
        this.carregando.set(false);
        if (err.status === 409) {
          this.erroConexao.set(
            'Conexao WhatsApp em andamento. Aguarde alguns segundos ou cancele a tentativa atual.'
          );
          this.podeConectar.set(false);
          return;
        }

        this.erroConexao.set(err.error?.mensagem ?? 'Erro ao iniciar conexao do WhatsApp.');
        this.liberarConectar();
      },
    });
  }

  cancelarConexao(): void {
    this.carregando.set(true);
    this.erroConexao.set(null);

    this.whatsappService.cancelarConexao().subscribe({
      next: (s) => {
        this.status.set(s);
        this.carregando.set(false);
        this.removerQrDaTela();
        this.liberarConectar();
      },
      error: (err: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erroConexao.set(err.error?.mensagem ?? 'Erro ao cancelar conexao do WhatsApp.');
      },
    });
  }

  desconectar(): void {
    this.carregando.set(true);
    this.erroConexao.set(null);

    this.whatsappService.desconectar().subscribe({
      next: (s) => {
        this.status.set(s);
        this.carregando.set(false);
        this.liberarConectar();
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
        this.erroEnvio.set(err.error?.mensagem ?? 'Erro de comunicacao com a API.');
        this.enviando.set(false);
      },
    });
  }

  private conectarEventosDaOrganizacao(): void {
    const idOrganizacao = this.authService.idOrganizacaoAtual();
    if (!idOrganizacao) return;

    this.eventosSubscription = this.whatsappEventsService.conectar(idOrganizacao).subscribe({
      next: (evento) => this.aplicarEvento(evento),
      error: (err: Error) => {
        this.erroConexao.set(err.message || 'Nao foi possivel conectar ao WebSocket do WhatsApp.');
      },
    });
  }

  private aplicarEvento(evento: WhatsappEvento): void {
    if (evento.idOrganizacao !== this.authService.idOrganizacaoAtual()) return;

    this.mensagemEvento.set(evento.mensagem);
    this.podeConectar.set(evento.podeConectar);
    this.segundosRestantes.set(evento.segundosRestantes ?? 0);

    if (evento.status) {
      this.atualizarStatusLocal(evento.status);
    }

    if (this.segundosRestantes() > 0) {
      this.iniciarContador();
    } else {
      this.pararContador();
    }

    if (
      (evento.tipo === 'TENTATIVA_INICIADA' || evento.tipo === 'STATUS_ATUALIZADO') &&
      evento.status &&
      this.ehStatusDeTentativa(evento.status)
    ) {
      this.buscarStatusSemLoading();
    }

    if (evento.tipo === 'CONEXAO_CANCELADA') {
      this.removerQrDaTela();
      this.liberarConectar();
    }
  }

  private sincronizarBotaoComStatus(status: WhatsappStatusResponse): void {
    if (status.conectado === true) {
      this.liberarConectar();
      return;
    }

    if (this.ehStatusDeTentativa(status.status)) {
      this.podeConectar.set(false);
      return;
    }

    this.liberarConectar();
  }

  private ehStatusDeTentativa(status: string | null | undefined): boolean {
    return (
      status === 'CONECTANDO' ||
      status === 'CONNECTING' ||
      status === 'AGUARDANDO_QR' ||
      status === 'PENDING_QR'
    );
  }

  private liberarConectar(): void {
    this.podeConectar.set(true);
    this.segundosRestantes.set(0);
    this.pararContador();
  }

  private buscarStatusSemLoading(): void {
    this.whatsappService.status().subscribe({
      next: (s) => {
        this.status.set(s);
        this.sincronizarBotaoComStatus(s);
      },
    });
  }

  private iniciarContador(): void {
    if (this.countdownId) return;
    this.countdownId = setInterval(() => {
      const proximoValor = Math.max(0, this.segundosRestantes() - 1);
      this.segundosRestantes.set(proximoValor);
      if (proximoValor === 0) {
        this.pararContador();
      }
    }, 1000);
  }

  private pararContador(): void {
    if (!this.countdownId) return;
    clearInterval(this.countdownId);
    this.countdownId = null;
  }

  private atualizarStatusLocal(status: WhatsappStatusResponse['status']): void {
    const statusAtual = this.status();
    if (!statusAtual) return;
    this.status.set({ ...statusAtual, status, conectado: status === 'CONECTADO' });
  }

  private removerQrDaTela(): void {
    const statusAtual = this.status();
    if (!statusAtual) return;
    this.status.set({
      ...statusAtual,
      qr: null,
      qrImagem: null,
      conectado: false,
    });
  }
}
