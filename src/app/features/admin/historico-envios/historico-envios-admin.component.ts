import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LoaderCircle,
  LucideAngularModule,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  XCircle,
} from 'lucide-angular';

import { AdminNotificacaoService } from '../../../core/services/admin-notificacao.service';
import { AdminService } from '../../../core/http/admin.service';
import { SidePanelComponent } from '../../../shared/components/side-panel/side-panel.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { usePaginatedTable } from '../../../shared/helper/paginated-table.state';
import { useSidePanel } from '../../../shared/helper/side-panel.state';
import { formatCanal } from '../../../shared/helper/channel.utils';
import { formatDateTimePtBr } from '../../../shared/helper/date.utils';
import { formatDestinatario } from '../../../shared/helper/phone.utils';
import { explicarErroFila } from '../../../shared/labels/whatsapp-operacional.labels';
import {
  AdminNotificacaoDetalhe,
  AdminNotificacaoFilaItem,
  CanalNotificacao,
  OrganizacaoAdminResponse,
  StatusNotificacao,
} from '../../../shared/types/dtos';

@Component({
  selector: 'app-historico-envios-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    SidePanelComponent,
    EmptyStateComponent,
  ],
  templateUrl: './historico-envios-admin.component.html',
})
export class HistoricoEnviosAdminComponent implements OnInit {
  private readonly adminNotificacaoService = inject(AdminNotificacaoService);
  private readonly adminService = inject(AdminService);

  protected readonly loaderIcon = LoaderCircle;
  protected readonly refreshIcon = RefreshCw;
  protected readonly reenviarIcon = RotateCcw;
  protected readonly cancelarIcon = XCircle;
  protected readonly reativarIcon = ShieldAlert;
  protected readonly detalheIcon = Send;

  readonly table = usePaginatedTable(20);
  readonly panel = useSidePanel<AdminNotificacaoDetalhe>();
  readonly itens = signal<AdminNotificacaoFilaItem[]>([]);
  readonly organizacoes = signal<OrganizacaoAdminResponse[]>([]);
  readonly erro = signal<string | null>(null);
  readonly acaoLoading = signal(false);
  motivoCancelamento = '';

  filtroOrganizacao: number | null = null;
  filtroDestinatario = '';
  filtroCanal: CanalNotificacao | '' = '';
  filtroStatus: StatusNotificacao | '' = '';

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

  ngOnInit(): void {
    this.adminService.listarOrganizacoes().subscribe({
      next: (orgs) => this.organizacoes.set(orgs),
    });
    this.carregar();
  }

  carregar(): void {
    this.table.loading.set(true);
    this.erro.set(null);

    this.adminNotificacaoService
      .listarFila({
        page: this.table.paginaAtual(),
        size: this.table.tamanhoPagina(),
        idOrganizacao: this.filtroOrganizacao,
        destinatario: this.filtroDestinatario,
        canal: this.filtroCanal || undefined,
        status: this.filtroStatus || undefined,
      })
      .subscribe({
        next: (page) => {
          this.itens.set(page.data);
          this.table.atualizarPaginacao(page);
          this.table.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.erro.set(err.error?.mensagem ?? err.error?.erro ?? 'Erro ao carregar histórico global.');
          this.table.loading.set(false);
        },
      });
  }

  aplicarFiltros(): void {
    this.table.paginaAtual.set(0);
    this.carregar();
  }

  limparFiltros(): void {
    this.filtroOrganizacao = null;
    this.filtroDestinatario = '';
    this.filtroCanal = '';
    this.filtroStatus = '';
    this.table.paginaAtual.set(0);
    this.carregar();
  }

  proximaPagina(): void {
    this.table.proximaPagina(() => this.carregar());
  }

  paginaAnterior(): void {
    this.table.paginaAnterior(() => this.carregar());
  }

  alterarTamanhoPagina(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value);
    this.table.alterarTamanhoPagina(size, () => this.carregar());
  }

  abrirDetalhe(item: AdminNotificacaoFilaItem): void {
    this.motivoCancelamento = '';
    this.adminNotificacaoService.obterDetalhe(item.idNotificacao).subscribe({
      next: (detalhe) => this.panel.abrir(detalhe),
      error: (err: HttpErrorResponse) => {
        this.erro.set(err.error?.mensagem ?? 'Erro ao carregar detalhe.');
      },
    });
  }

  reenviar(item: AdminNotificacaoFilaItem | AdminNotificacaoDetalhe): void {
    if (!confirm(`Reenviar notificação #${item.idNotificacao}?`)) return;
    this.executarAcao(() => this.adminNotificacaoService.reenviar(item.idNotificacao));
  }

  cancelar(detalhe: AdminNotificacaoDetalhe): void {
    if (!confirm(`Cancelar notificação #${detalhe.idNotificacao}?`)) return;
    this.executarAcao(() =>
      this.adminNotificacaoService.cancelar(detalhe.idNotificacao, this.motivoCancelamento)
    );
  }

  reativarWhatsapp(detalhe: AdminNotificacaoDetalhe): void {
    if (!confirm(`Reativar operação WhatsApp da organização ${detalhe.nmOrganizacao}?`)) return;
    this.acaoLoading.set(true);
    this.adminNotificacaoService.reativarWhatsappOrganizacao(detalhe.idOrganizacao).subscribe({
      next: () => {
        this.acaoLoading.set(false);
        this.carregar();
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(err.error?.mensagem ?? 'Erro ao reativar WhatsApp.');
        this.acaoLoading.set(false);
      },
    });
  }

  podeReenviar(status: StatusNotificacao): boolean {
    return status === 'FALHOU' || status === 'BLOQUEADA' || status === 'CANCELADA';
  }

  podeCancelar(status: StatusNotificacao): boolean {
    return status === 'PENDENTE' || status === 'PROCESSANDO' || status === 'FALHOU' || status === 'BLOQUEADA';
  }

  formatarDestinatario = formatDestinatario;

  formatarCanal(canal: CanalNotificacao): string {
    return formatCanal(canal);
  }

  formatarData(valor: string | null | undefined): string {
    return formatDateTimePtBr(valor);
  }

  detalheErro(erro: string | null | undefined) {
    return explicarErroFila(erro);
  }

  statusBadge(status: StatusNotificacao): { label: string; className: string } {
    if (status === 'PENDENTE' || status === 'PROCESSANDO') {
      return {
        label: this.statusLabels[status],
        className: 'app-badge-warning',
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

  private executarAcao(acao: () => import('rxjs').Observable<AdminNotificacaoDetalhe>): void {
    this.acaoLoading.set(true);
    acao().subscribe({
      next: (detalhe) => {
        this.panel.abrir(detalhe);
        this.acaoLoading.set(false);
        this.carregar();
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(err.error?.mensagem ?? err.error?.erro ?? 'Erro ao executar ação.');
        this.acaoLoading.set(false);
      },
    });
  }
}
