import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Clock, LoaderCircle, LucideAngularModule, RefreshCw } from 'lucide-angular';

import { NotificacaoService } from '../../core/services/notificacao.service';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { DataTableColumn } from '../../shared/components/data-table/data-table.types';
import { usePaginatedTable } from '../../shared/helper/paginated-table.state';
import { formatCanal } from '../../shared/helper/channel.utils';
import { formatDateTimePtBr } from '../../shared/helper/date.utils';
import { formatPhone } from '../../shared/helper/phone.utils';
import { CanalNotificacao, FilaNotificacaoItemDTO, StatusNotificacao } from '../../shared/types/dtos';

@Component({
  selector: 'app-historico-fila',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    DataTableComponent,
  ],
  templateUrl: './historico-fila.component.html',
})
export class HistoricoFilaComponent implements OnInit {
  private readonly notificacaoService = inject(NotificacaoService);

  protected readonly clockIcon = Clock;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly refreshIcon = RefreshCw;

  readonly table = usePaginatedTable(10);
  readonly itens = signal<FilaNotificacaoItemDTO[]>([]);
  readonly filtros = signal<Record<string, any>>({});
  readonly erro = signal<string | null>(null);

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

  readonly itensFiltrados = computed(() => {
    const filtros = this.filtros();

    return this.itens().filter((item) => {
      const id = filtros['idNotificacao'];
      const canal = filtros['canal'] as CanalNotificacao | undefined;
      const destinatario = String(filtros['destinatario'] ?? '').toLowerCase();
      const status = filtros['status'] as StatusNotificacao | undefined;
      const provider = String(filtros['provider'] ?? '').toLowerCase();

      return (
        (!id || item.idNotificacao === Number(id)) &&
        (!canal || item.canal === canal) &&
        (!destinatario || item.destinatario.toLowerCase().includes(destinatario)) &&
        (!status || item.status === status) &&
        (!provider || (item.provider ?? '').toLowerCase().includes(provider))
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

  readonly columns: DataTableColumn<FilaNotificacaoItemDTO>[] = [
    {
      key: 'destinatario',
      label: 'Destinatario',
      formatter: (value, row) =>
        row.canal === 'WHATSAPP' ? formatPhone(value) : value || '-',
      filter: {
        type: 'text',
        placeholder: 'Buscar destinatario',
      },
    },
    {
      key: 'canal',
      label: 'Canal',
      formatter: (value) => formatCanal(value),
      filter: {
        type: 'select',
        options: [
          { label: 'Todos', value: '' },
          { label: 'WhatsApp', value: 'WHATSAPP' },
          { label: 'Email', value: 'EMAIL' },
          { label: 'Telegram', value: 'TELEGRAM' },
          { label: 'Webhook', value: 'WEBHOOK' },
        ],
      },
    },
   
    {
      key: 'status',
      label: 'Status',
      type: 'badge',
      filter: {
        type: 'select',
        options: [
          { label: 'Todos', value: '' },
          { label: 'Pendente', value: 'PENDENTE' },
          { label: 'Processando', value: 'PROCESSANDO' },
          { label: 'Enviada', value: 'ENVIADA' },
          { label: 'Entregue', value: 'ENTREGUE' },
          { label: 'Lida', value: 'LIDA' },
          { label: 'Falhou', value: 'FALHOU' },
          { label: 'Bloqueada', value: 'BLOQUEADA' },
          { label: 'Cancelada', value: 'CANCELADA' },
        ],
      },
      badge: (value) => this.statusBadge(value),
    },
    {
      key: 'provider',
      label: 'Provider',
      formatter: (value) => value || '-',
      filter: {
        type: 'text',
        placeholder: 'Provider',
      },
    },
    {
      key: 'tentativas',
      label: 'Tentativas',
      align: 'center',
    },
    {
      key: 'proximaTentativa',
      label: 'Proxima tentativa',
      formatter: (value) => formatDateTimePtBr(value),
    },
    {
      key: 'erro',
      label: 'Erro',
      formatter: (value) => value || '-',
    },
    {
      key: 'criadoEm',
      label: 'Criado em',
      formatter: (value) => formatDateTimePtBr(value),
    },
  ];

  ngOnInit(): void {
    this.carregarFila();
  }

  carregarFila(): void {
    this.table.loading.set(true);
    this.erro.set(null);

    this.notificacaoService.listar(
      {
        page: this.table.paginaAtual(),
        size: this.table.tamanhoPagina(),
        sort: 'dtCriacao,desc'
      }
    ).subscribe({
      next: (res) => {
        this.itens.set(res.data);
        this.table.paginaAtual.set(0);
        this.table.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(err.error?.mensagem ?? err.error?.erro ?? 'Erro ao carregar a fila.');
        this.table.loading.set(false);
      },
    });
  }

  aplicarFiltros(filtros: Record<string, any>): void {
    this.filtros.set(filtros);
    this.table.paginaAtual.set(0);
  }

  proximaPagina(): void {
    if (this.table.paginaAtual() + 1 >= this.totalPaginas()) return;

    this.table.paginaAtual.update((page) => page + 1);
  }

  paginaAnterior(): void {
    if (this.table.paginaAtual() <= 0) return;

    this.table.paginaAtual.update((page) => page - 1);
  }

  alterarTamanhoPagina(size: number): void {
    this.table.tamanhoPagina.set(size);
    this.table.paginaAtual.set(0);
  }

  private statusBadge(status: StatusNotificacao): { label: string; className: string } {
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

}
