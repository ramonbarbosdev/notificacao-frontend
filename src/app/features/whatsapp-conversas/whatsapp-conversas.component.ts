import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CloudDownload,
  LoaderCircle,
  LucideAngularModule,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-angular';
import { Subscription } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { WhatsappEventsService } from '../../core/http/whatsapp-events.service';
import { CommandDialogService } from '../../core/services/command-dialog.service';
import { WhatsappConversasService } from '../../core/services/whatsapp-conversas.service';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { formatDateTimePtBr, formatRelativeTimePtBr } from '../../shared/helper/date.utils';
import { usePaginatedTable } from '../../shared/helper/paginated-table.state';
import { formatPhone, formatPhoneNationalDigits } from '../../shared/helper/phone.utils';
import { WhatsappConversaAba, WhatsappConversaResponse, WhatsappConversaStatus, WhatsappMensagemDirecao } from '../../shared/types/dtos';
import { ehWhatsappConectado } from '../whatsapp/whatsapp.helpers';

type FiltroProntoWhatsapp = '' | 'true' | 'false';
type FiltroNaoLida = '' | 'true';
type FiltroUltimaDirecao = '' | WhatsappMensagemDirecao;
type FiltroPainel = 'todos' | 'pendente' | 'falha';
type SituacaoConversa = 'ok' | 'pendente' | 'falha';

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
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './whatsapp-conversas.component.html',
})
export class WhatsappConversasComponent implements OnInit, OnDestroy {
  private readonly conversasService = inject(WhatsappConversasService);
  private readonly whatsappService = inject(WhatsappService);
  private readonly commandDialog = inject(CommandDialogService);
  private readonly whatsappEventsService = inject(WhatsappEventsService);
  private readonly authService = inject(AuthService);

  private eventosSubscription: Subscription | null = null;

  protected readonly refreshIcon = RefreshCw;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly checkIcon = Check;
  protected readonly messageIcon = MessageSquare;
  protected readonly trashIcon = Trash2;
  protected readonly searchIcon = Search;
  protected readonly chevronLeftIcon = ChevronLeft;
  protected readonly chevronRightIcon = ChevronRight;
  protected readonly syncIcon = CloudDownload;

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
  readonly abaAtiva = signal<WhatsappConversaAba>('INBOX');
  readonly filtroPainel = signal<FiltroPainel>('todos');
  readonly telefoneSessao = signal<string | null>(null);
  readonly sessaoConectada = signal(false);
  readonly carregandoStatus = signal(false);

  readonly filtroBusca = signal('');
  readonly filtroProntoWhatsapp = signal<FiltroProntoWhatsapp>('');
  readonly filtroStatus = signal<WhatsappConversaStatus | ''>('');
  readonly filtroNaoLida = signal<FiltroNaoLida>('');
  readonly filtroUltimaDirecao = signal<FiltroUltimaDirecao>('');

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

  readonly exigirConsentimento = computed(
    () => this.conversas()[0]?.exigirConsentimento ?? true,
  );

  readonly resumoOrigem = computed(() => {
    const itens = this.conversas();
    return {
      inbox: itens.filter((item) => item.origem === 'INBOX').length,
      sessao: itens.filter((item) => item.origem === 'SESSAO').length,
      sincronizada: itens.filter((item) => item.origem === 'SINCRONIZADA').length,
    };
  });

  readonly podeSincronizarInbox = (conversa: WhatsappConversaResponse): boolean =>
    conversa.origem === 'SESSAO' && !conversa.registradaNaApi;

  readonly formatarTelefone = formatPhone;
  readonly formatarData = formatDateTimePtBr;
  readonly tempoExibicao = formatRelativeTimePtBr;

  ngOnInit(): void {
    this.carregarStatusSessao();
    this.carregar();
    this.conectarEventos();
  }

  ngOnDestroy(): void {
    this.eventosSubscription?.unsubscribe();
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
        status: this.filtroStatus() || undefined,
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
    this.filtroStatus.set('');
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
    this.table.aplicarFiltros(() => this.carregar());
  }

  temFiltrosAtivos(): boolean {
    return this.temFiltrosAvancadosAtivos() || this.filtroPainel() !== 'todos';
  }

  temFiltrosAvancadosAtivos(): boolean {
    return Boolean(
      this.filtroBusca().trim()
      || this.filtroProntoWhatsapp()
      || this.filtroStatus()
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
        this.sessaoConectada.set(ehWhatsappConectado(status.status, status.conectado));
        this.carregandoStatus.set(false);
      },
      error: () => {
        this.sessaoConectada.set(false);
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
    if (conversa.status === 'BLOQUEADO') {
      return 'falha';
    }

    if (!conversa.prontoParaEnvioWhatsapp && !conversa.inboundRecebidaWhatsapp) {
      return 'falha';
    }

    if (conversa.exigirConsentimento && conversa.status === 'PENDENTE') {
      return 'pendente';
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
        texto: conversa.status === 'BLOQUEADO' ? 'Bloqueado' : 'Sem tctoken',
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

      if (conversa.exigirConsentimento && conversa.status === 'PENDENTE') {
        return {
          classe: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[color-mix(in_srgb,var(--color-warning)_30%,transparent)]',
          texto: 'Liberar',
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
      return;
    }

    this.liberar(conversa);
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

  atualizarFiltroStatus(event: Event): void {
    this.filtroStatus.set((event.target as HTMLSelectElement).value as WhatsappConversaStatus | '');
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

  liberar(conversa: WhatsappConversaResponse): void {
    if (conversa.status === 'LIBERADO' || conversa.status === 'BLOQUEADO') {
      return;
    }

    this.acaoTelefone.set(conversa.telefone);
    this.mensagemSucesso.set(null);

    this.conversasService.liberar(conversa.telefone).subscribe({
      next: (atualizada) => {
        this.carregar();
        this.mensagemSucesso.set(`Contato ${atualizada.nmContato} liberado para notificacoes.`);
        this.acaoTelefone.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(err.error?.message || 'Nao foi possivel liberar o contato.');
        this.acaoTelefone.set(null);
      },
    });
  }

  async excluir(conversa: WhatsappConversaResponse): Promise<void> {
    const confirmado = await this.commandDialog.confirm({
      title: 'Remover conversa',
      message:
        `Remover a conversa de ${conversa.nmContato} da caixa de entrada?\n\n`
        + 'O contato e o historico de mensagens nao serao apagados.',
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

  labelStatus(status: WhatsappConversaStatus): string {
    if (!this.exigirConsentimento() && status === 'LIBERADO') {
      return 'Recebida';
    }

    switch (status) {
      case 'LIBERADO':
        return 'Liberado';
      case 'BLOQUEADO':
        return 'Bloqueado';
      default:
        return 'Pendente';
    }
  }

  classeStatus(status: WhatsappConversaStatus): string {
    switch (status) {
      case 'LIBERADO':
        return 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]';
      case 'BLOQUEADO':
        return 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger-border)]';
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
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

  private conectarEventos(): void {
    const idOrganizacao = this.authService.idOrganizacaoAtual();
    if (!idOrganizacao) {
      return;
    }

    this.eventosSubscription = this.whatsappEventsService.conectar(idOrganizacao).subscribe({
      next: (evento) => {
        if (
          evento.tipo === 'MENSAGEM_RECEBIDA'
          || evento.tipo === 'CONVERSA_ATUALIZADA'
          || evento.tipo === 'CONVERSA_EXCLUIDA'
        ) {
          this.carregar();
        }
      },
    });
  }
}
