import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, Subscription, timer } from 'rxjs';

import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from '../../core/auth/auth.service';
import { NotificacaoFilaEventsService } from '../../core/http/notificacao-fila-events.service';
import { NotificacaoService } from '../../core/services/notificacao.service';
import { WhatsappEventsService } from '../../core/http/whatsapp-events.service';
import { WhatsappService } from '../../core/services/whatsapp.service';

import {
  EnviarMensagemResponse,
  EnviarNotificacaoLoteResponse,
  NotificacaoFilaEvento,
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
import {
  criarFormularioLote,
  criarItemLoteFormulario,
  itensLoteFormulario,
} from './whatsapp-lote.form';
import {
  aplicarLinhasNoFormularioLote,
  LIMITE_LOTE_MENSAGENS,
  parseLinhasImportacaoLote,
} from './whatsapp-lote.helpers';
import { formatPhone, normalizeBrazilWhatsappMobile } from '../../shared/helper/phone.utils';
import { ContatoTelefoneSugestoesComponent } from '../../shared/components/contato-telefone-sugestoes/contato-telefone-sugestoes.component';
import {
  ehErroConsentimento,
  ehStatusDeTentativa,
  extrairMensagemErro,
  detalheErroEnvio,
  montarQrImagemSrc,
  ehWhatsappConectado,
} from './whatsapp.helpers';
import { WHATSAPP_ICONS } from './whatsapp.icons';

type WhatsappConnectionStatus = WhatsappStatusResponse['status'];
type ModoEnvioWhatsapp = 'unitario' | 'lote';

@Component({
  selector: 'app-whatsapp',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
    ContatoTelefoneSugestoesComponent,
  ],
  templateUrl: './whatsapp.component.html',
})
export class WhatsappComponent implements OnInit, OnDestroy {
  private readonly whatsappService = inject(WhatsappService);
  private readonly whatsappEventsService = inject(WhatsappEventsService);
  private readonly notificacaoService = inject(NotificacaoService);
  private readonly filaEventsService = inject(NotificacaoFilaEventsService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  private countdownId: ReturnType<typeof setInterval> | null = null;
  private eventosSubscription: Subscription | null = null;
  private filaEventsSubscription: Subscription | null = null;
  private acompanhamentoPollSub: Subscription | null = null;
  private statusPollSub: Subscription | null = null;

  protected readonly whatsappIcon = WHATSAPP_ICONS.whatsapp;
  protected readonly refreshIcon = WHATSAPP_ICONS.refresh;
  protected readonly loaderIcon = WHATSAPP_ICONS.loader;
  protected readonly sendIcon = WHATSAPP_ICONS.send;
  protected readonly checkIcon = WHATSAPP_ICONS.check;
  protected readonly xIcon = WHATSAPP_ICONS.x;
  protected readonly plugZapIcon = WHATSAPP_ICONS.plugZap;
  protected readonly qrCodeIcon = WHATSAPP_ICONS.qrCode;
  protected readonly plusIcon = WHATSAPP_ICONS.plus;
  protected readonly trashIcon = WHATSAPP_ICONS.trash;
  protected readonly layersIcon = WHATSAPP_ICONS.layers;

  readonly limiteLoteMensagens = LIMITE_LOTE_MENSAGENS;
  readonly modoEnvio = signal<ModoEnvioWhatsapp>('unitario');

  readonly status = signal<WhatsappStatusResponse | null>(null);
  readonly carregando = signal(false);
  readonly enviando = signal(false);
  readonly enviandoLote = signal(false);
  readonly respostaMensagem = signal<EnviarMensagemResponse | null>(null);
  readonly respostaLote = signal<EnviarNotificacaoLoteResponse | null>(null);
  readonly erroEnvio = signal<string | null>(null);
  readonly erroEnvioLote = signal<string | null>(null);
  readonly erroConexao = signal<string | null>(null);
  readonly mensagemEvento = signal<string | null>(null);
  readonly podeConectar = signal(true);
  readonly segundosRestantes = signal(0);
  readonly acaoOperacionalCarregando = signal(false);
  readonly acompanhandoEnvio = signal(false);
  readonly avisoProvisionamento = signal<string | null>(null);

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

  readonly sessaoConectada = computed(() =>
    ehWhatsappConectado(this.status()?.status, this.status()?.conectado)
  );

  readonly formMensagem = criarFormularioMensagem(this.fb);
  readonly formLote = criarFormularioLote(this.fb);

  readonly itensLote = itensLoteFormulario(this.formLote);

  readonly formatarTelefone = formatPhone;

  telefoneLoteControl(indice: number) {
    return this.itensLote.at(indice).get('telefone') as FormControl<string | null>;
  }

  alternarModoEnvio(modo: ModoEnvioWhatsapp): void {
    this.modoEnvio.set(modo);
    this.erroEnvio.set(null);
    this.erroEnvioLote.set(null);
  }

  adicionarLinhaLote(): void {
    if (this.itensLote.length >= this.limiteLoteMensagens) {
      return;
    }

    this.itensLote.push(criarItemLoteFormulario(this.fb));
  }

  removerLinhaLote(indice: number): void {
    if (this.itensLote.length <= 1) {
      this.itensLote.at(0).reset({
        telefone: '',
        mensagem: '',
        referenciaExterna: '',
      });
      return;
    }

    this.itensLote.removeAt(indice);
  }

  importarLinhasLote(): void {
    const texto = String(this.formLote.get('importacaoRapida')?.value ?? '');
    const linhas = parseLinhasImportacaoLote(texto);

    if (linhas.length === 0) {
      this.erroEnvioLote.set(
        'Nenhuma linha válida encontrada. Use o formato telefone;mensagem ou telefone;mensagem;referencia.',
      );
      return;
    }

    aplicarLinhasNoFormularioLote(this.fb, this.itensLote, linhas);
    this.erroEnvioLote.set(null);
    this.formLote.patchValue({ importacaoRapida: '' });
  }

  ngOnInit(): void {
    this.conectarEventosDaOrganizacao();
    this.conectarEventosFila();
    this.provisionarCanalWhatsapp();
  }

  private provisionarCanalWhatsapp(): void {
    this.whatsappService.provisionarConfig().subscribe({
      next: (resposta) => {
        if (resposta.criada) {
          this.avisoProvisionamento.set('Canal WhatsApp ativado para esta organização.');
        } else if (resposta.reativada) {
          this.avisoProvisionamento.set('Canal WhatsApp reativado para esta organização.');
        }
        this.atualizarStatus();
      },
      error: () => this.atualizarStatus(),
    });
  }

  ngOnDestroy(): void {
    this.pararContador();
    this.pararPollingStatus();
    this.eventosSubscription?.unsubscribe();
    this.filaEventsSubscription?.unsubscribe();
    this.acompanhamentoPollSub?.unsubscribe();
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
      onSuccess: () => {
        this.removerQrDaTela();
        this.liberarConectar();
        this.mensagemEvento.set(
          'Sessão desconectada. Tokens e arquivos locais foram removidos. Conecte novamente para escanear o QR Code.'
        );
      },
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
        telefone: normalizeBrazilWhatsappMobile(telefone!),
        mensagem: mensagem!,
      })
      .subscribe({
        next: (resposta) => this.tratarRespostaEnvio(resposta),
        error: (err: HttpErrorResponse) => this.tratarErroEnvio(err),
      });
  }

  enviarLote(): void {
    const mensagens = this.itensLote.controls
      .map((grupo) => grupo.getRawValue())
      .filter((item) => String(item.telefone ?? '').trim() || String(item.mensagem ?? '').trim())
      .map((item) => ({
        telefone: String(item.telefone ?? ''),
        mensagem: String(item.mensagem ?? ''),
        referenciaExterna: String(item.referenciaExterna ?? ''),
      }));

    if (mensagens.length === 0) {
      this.erroEnvioLote.set('Informe ao menos uma mensagem no lote.');
      this.formLote.markAllAsTouched();
      return;
    }

    const invalida = mensagens.find((item) => {
      const digits = normalizeBrazilWhatsappMobile(item.telefone);
      return digits.length < 12 || digits.length > 13 || !item.mensagem.trim();
    });

    if (invalida) {
      this.erroEnvioLote.set('Revise telefone e mensagem em todas as linhas preenchidas.');
      this.formLote.markAllAsTouched();
      return;
    }

    if (mensagens.length > this.limiteLoteMensagens) {
      this.erroEnvioLote.set(`O lote aceita no máximo ${this.limiteLoteMensagens} mensagens.`);
      return;
    }

    this.enviandoLote.set(true);
    this.respostaLote.set(null);
    this.erroEnvioLote.set(null);

    this.notificacaoService
      .enviarLote({
        canal: 'WHATSAPP',
        mensagens: mensagens.map((item) => ({
          destinatario: normalizeBrazilWhatsappMobile(item.telefone),
          assunto: item.referenciaExterna || null,
          mensagem: item.mensagem,
          referenciaExterna: item.referenciaExterna || null,
        })),
      })
      .subscribe({
        next: (resposta) => {
          this.respostaLote.set(resposta);
          this.enviandoLote.set(false);

          if (resposta.sucesso) {
            this.formLote.reset();
            this.itensLote.clear();
            this.itensLote.push(criarItemLoteFormulario(this.fb));
            this.itensLote.push(criarItemLoteFormulario(this.fb));
            this.itensLote.push(criarItemLoteFormulario(this.fb));
          }
        },
        error: (err: HttpErrorResponse) => {
          this.erroEnvioLote.set(
            extrairMensagemErro(err, 'Erro ao enviar lote de mensagens.'),
          );
          this.enviandoLote.set(false);
        },
      });
  }

  labelStatus(status: StatusNotificacao): string {
    return labelStatusNotificacao(status);
  }

  statusEnvioSucesso(status: StatusNotificacao | null | undefined): boolean {
    return !!status && ['ENVIADA', 'ENTREGUE', 'LIDA'].includes(status);
  }

  statusEnvioPendente(status: StatusNotificacao | null | undefined): boolean {
    return status === 'PENDENTE' || status === 'PROCESSANDO';
  }

  envioFalhou(status: StatusNotificacao | null | undefined): boolean {
    return status === 'FALHOU' || status === 'BLOQUEADA' || status === 'CANCELADA';
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

  detalheErro(mensagem: string | null | undefined) {
    return detalheErroEnvio(mensagem);
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

    this.gerenciarPollingStatus();
  }

  private deveContinuarPollingStatus(status: WhatsappStatusResponse | null): boolean {
    if (!status) {
      return false;
    }

    if (ehWhatsappConectado(status.status, status.conectado)) {
      return false;
    }

    return ehStatusDeTentativa(status.status) || !!status.qrImagem;
  }

  private gerenciarPollingStatus(): void {
    if (this.deveContinuarPollingStatus(this.status())) {
      this.iniciarPollingStatus();
      return;
    }

    this.pararPollingStatus();
  }

  private iniciarPollingStatus(): void {
    if (this.statusPollSub) {
      return;
    }

    this.statusPollSub = timer(3000, 3000).subscribe(() => {
      if (!this.deveContinuarPollingStatus(this.status())) {
        this.pararPollingStatus();
        return;
      }

      this.buscarStatusSemLoading();
    });
  }

  private pararPollingStatus(): void {
    this.statusPollSub?.unsubscribe();
    this.statusPollSub = null;
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
    if (ehWhatsappConectado(status.status, status.conectado)) {
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

    if (!resposta.sucesso) {
      this.enviando.set(false);
      return;
    }

    this.acompanharStatusEnvio(resposta.idNotificacao);
  }

  private conectarEventosFila(): void {
    const idOrganizacao = this.authService.idOrganizacaoAtual();
    if (!idOrganizacao) return;

    this.filaEventsSubscription = this.filaEventsService.conectar(idOrganizacao).subscribe({
      next: (evento) => this.processarEventoFila(evento),
    });
  }

  private processarEventoFila(evento: NotificacaoFilaEvento): void {
    const resposta = this.respostaMensagem();
    if (!resposta?.idNotificacao || evento.idNotificacao !== resposta.idNotificacao) {
      return;
    }

    if (!evento.status) return;

    this.atualizarStatusResposta(
      evento.status,
      evento.erro ?? null,
      evento.motivoAguardando ?? null,
    );
  }

  private acompanharStatusEnvio(idNotificacao: number): void {
    this.acompanhandoEnvio.set(true);
    this.acompanhamentoPollSub?.unsubscribe();

    let tentativas = 0;
    this.acompanhamentoPollSub = timer(0, 3000).subscribe(() => {
      const atual = this.respostaMensagem();
      if (atual && this.statusEnvioConcluido(atual.status)) {
        this.finalizarAcompanhamento();
        return;
      }

      if (tentativas++ > 20) {
        this.finalizarAcompanhamento();
        return;
      }

      this.notificacaoService.listar({ page: 0, size: 30 }).subscribe({
        next: (pagina) => {
          const item = pagina.data.find((linha) => linha.idNotificacao === idNotificacao);
          if (!item) return;

          this.atualizarStatusResposta(
            item.status,
            item.erro,
            item.motivoAguardando ?? null,
          );

          if (this.statusEnvioConcluido(item.status)) {
            this.finalizarAcompanhamento();
          }
        },
      });
    });
  }

  private atualizarStatusResposta(
    status: StatusNotificacao,
    erro: string | null,
    motivoAguardando: string | null,
  ): void {
    const atual = this.respostaMensagem();
    if (!atual) return;

    this.respostaMensagem.set({
      ...atual,
      status,
      erro,
      motivoAguardando,
      sucesso: !this.envioFalhou(status),
    });
  }

  private statusEnvioConcluido(status: StatusNotificacao): boolean {
    return this.statusEnvioSucesso(status) || this.envioFalhou(status);
  }

  private finalizarAcompanhamento(): void {
    this.acompanhandoEnvio.set(false);
    this.enviando.set(false);
    this.acompanhamentoPollSub?.unsubscribe();
    this.acompanhamentoPollSub = null;

    if (this.statusEnvioSucesso(this.respostaMensagem()?.status)) {
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
      conectado: ehWhatsappConectado(status, statusAtual.conectado),
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
    return (
      evento.tipo === 'TENTATIVA_INICIADA'
      || evento.tipo === 'STATUS_ATUALIZADO'
      || evento.tipo === 'CONEXAO_LIBERADA'
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
