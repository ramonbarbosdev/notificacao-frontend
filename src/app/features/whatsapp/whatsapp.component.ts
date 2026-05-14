import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  LucideAngularModule,
  MessageCircle,
  RefreshCw,
  LoaderCircle,
  Send,
  Check,
  X,
  PlugZap,
  QrCode,
} from 'lucide-angular';

import {  SidebarComponent } from '../../core/layout/layout.components';
import { AuthService } from '../../core/auth/auth.service';
import { WhatsappEventsService } from '../../core/http/whatsapp-events.service';
import { WhatsappService } from '../../core/http/services';

import {
  EnviarMensagemResponse,
  WhatsappEvento,
  WhatsappStatusResponse,
} from '../../shared/types/dtos';
import { HeaderComponent } from '../../core/layout/header/header.component';

@Component({
  selector: 'app-whatsapp',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    SidebarComponent,
    HeaderComponent,
  ],
  templateUrl: './whatsapp.component.html',
})
export class WhatsappComponent implements OnInit, OnDestroy {
  private readonly whatsappService = inject(WhatsappService);
  private readonly whatsappEventsService = inject(WhatsappEventsService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  private countdownId: ReturnType<typeof setInterval> | null = null;
  private eventosSubscription: Subscription | null = null;

  protected readonly whatsappIcon = MessageCircle;
  protected readonly refreshIcon = RefreshCw;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly sendIcon = Send;
  protected readonly checkIcon = Check;
  protected readonly xIcon = X;
  protected readonly plugZapIcon = PlugZap;
  protected readonly qrCodeIcon = QrCode;

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

    return qrImagem.startsWith('data:image/')
      ? qrImagem
      : `data:image/png;base64,${qrImagem}`;
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
      next: (status) => {
        this.status.set(status);
        this.carregando.set(false);
        this.sincronizarBotaoComStatus(status);

        if (!status.qrImagem && this.ehStatusDeTentativa(status.status)) {
          this.buscarStatusSemLoading();
        }
      },
      error: () => {
        this.carregando.set(false);
      },
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
      next: (status) => {
        this.status.set(status);
        this.carregando.set(false);
        this.sincronizarBotaoComStatus(status);
      },
      error: (err: HttpErrorResponse) => {
        this.carregando.set(false);

        if (err.status === 409) {
          this.erroConexao.set(
            'Conexão WhatsApp em andamento. Aguarde alguns segundos ou cancele a tentativa atual.'
          );
          this.podeConectar.set(false);
          return;
        }

        this.erroConexao.set(
          err.error?.mensagem ??
          err.error?.erro ??
          'Erro ao iniciar conexão do WhatsApp.'
        );

        this.liberarConectar();
      },
    });
  }

  cancelarConexao(): void {
    this.carregando.set(true);
    this.erroConexao.set(null);

    this.whatsappService.cancelarConexao().subscribe({
      next: (status) => {
        this.status.set(status);
        this.carregando.set(false);
        this.removerQrDaTela();
        this.liberarConectar();
      },
      error: (err: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erroConexao.set(
          err.error?.mensagem ??
          err.error?.erro ??
          'Erro ao cancelar conexão do WhatsApp.'
        );
      },
    });
  }

  desconectar(): void {
    this.carregando.set(true);
    this.erroConexao.set(null);

    this.whatsappService.desconectar().subscribe({
      next: (status) => {
        this.status.set(status);
        this.carregando.set(false);
        this.liberarConectar();
      },
      error: () => {
        this.carregando.set(false);
      },
    });
  }

  enviarMensagem(): void {
    if (this.formMensagem.invalid) return;

    this.enviando.set(true);
    this.respostaMensagem.set(null);
    this.erroEnvio.set(null);

    const { telefone, mensagem } = this.formMensagem.getRawValue();

    this.whatsappService
      .enviarMensagem({
        telefone: telefone!,
        mensagem: mensagem!,
      })
      .subscribe({
        next: (resposta) => {
          this.respostaMensagem.set(resposta);
          this.enviando.set(false);

          if (resposta.sucesso) {
            this.formMensagem.reset();
          }
        },
        error: (err) => {
          this.erroEnvio.set(
            err.error?.mensagem ??
            err.error?.erro ??
            'Erro de comunicação com a API.'
          );

          this.enviando.set(false);
        },
      });
  }

  private conectarEventosDaOrganizacao(): void {
    const idOrganizacao = this.authService.idOrganizacaoAtual();

    if (!idOrganizacao) return;

    this.eventosSubscription = this.whatsappEventsService
      .conectar(idOrganizacao)
      .subscribe({
        next: (evento) => this.aplicarEvento(evento),
        error: (err: Error) => {
          this.erroConexao.set(
            err.message || 'Não foi possível conectar ao WebSocket do WhatsApp.'
          );
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
      next: (status) => {
        this.status.set(status);
        this.sincronizarBotaoComStatus(status);
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

    this.status.set({
      ...statusAtual,
      status,
      conectado: status === 'CONECTADO',
    });
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