import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';

import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from '../../core/auth/auth.service';
import { WhatsappEventsService } from '../../core/http/whatsapp-events.service';
import { WhatsappService } from '../../core/services/whatsapp.service';

import {
  EnviarMensagemResponse,
  StatusNotificacao,
  WhatsappEvento,
  WhatsappStatus,
  WhatsappStatusResponse,
} from '../../shared/types/dtos';

import {
  labelStatusNotificacao,
  labelWhatsappStatus,
  resolverMensagemExibicao,
} from '../../shared/labels/notificacao.labels';
import {
  labelStatusOperacional,
  severidadeOperacional,
} from '../../shared/labels/whatsapp-operacional.labels';
import {
  AcaoSessaoWhatsapp,
} from '../../shared/types/dtos';
import { criarFormularioMensagem } from './whatsapp.form';
import { formatPhone, maskPhoneInput, normalizePhone } from '../../shared/helper/phone.utils';
import {
  ehErroConsentimento,
  ehStatusDeTentativa,
  extrairMensagemErro,
  montarQrImagemSrc,
} from './whatsapp.helpers';
import { WHATSAPP_ICONS } from './whatsapp.icons';

type WhatsappConnectionStatus = WhatsappStatusResponse['status'];

@Component({
  selector: 'app-whatsapp',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
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

  protected readonly whatsappIcon = WHATSAPP_ICONS.whatsapp;
  protected readonly refreshIcon = WHATSAPP_ICONS.refresh;
  protected readonly loaderIcon = WHATSAPP_ICONS.loader;
  protected readonly sendIcon = WHATSAPP_ICONS.send;
  protected readonly checkIcon = WHATSAPP_ICONS.check;
  protected readonly xIcon = WHATSAPP_ICONS.x;
  protected readonly plugZapIcon = WHATSAPP_ICONS.plugZap;
  protected readonly qrCodeIcon = WHATSAPP_ICONS.qrCode;

  readonly status = signal<WhatsappStatusResponse | null>(null);
  readonly carregando = signal(false);
  readonly enviando = signal(false);
  readonly respostaMensagem = signal<EnviarMensagemResponse | null>(null);
  readonly erroEnvio = signal<string | null>(null);
  readonly erroConexao = signal<string | null>(null);
  readonly mensagemEvento = signal<string | null>(null);
  readonly podeConectar = signal(true);
  readonly segundosRestantes = signal(0);
  readonly acaoOperacionalCarregando = signal(false);

  readonly operacional = computed(() => this.status()?.operacional ?? null);

  readonly statusEmTentativa = computed(() =>
    ehStatusDeTentativa(this.status()?.status)
  );

  readonly tentativaEmAndamento = computed(() =>
    this.statusEmTentativa() || !this.podeConectar()
  );

  readonly conectarBloqueado = computed(() =>
    this.carregando() || !this.podeConectar() || this.statusEmTentativa()
  );

  readonly qrImagemSrc = computed(() =>
    montarQrImagemSrc(this.status()?.qrImagem)
  );

  readonly formMensagem = criarFormularioMensagem(this.fb);

  readonly formatarTelefone = formatPhone;

  atualizarTelefone(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valorFormatado = maskPhoneInput(input.value);

    this.formMensagem.controls.telefone.setValue(valorFormatado, { emitEvent: false });
    input.value = valorFormatado;
  }

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
      next: (status) => this.processarStatusRecebido(status, true),
      error: () => this.carregando.set(false),
    });
  }

  conectar(): void {
    if (this.conectarBloqueado()) return;

    this.prepararTentativaConexao();

    this.whatsappService.conectar().subscribe({
      next: (status) => this.processarStatusRecebido(status, true),
      error: (err: HttpErrorResponse) => this.tratarErroConexaoInicial(err),
    });
  }

  cancelarConexao(): void {
    this.executarAcaoDeConexao(() => this.whatsappService.cancelarConexao(), {
      onSuccess: () => {
        this.removerQrDaTela();
        this.liberarConectar();
      },
      fallbackErro: 'Erro ao cancelar conexão do WhatsApp.',
    });
  }

  desconectar(): void {
    this.executarAcaoDeConexao(() => this.whatsappService.desconectar(), {
      onSuccess: () => this.liberarConectar(),
      fallbackErro: 'Erro ao desconectar o WhatsApp.',
    });
  }

  enviarMensagem(): void {
    if (this.formMensagem.invalid) {
      this.formMensagem.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.respostaMensagem.set(null);
    this.erroEnvio.set(null);

    const { telefone, mensagem } = this.formMensagem.getRawValue();

    this.whatsappService
      .enviarMensagem({
        telefone: normalizePhone(telefone!),
        mensagem: mensagem!,
      })
      .subscribe({
        next: (resposta) => this.tratarRespostaEnvio(resposta),
        error: (err: HttpErrorResponse) => this.tratarErroEnvio(err),
      });
  }

  labelStatus(status: StatusNotificacao): string {
    return labelStatusNotificacao(status);
  }

  labelTentativaStatus(status: WhatsappStatus | null | undefined): string {
    return labelWhatsappStatus(status ?? undefined);
  }

  labelMensagemErro(mensagem?: string | null, fallback = 'Erro desconhecido'): string {
    return resolverMensagemExibicao(mensagem, null, fallback);
  }

  readonly labelStatusOperacional = labelStatusOperacional;
  readonly severidadeOperacional = severidadeOperacional;

  executarAcaoOperacional(acao: AcaoSessaoWhatsapp): void {
    if (!acao.habilitada || this.acaoOperacionalCarregando()) {
      return;
    }

    switch (acao.codigo) {
      case 'ATUALIZAR_STATUS':
        this.atualizarStatus();
        return;
      case 'CONECTAR':
        this.conectar();
        return;
      case 'DESCONECTAR':
        this.desconectar();
        return;
      case 'REATIVAR_OPERACAO':
        this.reativarOperacao();
        return;
      case 'AGUARDAR_PAUSA':
        return;
    }
  }

  classeAcaoOperacional(acao: AcaoSessaoWhatsapp): string {
    const base =
      'w-full font-semibold py-2.5 rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2 border';
    if (!acao.habilitada) {
      return `${base} opacity-50 cursor-not-allowed bg-[var(--color-surface-muted)] border-[var(--color-border)] text-[var(--color-text-muted)]`;
    }
    if (acao.primaria) {
      return `${base} bg-[var(--color-primary)] hover:brightness-110 text-[var(--color-bg-base)] border-transparent`;
    }
    return `${base} bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]`;
  }

  private reativarOperacao(): void {
    this.acaoOperacionalCarregando.set(true);
    this.erroConexao.set(null);

    this.whatsappService.reativarOperacao().subscribe({
      next: (status) => {
        this.processarStatusRecebido(status, true);
        this.acaoOperacionalCarregando.set(false);
        this.mensagemEvento.set('Sessão reativada. A fila de envios pode retomar.');
      },
      error: (err: HttpErrorResponse) => {
        this.acaoOperacionalCarregando.set(false);
        this.erroConexao.set(extrairMensagemErro(err, 'Não foi possível reativar a sessão.'));
      },
    });
  }

  labelStatusAtual(): string {
    const atual = this.status();

    if (!atual) {
      return this.carregando() ? 'Carregando...' : 'Desconhecido';
    }

    return this.labelTentativaStatus(atual.status);
  }

  ehErroConsentimento(mensagem: string | null | undefined): boolean {
    return ehErroConsentimento(mensagem);
  }

  private buscarStatusSemLoading(): void {
    this.whatsappService.status().subscribe({
      next: (status) => this.processarStatusRecebido(status, false),
    });
  }

  private processarStatusRecebido(
    status: WhatsappStatusResponse,
    finalizarLoading: boolean
  ): void {
    this.status.set(status);
    this.sincronizarBotaoComStatus(status);

    if (finalizarLoading) {
      this.carregando.set(false);
    }

    if (!status.qrImagem && ehStatusDeTentativa(status.status)) {
      this.buscarStatusSemLoading();
    }
  }

  private prepararTentativaConexao(): void {
    this.carregando.set(true);
    this.erroConexao.set(null);
    this.mensagemEvento.set(null);
    this.podeConectar.set(false);
    this.segundosRestantes.set(30);
    this.iniciarContador();
  }

  private tratarErroConexaoInicial(err: HttpErrorResponse): void {
    this.carregando.set(false);

    if (err.status === 409) {
      this.erroConexao.set(
        'Conexão WhatsApp em andamento. Aguarde alguns segundos ou cancele a tentativa atual.'
      );
      this.podeConectar.set(false);
      return;
    }

    this.erroConexao.set(
      extrairMensagemErro(err, 'Erro ao iniciar conexão do WhatsApp.')
    );

    this.liberarConectar();
  }

  private executarAcaoDeConexao(
    acao: () => Observable<WhatsappStatusResponse>,
    options: {
      onSuccess?: (status: WhatsappStatusResponse) => void;
      fallbackErro: string;
    }
  ): void {
    this.carregando.set(true);
    this.erroConexao.set(null);

    acao().subscribe({
      next: (status) => {
        this.status.set(status);
        this.carregando.set(false);
        options.onSuccess?.(status);
      },
      error: (err: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erroConexao.set(extrairMensagemErro(err, options.fallbackErro));
      },
    });
  }

  private sincronizarBotaoComStatus(status: WhatsappStatusResponse): void {
    if (status.conectado === true) {
      this.liberarConectar();
      return;
    }

    if (ehStatusDeTentativa(status.status)) {
      this.podeConectar.set(false);
      return;
    }

    this.liberarConectar();
  }

  private liberarConectar(): void {
    this.podeConectar.set(true);
    this.segundosRestantes.set(0);
    this.pararContador();
  }

  private tratarRespostaEnvio(resposta: EnviarMensagemResponse): void {
    this.respostaMensagem.set(resposta);
    this.enviando.set(false);

    if (resposta.sucesso) {
      this.formMensagem.reset();
    }
  }

  private tratarErroEnvio(err: HttpErrorResponse): void {
    this.erroEnvio.set(
      extrairMensagemErro(err, 'Erro de comunicação com a API.')
    );
    this.enviando.set(false);
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
    if (!this.eventoPertenceOrganizacaoAtual(evento)) return;

    this.mensagemEvento.set(evento.mensagem);
    this.podeConectar.set(evento.podeConectar);
    this.segundosRestantes.set(evento.segundosRestantes ?? 0);

    if (evento.status) {
      this.atualizarStatusLocal(evento.status);
    }

    this.sincronizarContadorComEvento();

    if (this.deveBuscarStatusAposEvento(evento)) {
      this.buscarStatusSemLoading();
    }

    if (evento.tipo === 'CONEXAO_CANCELADA') {
      this.removerQrDaTela();
      this.liberarConectar();
    }
  }

  private eventoPertenceOrganizacaoAtual(evento: WhatsappEvento): boolean {
    return evento.idOrganizacao === this.authService.idOrganizacaoAtual();
  }

  private atualizarStatusLocal(status: WhatsappConnectionStatus): void {
    const statusAtual = this.status();

    if (!statusAtual) return;

    this.status.set({
      ...statusAtual,
      status,
      conectado: status === 'CONECTADO',
    });
  }

  private sincronizarContadorComEvento(): void {
    if (this.segundosRestantes() > 0) {
      this.iniciarContador();
      return;
    }

    this.pararContador();
  }

  private deveBuscarStatusAposEvento(evento: WhatsappEvento): boolean {
    const eventoAtualizaTentativa =
      evento.tipo === 'TENTATIVA_INICIADA' || evento.tipo === 'STATUS_ATUALIZADO';

    return (
      eventoAtualizaTentativa &&
      !!evento.status &&
      ehStatusDeTentativa(evento.status)
    );
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
