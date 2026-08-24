import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  ArrowDownLeft,
  ArrowUpRight,
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
import { formatDateTimePtBr } from '../../shared/helper/date.utils';
import { usePaginatedTable } from '../../shared/helper/paginated-table.state';
import { formatPhone } from '../../shared/helper/phone.utils';
import { WhatsappConversaAba, WhatsappConversaResponse, WhatsappConversaStatus, WhatsappMensagemDirecao } from '../../shared/types/dtos';

type FiltroProntoWhatsapp = '' | 'true' | 'false';
type FiltroNaoLida = '' | 'true';
type FiltroUltimaDirecao = '' | WhatsappMensagemDirecao;

interface AbaConversa {
  id: WhatsappConversaAba;
  label: string;
  descricao: string;
}

@Component({
  selector: 'app-whatsapp-conversas',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './whatsapp-conversas.component.html',
})
export class WhatsappConversasComponent implements OnInit, OnDestroy {
  private readonly conversasService = inject(WhatsappConversasService);
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
  protected readonly inboundIcon = ArrowDownLeft;
  protected readonly outboundIcon = ArrowUpRight;
  protected readonly syncIcon = CloudDownload;

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

  readonly filtroBusca = signal('');
  readonly filtroProntoWhatsapp = signal<FiltroProntoWhatsapp>('');
  readonly filtroStatus = signal<WhatsappConversaStatus | ''>('');
  readonly filtroNaoLida = signal<FiltroNaoLida>('');
  readonly filtroUltimaDirecao = signal<FiltroUltimaDirecao>('');

  readonly abaDescricao = computed(
    () => this.abas.find((item) => item.id === this.abaAtiva())?.descricao ?? '',
  );

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

  ngOnInit(): void {
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
    this.aplicarFiltros();
  }

  selecionarAba(aba: WhatsappConversaAba): void {
    if (this.abaAtiva() === aba) {
      return;
    }

    this.abaAtiva.set(aba);
    this.mensagemSucesso.set(null);
    this.erro.set(null);
    this.table.aplicarFiltros(() => this.carregar());
  }

  temFiltrosAtivos(): boolean {
    return Boolean(
      this.filtroBusca().trim()
      || this.filtroProntoWhatsapp()
      || this.filtroStatus()
      || this.filtroNaoLida()
      || this.filtroUltimaDirecao(),
    );
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
      return 'Recebida: ';
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
