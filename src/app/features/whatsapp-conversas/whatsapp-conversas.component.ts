import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  ArrowLeft,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudDownload,
  LoaderCircle,
  LucideAngularModule,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Square,
  Trash2,
} from 'lucide-angular';
import { Subscription } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { WhatsappEventsService } from '../../core/http/whatsapp-events.service';
import { NotificacaoFilaEventsService } from '../../core/http/notificacao-fila-events.service';
import { CommandDialogService } from '../../core/services/command-dialog.service';
import { WhatsappConversasService } from '../../core/services/whatsapp-conversas.service';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { formatDateTimePtBr, formatRelativeTimePtBr } from '../../shared/helper/date.utils';
import { usePaginatedTable } from '../../shared/helper/paginated-table.state';
import { formatPhone, formatPhoneNationalDigits, normalizeBrazilWhatsappMobile } from '../../shared/helper/phone.utils';
import { WhatsappConversaAba, WhatsappConversaResponse, WhatsappMensagemDirecao, WhatsappMensagemResponse, StatusNotificacao, EnviarMensagemResponse } from '../../shared/types/dtos';
import { WhatsappEditorMensagemComponent } from '../../shared/components/whatsapp-editor-mensagem/whatsapp-editor-mensagem.component';
import { WhatsappHtmlPipe } from '../../shared/pipes/whatsapp-html.pipe';
import { ehWhatsappConectado, extrairMensagemErro } from '../whatsapp/whatsapp.helpers';
import {
  DestinatarioNovaMensagem,
  WhatsappNovaMensagemModalComponent,
} from './whatsapp-nova-mensagem-modal/whatsapp-nova-mensagem-modal.component';

type FiltroProntoWhatsapp = '' | 'true' | 'false';
type FiltroNaoLida = '' | 'true';
type FiltroUltimaDirecao = '' | WhatsappMensagemDirecao;
type FiltroPainel = 'todos' | 'pendente' | 'falha';
type SituacaoConversa = 'ok' | 'pendente' | 'falha';
type PainelMobile = 'lista' | 'chat';
type StatusEnvioChat = 'ENFILEIRADA' | 'PROCESSANDO' | 'ENVIADA' | 'FALHOU';

interface MensagemChatView extends WhatsappMensagemResponse {
  idNotificacaoPendente?: number;
  statusEnvioChat?: StatusEnvioChat;
}

interface AbaConversa {
  id: WhatsappConversaAba;
  label: string;
  descricao: string;
}

interface FiltroPainelOpcao {
  id: FiltroPainel;
  label: string;
}

interface BadgeConversa {
  classe: string;
  texto: string;
  acionavel: boolean;
}

@Component({
  selector: 'app-whatsapp-conversas',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    LucideAngularModule,
    WhatsappEditorMensagemComponent,
    WhatsappHtmlPipe,
    WhatsappNovaMensagemModalComponent,
  ],
  templateUrl: './whatsapp-conversas.component.html',
})
export class WhatsappConversasComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly conversasService = inject(WhatsappConversasService);
  private readonly whatsappService = inject(WhatsappService);
  private readonly commandDialog = inject(CommandDialogService);
  private readonly whatsappEventsService = inject(WhatsappEventsService);
  private readonly filaEventsService = inject(NotificacaoFilaEventsService);
  private readonly authService = inject(AuthService);

  private eventosSubscription: Subscription | null = null;
  private filaEventsSubscription: Subscription | null = null;

  protected readonly refreshIcon = RefreshCw;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly checkIcon = Check;
  protected readonly messageIcon = MessageSquare;
  protected readonly trashIcon = Trash2;
  protected readonly searchIcon = Search;
  protected readonly chevronLeftIcon = ChevronLeft;
  protected readonly chevronRightIcon = ChevronRight;
  protected readonly syncIcon = CloudDownload;
  protected readonly arrowLeftIcon = ArrowLeft;
  protected readonly plusIcon = Plus;
  protected readonly sendIcon = Send;
  protected readonly clockIcon = Clock;
  protected readonly checkSquareIcon = CheckSquare;
  protected readonly squareIcon = Square;

  readonly formChat = this.fb.group({
    mensagem: ['', [Validators.required, Validators.minLength(1)]],
  });

  readonly filtrosPainel: FiltroPainelOpcao[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'pendente', label: 'Acao pendente' },
    { id: 'falha', label: 'Atencao' },
  ];

  readonly abas: AbaConversa[] = [
    {
      id: 'INBOX',
      label: 'Inbox',
      descricao: 'Historico salvo na plataforma (mensagens recebidas e envios da fila).',
    },
    {
      id: 'SESSAO',
      label: 'Prontos na sessao',
      descricao: 'Contatos com tctoken na sessao WhatsApp conectada, prontos para a API enviar.',
    },
  ];

  readonly table = usePaginatedTable(10);

  readonly conversas = signal<WhatsappConversaResponse[]>([]);
  readonly erro = signal<string | null>(null);
  readonly acaoTelefone = signal<string | null>(null);
  readonly mensagemSucesso = signal<string | null>(null);
  readonly abaAtiva = signal<WhatsappConversaAba>('SESSAO');
  readonly filtroPainel = signal<FiltroPainel>('todos');
  readonly telefoneSessao = signal<string | null>(null);
  readonly sessaoConectada = signal(false);
  readonly carregandoStatus = signal(false);

  readonly filtroBusca = signal('');
  readonly filtroProntoWhatsapp = signal<FiltroProntoWhatsapp>('');
  readonly filtroNaoLida = signal<FiltroNaoLida>('');
  readonly filtroUltimaDirecao = signal<FiltroUltimaDirecao>('');

  readonly conversaSelecionada = signal<WhatsappConversaResponse | null>(null);
  readonly mensagens = signal<MensagemChatView[]>([]);
  readonly carregandoMensagens = signal(false);
  readonly carregandoMais = signal(false);
  readonly fimHistorico = signal(false);
  readonly sincronizandoHistorico = signal(false);
  readonly painelMobile = signal<PainelMobile>('lista');
  readonly modalNovaMensagemAberto = signal(false);
  readonly modoSelecao = signal(false);
  readonly telefonesSelecionados = signal<Set<string>>(new Set());
  readonly destinatariosModal = signal<DestinatarioNovaMensagem[]>([]);
  readonly enviandoMensagem = signal(false);

  readonly abaDescricao = computed(
    () => this.abas.find((item) => item.id === this.abaAtiva())?.descricao ?? '',
  );

  readonly tituloPainel = computed(() =>
    this.abaAtiva() === 'SESSAO' ? 'Contatos prontos na sessao' : 'Historico na plataforma',
  );

  readonly conversasExibidas = computed(() => {
    const filtro = this.filtroPainel();

    return this.conversas().filter((conversa) => {
      const situacao = this.situacaoConversa(conversa);

      if (filtro === 'pendente') {
        return situacao === 'pendente';
      }

      if (filtro === 'falha') {
        return situacao === 'falha';
      }

      return true;
    });
  });

  readonly metricas = computed(() => {
    const itens = this.conversas();
    const total = this.table.totalElementos();

    if (this.abaAtiva() === 'SESSAO') {
      return {
        principalLabel: 'Prontos na sessao',
        principal: itens.filter((item) => item.prontoParaEnvioWhatsapp).length,
        secundarioLabel: 'So na sessao',
        secundario: itens.filter((item) => item.origem === 'SESSAO').length,
        alertaLabel: 'Aguardando acao',
        alerta: itens.filter((item) => this.situacaoConversa(item) !== 'ok').length,
      };
    }

    return {
      principalLabel: 'Conversas na inbox',
      principal: total,
      secundarioLabel: 'Nao lidas',
      secundario: itens.filter((item) => item.naoLida).length,
      alertaLabel: 'Pendentes',
      alerta: itens.filter((item) => this.situacaoConversa(item) === 'pendente').length,
    };
  });

  readonly totalProntasPagina = computed(
    () => this.conversas().filter((item) => item.prontoParaEnvioWhatsapp).length,
  );

  readonly resumoOrigem = computed(() => {
    const itens = this.conversas();
    return {
      inbox: itens.filter((item) => item.origem === 'INBOX').length,
      sessao: itens.filter((item) => item.origem === 'SESSAO').length,
      sincronizada: itens.filter((item) => item.origem === 'SINCRONIZADA').length,
    };
  });

  readonly conversaSelecionadaAtiva = computed(() => {
    const selecionada = this.conversaSelecionada();
    if (!selecionada) {
      return null;
    }

    return this.conversas().find((item) => this.mesmoTelefone(item.telefone, selecionada.telefone)) ?? selecionada;
  });

  readonly podeSincronizarInbox = (conversa: WhatsappConversaResponse): boolean =>
    conversa.origem === 'SESSAO' && !conversa.registradaNaApi;

  readonly formatarTelefone = formatPhone;
  readonly formatPhoneNationalDigits = formatPhoneNationalDigits;
  readonly formatarData = formatDateTimePtBr;
  readonly tempoExibicao = formatRelativeTimePtBr;

  ngOnInit(): void {
    this.carregarStatusSessao();
    this.conectarEventos();
    this.conectarFilaEventos();
  }

  ngOnDestroy(): void {
    this.eventosSubscription?.unsubscribe();
    this.filaEventsSubscription?.unsubscribe();
  }

  carregar(): void {
    this.table.loading.set(true);
    this.erro.set(null);

    this.conversasService
      .listar({
        page: this.table.paginaAtual(),
        size: this.table.tamanhoPagina(),
        busca: this.filtroBusca().trim() || undefined,
        prontoParaEnvioWhatsapp: this.parseBooleanFiltro(this.filtroProntoWhatsapp()),
        naoLida: this.parseBooleanFiltro(this.filtroNaoLida()),
        ultimaDirecaoMensagem: this.filtroUltimaDirecao() || undefined,
        aba: this.abaAtiva(),
      })
      .subscribe({
        next: (page) => {
          this.conversas.set(page.data);
          this.table.atualizarPaginacao(page);
          this.table.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.erro.set(err.error?.message || 'Nao foi possivel carregar as conversas.');
          this.table.loading.set(false);
        },
      });
  }

  aplicarFiltros(): void {
    this.table.aplicarFiltros(() => this.carregar());
  }

  limparFiltros(): void {
    this.filtroBusca.set('');
    this.filtroProntoWhatsapp.set('');
    this.filtroNaoLida.set('');
    this.filtroUltimaDirecao.set('');
    this.filtroPainel.set('todos');
    this.aplicarFiltros();
  }

  selecionarAba(aba: WhatsappConversaAba): void {
    if (this.abaAtiva() === aba) {
      return;
    }

    this.abaAtiva.set(aba);
    this.filtroPainel.set('todos');
    this.mensagemSucesso.set(null);
    this.erro.set(null);
    this.fecharChat();
    this.table.aplicarFiltros(() => this.carregar());
  }

  selecionarConversa(conversa: WhatsappConversaResponse): void {
    if (this.modoSelecao()) {
      this.toggleSelecaoConversa(conversa);
      return;
    }

    this.conversaSelecionada.set(conversa);
    this.painelMobile.set('chat');
    this.mensagemSucesso.set(null);
    this.erro.set(null);
    this.formChat.reset({ mensagem: '' });
    this.carregarThread(conversa.telefone);
  }

  enviarMensagemChat(event?: Event): void {
    event?.preventDefault();
    const conversa = this.conversaSelecionadaAtiva();
    if (!conversa) {
      return;
    }

    if (!this.sessaoConectada()) {
      this.erro.set('Conecte o WhatsApp antes de enviar mensagens.');
      return;
    }

    if (this.formChat.invalid) {
      this.formChat.markAllAsTouched();
      return;
    }

    const mensagem = this.formChat.controls.mensagem.value?.trim() ?? '';
    if (!mensagem) {
      return;
    }

    this.enviandoMensagem.set(true);
    this.erro.set(null);

    const mensagemPendente = this.criarMensagemEnfileirada(
      conversa.telefone,
      mensagem,
      null,
      'PROCESSANDO',
    );
    this.mensagens.update((lista) => [...lista, mensagemPendente]);
    this.rolarParaFimTimeline();

    this.whatsappService
      .enviarMensagem({
        telefone: normalizeBrazilWhatsappMobile(conversa.telefone),
        mensagem,
      })
      .subscribe({
        next: (resposta) => {
          this.enviandoMensagem.set(false);
          this.formChat.reset({ mensagem: '' });
          this.confirmarMensagemEnfileirada(mensagemPendente, resposta);
          this.mensagemSucesso.set('Mensagem enfileirada com sucesso.');
          this.carregar();
          this.rolarParaFimTimeline();
        },
        error: (err: HttpErrorResponse) => {
          this.enviandoMensagem.set(false);
          this.removerMensagemPendente(mensagemPendente);
          this.erro.set(extrairMensagemErro(err, 'Nao foi possivel enfileirar a mensagem.'));
        },
      });
  }

  abrirEnvioLote(destinatarios: DestinatarioNovaMensagem[] = []): void {
    if (!this.sessaoConectada()) {
      this.erro.set('Conecte o WhatsApp antes de enviar mensagens.');
      return;
    }

    this.destinatariosModal.set(destinatarios);
    this.modalNovaMensagemAberto.set(true);
    this.erro.set(null);
  }

  fecharNovaMensagem(): void {
    this.modalNovaMensagemAberto.set(false);
    this.destinatariosModal.set([]);
  }

  onLoteEnviado(total: number): void {
    this.mensagemSucesso.set(`${total} mensagens enfileiradas com sucesso.`);
    this.modoSelecao.set(false);
    this.telefonesSelecionados.set(new Set());
    this.carregar();
  }

  alternarModoSelecao(): void {
    const ativo = !this.modoSelecao();
    this.modoSelecao.set(ativo);
    if (!ativo) {
      this.telefonesSelecionados.set(new Set());
    }
  }

  toggleSelecaoConversa(conversa: WhatsappConversaResponse): void {
    const canonico = normalizeBrazilWhatsappMobile(conversa.telefone);
    const atual = new Set(this.telefonesSelecionados());

    if (atual.has(canonico)) {
      atual.delete(canonico);
    } else {
      atual.add(canonico);
    }

    this.telefonesSelecionados.set(atual);
  }

  conversaMarcada(conversa: WhatsappConversaResponse): boolean {
    return this.telefonesSelecionados().has(normalizeBrazilWhatsappMobile(conversa.telefone));
  }

  acaoComSelecionados(): void {
    const selecionados = this.telefonesSelecionados();
    const conversasSelecionadas = this.conversas().filter((c) =>
      selecionados.has(normalizeBrazilWhatsappMobile(c.telefone)),
    );

    if (conversasSelecionadas.length === 0) {
      this.erro.set('Selecione ao menos um contato.');
      return;
    }

    if (conversasSelecionadas.length === 1) {
      this.modoSelecao.set(false);
      this.telefonesSelecionados.set(new Set());
      this.selecionarConversa(conversasSelecionadas[0]);
      return;
    }

    const destinatarios = conversasSelecionadas.map((c) => ({
      telefone: c.telefone,
      nmContato: c.nmContato,
    }));
    this.abrirEnvioLote(destinatarios);
  }

  rotuloAcaoSelecionados(): string {
    const total = this.totalSelecionados();
    if (total === 1) {
      return 'Abrir conversa';
    }
    return `Envio em lote (${total})`;
  }

  totalSelecionados(): number {
    return this.telefonesSelecionados().size;
  }

  fecharChat(): void {
    this.conversaSelecionada.set(null);
    this.mensagens.set([]);
    this.fimHistorico.set(false);
    this.painelMobile.set('lista');
    this.formChat.reset({ mensagem: '' });
  }

  voltarParaLista(): void {
    this.painelMobile.set('lista');
  }

  conversaEstaSelecionada(conversa: WhatsappConversaResponse): boolean {
    const selecionada = this.conversaSelecionada();
    return Boolean(selecionada && this.mesmoTelefone(selecionada.telefone, conversa.telefone));
  }

  sincronizarHistoricoChat(): void {
    const conversa = this.conversaSelecionadaAtiva();
    if (!conversa) {
      return;
    }

    this.sincronizandoHistorico.set(true);
    this.erro.set(null);
    this.carregarMensagens(conversa.telefone, false);
  }

  conteudoMensagem(mensagem: WhatsappMensagemResponse): string {
    if (mensagem.conteudo?.trim()) {
      return mensagem.conteudo;
    }

    const tipo = mensagem.tipo?.toLowerCase();
    if (tipo && tipo !== 'texto' && tipo !== 'text') {
      return `[${mensagem.tipo}]`;
    }

    return mensagem.direcao === 'OUTBOUND' ? 'Mensagem enviada' : 'Mensagem recebida';
  }

  mensagemExibeFormatacao(mensagem: WhatsappMensagemResponse): boolean {
    return Boolean(mensagem.conteudo?.trim());
  }

  mensagemEmProcessamento(mensagem: MensagemChatView): boolean {
    return (
      mensagem.direcao === 'OUTBOUND' &&
      (mensagem.statusEnvioChat === 'ENFILEIRADA' || mensagem.statusEnvioChat === 'PROCESSANDO')
    );
  }

  mensagemFalhouEnvio(mensagem: MensagemChatView): boolean {
    return mensagem.direcao === 'OUTBOUND' && mensagem.statusEnvioChat === 'FALHOU';
  }

  rotuloStatusEnvio(mensagem: MensagemChatView): string {
    switch (mensagem.statusEnvioChat) {
      case 'PROCESSANDO':
        return 'Enviando...';
      case 'ENFILEIRADA':
        return 'Na fila';
      case 'FALHOU':
        return 'Falhou';
      default:
        return '';
    }
  }

  trackMensagem(index: number, mensagem: MensagemChatView): string {
    return this.chaveMensagem(mensagem, index);
  }

  private chaveMensagem(mensagem: MensagemChatView, index = 0): string {
    if (mensagem.idNotificacaoPendente != null) {
      return `pending:${mensagem.idNotificacaoPendente}`;
    }

    if (mensagem.idMensagem != null) {
      return `id:${mensagem.idMensagem}`;
    }

    if (mensagem.idExterno) {
      return `ext:${mensagem.idExterno}`;
    }

    return `${mensagem.direcao}-${mensagem.dtEnvio ?? mensagem.dtCriacao}-${index}`;
  }

  onTimelineScroll(event: Event): void {
    const elemento = event.target as HTMLElement;
    if (elemento.scrollTop > 64 || this.carregandoMais() || this.fimHistorico() || this.carregandoMensagens()) {
      return;
    }

    this.carregarMaisHistorico();
  }

  carregarMaisHistorico(): void {
    const conversa = this.conversaSelecionadaAtiva();
    const mensagensAtuais = this.mensagens();
    const primeira = mensagensAtuais[0];

    if (!conversa || this.carregandoMais()) {
      return;
    }

    if (primeira?.idMensagem == null && !primeira?.idExterno) {
      return;
    }

    const elemento = document.getElementById('whatsapp-timeline');
    const alturaAnterior = elemento?.scrollHeight ?? 0;

    this.carregandoMais.set(true);
    this.erro.set(null);

    this.conversasService.carregarMaisMensagens(
      conversa.telefone,
      {
        idMensagem: primeira.idMensagem,
        idExterno: primeira.idExterno,
      },
      50,
    ).subscribe({
      next: (resposta) => {
        const historicas = mensagensAtuais.filter((item) => item.idNotificacaoPendente == null);
        const pendentes = mensagensAtuais.filter((item) => item.idNotificacaoPendente != null);
        const existentes = new Set(historicas.map((item, index) => this.chaveMensagem(item, index)));

        const novas = resposta.mensagens.filter(
          (item, index) => !existentes.has(this.chaveMensagem(item, index)),
        );

        if (novas.length > 0) {
          this.mensagens.set([...novas, ...historicas, ...pendentes]);
          queueMicrotask(() => {
            if (!elemento) {
              return;
            }
            elemento.scrollTop = elemento.scrollHeight - alturaAnterior;
          });
        }

        this.fimHistorico.set(resposta.fimHistorico || novas.length === 0);
        this.carregandoMais.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(err.error?.message ?? err.error?.mensagem ?? 'Nao foi possivel carregar mensagens anteriores.');
        this.carregandoMais.set(false);
      },
    });
  }

  dataMensagem(mensagem: WhatsappMensagemResponse): string {
    return this.formatarData(mensagem.dtEnvio ?? mensagem.dtCriacao);
  }

  private carregarThread(telefone: string): void {
    this.carregarMensagens(telefone, true);
    this.conversasService.marcarComoLida(telefone).subscribe({
      error: () => undefined,
    });
  }

  private carregarMensagens(telefone: string, exibirLoading = true): void {
    if (exibirLoading) {
      this.carregandoMensagens.set(true);
    }

    this.fimHistorico.set(false);

    this.conversasService.listarMensagens(telefone, 0, 50).subscribe({
      next: (page) => {
        this.mensagens.set(this.mesclarMensagensServidor(page.data));
        this.fimHistorico.set(page.data.length === 0 || page.data.length < page.pageSize);
        this.carregandoMensagens.set(false);
        this.sincronizandoHistorico.set(false);
        this.rolarParaFimTimeline();
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(err.error?.message ?? err.error?.mensagem ?? 'Nao foi possivel carregar as mensagens.');
        this.carregandoMensagens.set(false);
        this.sincronizandoHistorico.set(false);
      },
    });
  }

  private mesmoTelefone(a: string, b: string): boolean {
    const canonicoA = normalizeBrazilWhatsappMobile(a);
    const canonicoB = normalizeBrazilWhatsappMobile(b);
    return Boolean(canonicoA && canonicoB && canonicoA === canonicoB);
  }

  temFiltrosAtivos(): boolean {
    return this.temFiltrosAvancadosAtivos() || this.filtroPainel() !== 'todos';
  }

  temFiltrosAvancadosAtivos(): boolean {
    return Boolean(
      this.filtroBusca().trim()
      || this.filtroProntoWhatsapp()
      || this.filtroNaoLida()
      || this.filtroUltimaDirecao(),
    );
  }

  selecionarFiltroPainel(filtro: FiltroPainel): void {
    this.filtroPainel.set(filtro);
  }

  carregarStatusSessao(): void {
    this.carregandoStatus.set(true);

    this.whatsappService.status().subscribe({
      next: (status) => {
        this.telefoneSessao.set(status.telefone);
        const conectada = ehWhatsappConectado(status.status, status.conectado);
        this.sessaoConectada.set(conectada);
        if (!conectada) {
          this.limparConversasLocais();
        } else {
          this.carregar();
        }
        this.carregandoStatus.set(false);
      },
      error: () => {
        this.sessaoConectada.set(false);
        this.limparConversasLocais();
        this.carregandoStatus.set(false);
      },
    });
  }

  iniciaisContato(conversa: WhatsappConversaResponse): string {
    const nome = conversa.nmContato?.trim();

    if (!nome) {
      return '?';
    }

    const partes = nome.split(/\s+/).filter(Boolean);

    if (partes.length >= 2) {
      return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
    }

    return nome.slice(0, 2).toUpperCase();
  }

  tituloContato(conversa: WhatsappConversaResponse): string {
    const nome = conversa.nmContato?.trim();
    const telefoneFormatado = formatPhoneNationalDigits(conversa.telefone);

    if (!nome) {
      return telefoneFormatado;
    }

    if (this.nomePareceTelefone(nome, conversa.telefone)) {
      return formatPhoneNationalDigits(nome) || telefoneFormatado;
    }

    return `${nome} - ${telefoneFormatado}`;
  }

  private nomePareceTelefone(nome: string, telefone: string): boolean {
    const digitosNome = nome.replace(/\D/g, '');
    const digitosTelefone = telefone.replace(/\D/g, '');

    if (!digitosNome || digitosNome.length < 8) {
      return false;
    }

    return digitosNome === digitosTelefone
      || digitosTelefone.endsWith(digitosNome)
      || digitosNome.endsWith(digitosTelefone);
  }

  situacaoConversa(conversa: WhatsappConversaResponse): SituacaoConversa {
    if (!conversa.prontoParaEnvioWhatsapp && !conversa.inboundRecebidaWhatsapp) {
      return 'falha';
    }

    if (conversa.origem === 'SESSAO' && !conversa.registradaNaApi) {
      return 'pendente';
    }

    if (!conversa.prontoParaEnvioWhatsapp && conversa.inboundRecebidaWhatsapp) {
      return 'pendente';
    }

    return 'ok';
  }

  badgeConversa(conversa: WhatsappConversaResponse): BadgeConversa {
    const situacao = this.situacaoConversa(conversa);

    if (situacao === 'falha') {
      return {
        classe: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]',
        texto: 'Sem tctoken',
        acionavel: false,
      };
    }

    if (situacao === 'pendente') {
      if (conversa.origem === 'SESSAO' && !conversa.registradaNaApi) {
        return {
          classe: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[color-mix(in_srgb,var(--color-warning)_30%,transparent)]',
          texto: 'Importar',
          acionavel: true,
        };
      }

      return {
        classe: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[color-mix(in_srgb,var(--color-warning)_30%,transparent)]',
        texto: 'Aguardando',
        acionavel: false,
      };
    }

    if (conversa.origem === 'SINCRONIZADA') {
      return {
        classe: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
        texto: 'Sincronizado',
        acionavel: false,
      };
    }

    return {
      classe: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
      texto: conversa.prontoParaEnvioWhatsapp ? 'Pronto' : 'Na inbox',
      acionavel: false,
    };
  }

  acaoBadge(conversa: WhatsappConversaResponse): void {
    const badge = this.badgeConversa(conversa);

    if (!badge.acionavel) {
      return;
    }

    if (conversa.origem === 'SESSAO' && !conversa.registradaNaApi) {
      this.sincronizarInbox(conversa);
    }
  }

  atualizarFiltroBusca(event: Event): void {
    this.filtroBusca.set((event.target as HTMLInputElement).value);
  }

  buscarPorEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.aplicarFiltros();
    }
  }

  atualizarFiltroProntoWhatsapp(event: Event): void {
    this.filtroProntoWhatsapp.set((event.target as HTMLSelectElement).value as FiltroProntoWhatsapp);
    this.aplicarFiltros();
  }

  atualizarFiltroNaoLida(event: Event): void {
    this.filtroNaoLida.set((event.target as HTMLSelectElement).value as FiltroNaoLida);
    this.aplicarFiltros();
  }

  atualizarFiltroUltimaDirecao(event: Event): void {
    this.filtroUltimaDirecao.set((event.target as HTMLSelectElement).value as FiltroUltimaDirecao);
    this.aplicarFiltros();
  }

  sincronizarInbox(conversa: WhatsappConversaResponse): void {
    this.acaoTelefone.set(conversa.telefone);
    this.mensagemSucesso.set(null);
    this.erro.set(null);

    this.conversasService.sincronizarInbox(conversa.telefone).subscribe({
      next: (atualizada) => {
        this.carregar();
        this.mensagemSucesso.set(
          atualizada.origem === 'SINCRONIZADA'
            ? `Historico de ${atualizada.nmContato} importado para a inbox.`
            : `Conversa de ${atualizada.nmContato} atualizada na inbox.`,
        );
        this.acaoTelefone.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(err.error?.message || 'Nao foi possivel importar o historico da sessao.');
        this.acaoTelefone.set(null);
      },
    });
  }

  explicacaoSemHistoricoInbox(conversa: WhatsappConversaResponse): string {
    if (conversa.origem !== 'SESSAO') {
      return '';
    }

    if (conversa.inboundRecebidaWhatsapp) {
      return 'Mensagem vista na sessao WhatsApp, mas ainda nao salva na plataforma. Use Importar inbox.';
    }

    return 'Pronto na sessao apenas com tctoken. Ligacoes nao geram historico — peca uma mensagem de texto pelo WhatsApp.';
  }

  alterarTamanhoPagina(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value);
    this.table.alterarTamanhoPagina(size, () => this.carregar());
  }

  proximaPagina(): void {
    this.table.proximaPagina(() => this.carregar());
  }

  paginaAnterior(): void {
    this.table.paginaAnterior(() => this.carregar());
  }

  async excluir(conversa: WhatsappConversaResponse): Promise<void> {
    const confirmado = await this.commandDialog.confirm({
      title: 'Remover conversa',
      message:
        `Remover a conversa de ${conversa.nmContato} da caixa de entrada?\n\n`
        + 'O historico no gateway nao sera apagado.',
      confirmLabel: 'Remover',
      variant: 'danger',
    });

    if (!confirmado) {
      return;
    }

    this.acaoTelefone.set(conversa.telefone);
    this.mensagemSucesso.set(null);
    this.erro.set(null);

    this.conversasService.excluir(conversa.telefone).subscribe({
      next: () => {
        if (this.conversaEstaSelecionada(conversa)) {
          this.fecharChat();
        }
        this.carregar();
        this.mensagemSucesso.set(`Conversa de ${conversa.nmContato} removida.`);
        this.acaoTelefone.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(err.error?.message || 'Nao foi possivel remover a conversa.');
        this.acaoTelefone.set(null);
      },
    });
  }

  labelWhatsapp(conversa: WhatsappConversaResponse): string {
    if (conversa.prontoParaEnvioWhatsapp) {
      return 'Pronto no WhatsApp';
    }

    if (conversa.inboundRecebidaWhatsapp) {
      return 'Aguardando tctoken';
    }

    return 'Sem conversa na sessao';
  }

  classeWhatsapp(conversa: WhatsappConversaResponse): string {
    if (conversa.prontoParaEnvioWhatsapp) {
      return 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]';
    }

    if (conversa.inboundRecebidaWhatsapp) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }

    return 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border-[var(--color-border)]';
  }

  previewMensagem(conversa: WhatsappConversaResponse): string {
    const prefixo = this.prefixoUltimaMensagem(conversa);
    let conteudo = '';

    if (conversa.ultimaMensagem?.trim()) {
      conteudo = conversa.ultimaMensagem;
    } else if (conversa.tipoUltimaMensagem && conversa.tipoUltimaMensagem !== 'texto') {
      conteudo = `[${conversa.tipoUltimaMensagem}]`;
    } else {
      conteudo = conversa.ultimaDirecaoMensagem === 'OUTBOUND'
        ? 'Mensagem enviada'
        : 'Mensagem recebida';
    }

    return `${prefixo}${conteudo}`;
  }

  prefixoUltimaMensagem(conversa: WhatsappConversaResponse): string {
    if (conversa.ultimaDirecaoMensagem === 'OUTBOUND') {
      return 'Voce: ';
    }

    if (conversa.ultimaDirecaoMensagem === 'INBOUND') {
      return ' ';
    }

    return '';
  }

  classeUltimaDirecao(conversa: WhatsappConversaResponse): string {
    if (conversa.ultimaDirecaoMensagem === 'OUTBOUND') {
      return 'bg-[var(--color-primary)]/10 text-[var(--color-primary-soft)] border-[var(--color-primary)]/30';
    }

    if (conversa.ultimaDirecaoMensagem === 'INBOUND') {
      return 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border-[var(--color-border)]';
    }

    return 'bg-[var(--color-surface-muted)] text-[var(--color-text-faint)] border-[var(--color-border)]';
  }

  labelUltimaDirecao(conversa: WhatsappConversaResponse): string {
    if (conversa.ultimaDirecaoMensagem === 'OUTBOUND') {
      return 'Enviada';
    }

    if (conversa.ultimaDirecaoMensagem === 'INBOUND') {
      return 'Recebida';
    }

    return 'Sem historico';
  }

  labelOrigem(conversa: WhatsappConversaResponse): string {
    switch (conversa.origem) {
      case 'SINCRONIZADA':
        return 'Inbox + sessao';
      case 'SESSAO':
        return 'So sessao';
      case 'INBOX':
        return 'So inbox';
      default:
        return 'Desconhecida';
    }
  }

  classeOrigem(conversa: WhatsappConversaResponse): string {
    switch (conversa.origem) {
      case 'SINCRONIZADA':
        return 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]';
      case 'SESSAO':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'INBOX':
        return 'bg-violet-500/10 text-violet-300 border-violet-500/30';
      default:
        return 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border-[var(--color-border)]';
    }
  }

  descricaoOrigem(conversa: WhatsappConversaResponse): string {
    switch (conversa.origem) {
      case 'SINCRONIZADA':
        return 'Historico salvo na plataforma e contato ativo na sessao WhatsApp conectada.';
      case 'SESSAO':
        return 'Contato visivel na sessao WhatsApp (tctoken/inbound), mas ainda sem historico salvo na plataforma.';
      case 'INBOX':
        return 'Historico salvo na plataforma; a sessao WhatsApp pode nao estar pronta para enviar agora.';
      default:
        return '';
    }
  }

  private parseBooleanFiltro(valor: string): boolean | undefined {
    if (valor === 'true') {
      return true;
    }

    if (valor === 'false') {
      return false;
    }

    return undefined;
  }

  private limparConversasLocais(): void {
    this.conversas.set([]);
    this.mensagens.set([]);
    this.conversaSelecionada.set(null);
    this.fimHistorico.set(true);
  }

  private conectarFilaEventos(): void {
    const idOrganizacao = this.authService.idOrganizacaoAtual();
    if (!idOrganizacao) {
      return;
    }

    this.filaEventsSubscription?.unsubscribe();
    this.filaEventsSubscription = this.filaEventsService.conectar(idOrganizacao).subscribe({
      next: (evento) => {
        if (!evento.idNotificacao || !evento.status) {
          return;
        }

        this.atualizarStatusMensagemEnfileirada(evento.idNotificacao, evento.status);

        const conversa = this.conversaSelecionadaAtiva();
        if (!conversa) {
          return;
        }

        if (['ENVIADA', 'ENTREGUE', 'LIDA'].includes(evento.status)) {
          this.carregarMensagens(conversa.telefone, false);
        }
      },
    });
  }

  private criarMensagemEnfileirada(
    telefone: string,
    conteudo: string,
    idNotificacao: number | null,
    statusEnvioChat: StatusEnvioChat,
  ): MensagemChatView {
    const agora = new Date().toISOString();
    const idPendente = idNotificacao ?? -Date.now();

    return {
      idMensagem: null,
      telefone,
      direcao: 'OUTBOUND',
      tipo: 'texto',
      conteudo,
      status: 'PENDING',
      idExterno: idNotificacao ? `notif:${idNotificacao}` : `pending:${Math.abs(idPendente)}`,
      dtEnvio: null,
      dtCriacao: agora,
      idNotificacaoPendente: idPendente,
      statusEnvioChat,
    };
  }

  private confirmarMensagemEnfileirada(
    pendente: MensagemChatView,
    resposta: EnviarMensagemResponse,
  ): void {
    const statusEnvio = this.mapearStatusFilaParaChat(resposta.status);

    this.mensagens.update((lista) =>
      lista.map((item) => {
        if (item.idNotificacaoPendente !== pendente.idNotificacaoPendente) {
          return item;
        }

        return {
          ...item,
          idNotificacaoPendente: resposta.idNotificacao,
          idExterno: `notif:${resposta.idNotificacao}`,
          statusEnvioChat: statusEnvio,
        };
      }),
    );
  }

  private atualizarStatusMensagemEnfileirada(idNotificacao: number, status: StatusNotificacao): void {
    const statusEnvio = this.mapearStatusFilaParaChat(status);
    const concluida = ['ENVIADA', 'ENTREGUE', 'LIDA'].includes(status);
    const falhou = ['FALHOU', 'BLOQUEADA', 'CANCELADA'].includes(status);

    this.mensagens.update((lista) => {
      const atualizada = lista.map((item) => {
        if (item.idNotificacaoPendente !== idNotificacao) {
          return item;
        }

        if (concluida) {
          return item;
        }

        return {
          ...item,
          statusEnvioChat: falhou ? 'FALHOU' : statusEnvio,
          status: falhou ? 'FAILED' : item.status,
        };
      });

      if (concluida) {
        return atualizada.filter((item) => item.idNotificacaoPendente !== idNotificacao);
      }

      return atualizada;
    });
  }

  private removerMensagemPendente(pendente: MensagemChatView): void {
    this.mensagens.update((lista) =>
      lista.filter((item) => item.idNotificacaoPendente !== pendente.idNotificacaoPendente),
    );
  }

  private mesclarMensagensServidor(servidor: WhatsappMensagemResponse[]): MensagemChatView[] {
    const pendentes = this.mensagens().filter(
      (item) =>
        item.idNotificacaoPendente != null &&
        !this.pendenteJaConfirmadoNoServidor(item, servidor),
    );

    return [...servidor, ...pendentes];
  }

  private pendenteJaConfirmadoNoServidor(
    pendente: MensagemChatView,
    servidor: WhatsappMensagemResponse[],
  ): boolean {
    if (!pendente.conteudo?.trim()) {
      return false;
    }

    const conteudo = pendente.conteudo.trim();
    const criadoEmPendente = new Date(pendente.dtCriacao).getTime();

    return servidor.some((mensagem) => {
      if (mensagem.direcao !== 'OUTBOUND' || mensagem.conteudo?.trim() !== conteudo) {
        return false;
      }

      const criadoEmServidor = new Date(mensagem.dtCriacao).getTime();
      return Math.abs(criadoEmServidor - criadoEmPendente) < 5 * 60 * 1000;
    });
  }

  private mapearStatusFilaParaChat(status: StatusNotificacao): StatusEnvioChat {
    if (status === 'PROCESSANDO') {
      return 'PROCESSANDO';
    }

    if (['FALHOU', 'BLOQUEADA', 'CANCELADA'].includes(status)) {
      return 'FALHOU';
    }

    if (['ENVIADA', 'ENTREGUE', 'LIDA'].includes(status)) {
      return 'ENVIADA';
    }

    return 'ENFILEIRADA';
  }

  private rolarParaFimTimeline(): void {
    queueMicrotask(() => {
      const elemento = document.getElementById('whatsapp-timeline');
      if (!elemento) {
        return;
      }

      elemento.scrollTop = elemento.scrollHeight;
    });
  }

  private conectarEventos(): void {
    const idOrganizacao = this.authService.idOrganizacaoAtual();
    if (!idOrganizacao) {
      return;
    }

    this.eventosSubscription = this.whatsappEventsService.conectar(idOrganizacao).subscribe({
      next: (evento) => {
        if (evento.tipo === 'CONVERSAS_LIMPAS' || evento.tipo === 'CONEXAO_CANCELADA') {
          this.sessaoConectada.set(false);
          this.telefoneSessao.set(null);
          this.limparConversasLocais();
          return;
        }

        if (evento.tipo === 'CONVERSA_EXCLUIDA') {
          const telefoneExcluido = evento.conversa?.telefone;
          if (telefoneExcluido && this.conversaSelecionada() && this.mesmoTelefone(telefoneExcluido, this.conversaSelecionada()!.telefone)) {
            this.fecharChat();
          }
          this.carregar();
          return;
        }

        if (evento.tipo === 'MENSAGEM_RECEBIDA' || evento.tipo === 'CONVERSA_ATUALIZADA') {
          const telefoneEvento = evento.conversa?.telefone;
          const selecionada = this.conversaSelecionada();

          if (telefoneEvento && selecionada && this.mesmoTelefone(telefoneEvento, selecionada.telefone)) {
            if (evento.conversa) {
              this.conversaSelecionada.set(evento.conversa);
            }
            this.carregarMensagens(selecionada.telefone, false);
          }

          this.carregar();
        }
      },
    });
  }
}
