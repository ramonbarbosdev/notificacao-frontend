import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  Check,
  ChevronLeft,
  ChevronRight,
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
import { WhatsappConversaResponse, WhatsappConversaStatus } from '../../shared/types/dtos';

type FiltroProntoWhatsapp = '' | 'true' | 'false';
type FiltroNaoLida = '' | 'true';

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

  readonly table = usePaginatedTable(10);

  readonly conversas = signal<WhatsappConversaResponse[]>([]);
  readonly erro = signal<string | null>(null);
  readonly acaoTelefone = signal<string | null>(null);
  readonly mensagemSucesso = signal<string | null>(null);

  readonly filtroBusca = signal('');
  readonly filtroProntoWhatsapp = signal<FiltroProntoWhatsapp>('');
  readonly filtroStatus = signal<WhatsappConversaStatus | ''>('');
  readonly filtroNaoLida = signal<FiltroNaoLida>('');

  readonly totalProntasPagina = computed(
    () => this.conversas().filter((item) => item.prontoParaEnvioWhatsapp).length,
  );

  readonly exigirConsentimento = computed(
    () => this.conversas()[0]?.exigirConsentimento ?? true,
  );

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
    this.aplicarFiltros();
  }

  temFiltrosAtivos(): boolean {
    return Boolean(
      this.filtroBusca().trim()
      || this.filtroProntoWhatsapp()
      || this.filtroStatus()
      || this.filtroNaoLida(),
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
    if (conversa.ultimaMensagem?.trim()) {
      return conversa.ultimaMensagem;
    }

    if (conversa.tipoUltimaMensagem && conversa.tipoUltimaMensagem !== 'texto') {
      return `[${conversa.tipoUltimaMensagem}]`;
    }

    return 'Mensagem recebida';
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
