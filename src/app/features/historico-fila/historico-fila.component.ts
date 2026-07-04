import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  LucideAngularModule,
  RefreshCw,
  Search,
} from 'lucide-angular';

import { NotificacaoService } from '../../core/services/notificacao.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { usePaginatedTable } from '../../shared/helper/paginated-table.state';
import { formatCanal } from '../../shared/helper/channel.utils';
import { formatDateTimePtBr } from '../../shared/helper/date.utils';
import { formatPhone } from '../../shared/helper/phone.utils';
import { explicarErroFila } from '../../shared/labels/whatsapp-operacional.labels';
import { CanalNotificacao, FilaNotificacaoItemDTO, StatusNotificacao } from '../../shared/types/dtos';

@Component({
  selector: 'app-historico-fila',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, EmptyStateComponent],
  templateUrl: './historico-fila.component.html',
})
export class HistoricoFilaComponent implements OnInit {
  private readonly notificacaoService = inject(NotificacaoService);

  protected readonly loaderIcon = LoaderCircle;
  protected readonly refreshIcon = RefreshCw;
  protected readonly searchIcon = Search;
  protected readonly chevronDownIcon = ChevronDown;
  protected readonly chevronUpIcon = ChevronUp;

  readonly table = usePaginatedTable(10);
  readonly itens = signal<FilaNotificacaoItemDTO[]>([]);
  readonly erro = signal<string | null>(null);
  readonly expandidos = signal<Set<number>>(new Set());

  readonly filtroDestinatario = signal('');
  readonly filtroCanal = signal<CanalNotificacao | ''>('');
  readonly filtroStatus = signal<StatusNotificacao | ''>('');

  readonly statusLabels: Record<StatusNotificacao, string> = {
    PENDENTE: 'Pendente',
    PROCESSANDO: 'Processando',
    ENVIADA: 'Enviada',
    ENTREGUE: 'Entregue',
    LIDA: 'Lida',
    FALHOU: 'Falhou',
    BLOQUEADA: 'Bloqueada',
    CANCELADA: 'Cancelada',
  };

  readonly canais: { value: CanalNotificacao | ''; label: string }[] = [
    { value: '', label: 'Todos os canais' },
    { value: 'WHATSAPP', label: 'WhatsApp' },
    { value: 'EMAIL', label: 'E-mail' },
    { value: 'TELEGRAM', label: 'Telegram' },
    { value: 'WEBHOOK', label: 'Webhook' },
  ];

  readonly statusOpcoes: { value: StatusNotificacao | ''; label: string }[] = [
    { value: '', label: 'Todos os status' },
    { value: 'PENDENTE', label: 'Pendente' },
    { value: 'PROCESSANDO', label: 'Processando' },
    { value: 'ENVIADA', label: 'Enviada' },
    { value: 'ENTREGUE', label: 'Entregue' },
    { value: 'LIDA', label: 'Lida' },
    { value: 'FALHOU', label: 'Falhou' },
    { value: 'BLOQUEADA', label: 'Bloqueada' },
    { value: 'CANCELADA', label: 'Cancelada' },
  ];

  readonly itensFiltrados = computed(() => {
    const destinatario = this.filtroDestinatario().trim().toLowerCase();
    const canal = this.filtroCanal();
    const status = this.filtroStatus();

    return this.itens().filter((item) => {
      return (
        (!destinatario || item.destinatario.toLowerCase().includes(destinatario)) &&
        (!canal || item.canal === canal) &&
        (!status || item.status === status)
      );
    });
  });

  readonly totalElementos = computed(() => this.itensFiltrados().length);

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.totalElementos() / this.table.tamanhoPagina()))
  );

  readonly itensPaginados = computed(() => {
    const inicio = this.table.paginaAtual() * this.table.tamanhoPagina();
    const fim = inicio + this.table.tamanhoPagina();

    return this.itensFiltrados().slice(inicio, fim);
  });

  readonly resumoStatus = computed(() => {
    const contagem = new Map<StatusNotificacao, number>();

    for (const item of this.itensFiltrados()) {
      contagem.set(item.status, (contagem.get(item.status) ?? 0) + 1);
    }

    return Array.from(contagem.entries()).map(([status, total]) => ({ status, total }));
  });

  ngOnInit(): void {
    this.carregarFila();
  }

  carregarFila(): void {
    this.table.loading.set(true);
    this.erro.set(null);

    this.notificacaoService
      .listar({
        page: 0,
        size: 200,
        sort: 'dtCriacao,desc',
      })
      .subscribe({
        next: (res) => {
          this.itens.set(res.data);
          this.table.paginaAtual.set(0);
          this.expandidos.set(new Set());
          this.table.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.erro.set(err.error?.mensagem ?? err.error?.erro ?? 'Erro ao carregar a fila.');
          this.table.loading.set(false);
        },
      });
  }

  atualizarFiltroDestinatario(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.filtroDestinatario.set(valor);
    this.table.paginaAtual.set(0);
  }

  atualizarFiltroCanal(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value as CanalNotificacao | '';
    this.filtroCanal.set(valor);
    this.table.paginaAtual.set(0);
  }

  atualizarFiltroStatus(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value as StatusNotificacao | '';
    this.filtroStatus.set(valor);
    this.table.paginaAtual.set(0);
  }

  limparFiltros(): void {
    this.filtroDestinatario.set('');
    this.filtroCanal.set('');
    this.filtroStatus.set('');
    this.table.paginaAtual.set(0);
  }

  temFiltrosAtivos(): boolean {
    return Boolean(this.filtroDestinatario() || this.filtroCanal() || this.filtroStatus());
  }

  proximaPagina(): void {
    if (this.table.paginaAtual() + 1 >= this.totalPaginas()) return;
    this.table.paginaAtual.update((page) => page + 1);
  }

  paginaAnterior(): void {
    if (this.table.paginaAtual() <= 0) return;
    this.table.paginaAtual.update((page) => page - 1);
  }

  alterarTamanhoPagina(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value);
    this.table.tamanhoPagina.set(size);
    this.table.paginaAtual.set(0);
  }

  toggleDetalhes(id: number): void {
    this.expandidos.update((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) {
        proximo.delete(id);
      } else {
        proximo.add(id);
      }
      return proximo;
    });
  }

  estaExpandido(id: number): boolean {
    return this.expandidos().has(id);
  }

  formatarDestinatario(item: FilaNotificacaoItemDTO): string {
    if (item.canal === 'WHATSAPP') {
      return formatPhone(item.destinatario);
    }
    return item.destinatario || '-';
  }

  formatarCanal(canal: CanalNotificacao): string {
    return formatCanal(canal);
  }

  formatarData(valor: string | null | undefined): string {
    return formatDateTimePtBr(valor);
  }

  resumoMotivo(erro: string | null | undefined): string | null {
    if (!erro?.trim()) return null;
    const info = explicarErroFila(erro);
    return info.titulo ?? info.mensagem;
  }

  detalheErro(erro: string | null | undefined) {
    return explicarErroFila(erro);
  }

  linkWhatsappOperacional(erro: string | null | undefined): boolean {
    return (
      typeof erro === 'string' &&
      (erro.includes('risco operacional') || erro.includes('pausada automaticamente'))
    );
  }

  statusBadge(status: StatusNotificacao): { label: string; className: string } {
    if (status === 'PENDENTE' || status === 'PROCESSANDO') {
      return {
        label: this.statusLabels[status],
        className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      };
    }

    if (['ENVIADA', 'ENTREGUE', 'LIDA'].includes(status)) {
      return {
        label: this.statusLabels[status],
        className:
          'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]',
      };
    }

    return {
      label: this.statusLabels[status],
      className:
        'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger-border)]',
    };
  }

  classeCanal(canal: CanalNotificacao): string {
    switch (canal) {
      case 'WHATSAPP':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'EMAIL':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'TELEGRAM':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      default:
        return 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border-[var(--color-border)]';
    }
  }
}
