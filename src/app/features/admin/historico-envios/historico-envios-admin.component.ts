import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
import {
  explicarErroFila,
  labelStatusOperacional,
} from '../../../shared/labels/whatsapp-operacional.labels';
import {
  AdminNotificacaoDetalhe,
  AdminNotificacaoFilaItem,
  AdminOrganizacaoOperacionalResumo,
  CanalNotificacao,
  OrganizacaoAdminResponse,
  StatusNotificacao,
} from '../../../shared/types/dtos';

type FiltroRapido = '' | 'REATIVAR' | 'CONTATO_463';

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
  readonly resumoOperacional = signal<AdminOrganizacaoOperacionalResumo[]>([]);
  readonly selecionados = signal<Set<number>>(new Set());
  readonly filtroRapido = signal<FiltroRapido>('');
  readonly erro = signal<string | null>(null);
  readonly acaoLoading = signal(false);
  motivoCancelamento = '';

  filtroOrganizacao: number | null = null;
  filtroDestinatario = '';
  filtroCanal: CanalNotificacao | '' = '';
  filtroStatus: StatusNotificacao | '' = '';

  readonly itensVisiveis = computed(() => {
    const filtro = this.filtroRapido();
    const lista = this.itens();

    if (filtro === 'REATIVAR') {
      return lista.filter((item) => item.acaoSugeridaCodigo === 'REATIVAR_SESSAO_WHATSAPP');
    }

    if (filtro === 'CONTATO_463') {
      return lista.filter((item) => item.acaoSugeridaCodigo === 'CONTATO_INICIAR_CONVERSA');
    }

    return lista;
  });

  readonly itensCancelaveisVisiveis = computed(() =>
    this.itensVisiveis().filter((item) => this.podeCancelar(item.status))
  );

  readonly todosCancelaveisSelecionados = computed(() => {
    const cancelaveis = this.itensCancelaveisVisiveis();
    if (cancelaveis.length === 0) return false;
    const selecionados = this.selecionados();
    return cancelaveis.every((item) => selecionados.has(item.idNotificacao));
  });

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
    this.carregarResumo();
    this.carregar();
  }

  carregar(): void {
    this.table.loading.set(true);
    this.erro.set(null);
    this.selecionados.set(new Set());

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

  carregarResumo(): void {
    this.adminNotificacaoService.resumoOperacional().subscribe({
      next: (resumo) => this.resumoOperacional.set(resumo.organizacoes ?? []),
    });
  }

  aplicarFiltros(): void {
    this.filtroRapido.set('');
    this.table.paginaAtual.set(0);
    this.carregar();
  }

  limparFiltros(): void {
    this.filtroOrganizacao = null;
    this.filtroDestinatario = '';
    this.filtroCanal = '';
    this.filtroStatus = '';
    this.filtroRapido.set('');
    this.table.paginaAtual.set(0);
    this.carregar();
  }

  aplicarFiltroRapido(tipo: FiltroRapido | 'PENDENTE'): void {
    if (tipo === 'PENDENTE') {
      this.filtroStatus = 'PENDENTE';
      this.filtroRapido.set('');
      this.aplicarFiltros();
      return;
    }

    this.filtroRapido.set(tipo);
  }

  limparFiltroRapido(): void {
    this.filtroRapido.set('');
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

  cancelarItem(item: AdminNotificacaoFilaItem): void {
    if (!confirm(`Cancelar notificação #${item.idNotificacao}?`)) return;
    this.acaoLoading.set(true);
    this.adminNotificacaoService.cancelar(item.idNotificacao, this.motivoCancelamento).subscribe({
      next: () => {
        this.acaoLoading.set(false);
        this.carregar();
        this.carregarResumo();
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(err.error?.mensagem ?? err.error?.erro ?? 'Erro ao cancelar.');
        this.acaoLoading.set(false);
      },
    });
  }

  cancelarSelecionados(): void {
    const ids = [...this.selecionados()];
    if (ids.length === 0) return;
    if (!confirm(`Cancelar ${ids.length} notificação(ões) selecionada(s)?`)) return;

    this.acaoLoading.set(true);
    this.adminNotificacaoService
      .cancelarLote({ ids, motivo: this.motivoCancelamento || undefined })
      .subscribe({
        next: (resultado) => {
          this.acaoLoading.set(false);
          this.selecionados.set(new Set());
          this.carregar();
          this.carregarResumo();
          if (resultado.ignorados > 0) {
            this.erro.set(
              `${resultado.cancelados} cancelada(s). ${resultado.ignorados} ignorada(s) (já enviadas ou indisponíveis).`
            );
          }
        },
        error: (err: HttpErrorResponse) => {
          this.erro.set(err.error?.mensagem ?? err.error?.erro ?? 'Erro ao cancelar em lote.');
          this.acaoLoading.set(false);
        },
      });
  }

  cancelarTodosCancelaveisOrganizacao(): void {
    if (!this.filtroOrganizacao) return;
    const org = this.organizacoes().find((o) => o.idOrganizacao === this.filtroOrganizacao);
    const nome = org?.nmOrganizacao ?? `org #${this.filtroOrganizacao}`;
    if (!confirm(`Cancelar todos os envios canceláveis de ${nome}?`)) return;

    this.acaoLoading.set(true);
    this.adminNotificacaoService
      .cancelarLote({
        idOrganizacao: this.filtroOrganizacao,
        somenteCancelaveis: true,
        motivo: this.motivoCancelamento || undefined,
      })
      .subscribe({
        next: (resultado) => {
          this.acaoLoading.set(false);
          this.selecionados.set(new Set());
          this.carregar();
          this.carregarResumo();
          if (resultado.ignorados > 0) {
            this.erro.set(
              `${resultado.cancelados} cancelada(s). ${resultado.ignorados} ignorada(s).`
            );
          }
        },
        error: (err: HttpErrorResponse) => {
          this.erro.set(err.error?.mensagem ?? err.error?.erro ?? 'Erro ao cancelar em lote.');
          this.acaoLoading.set(false);
        },
      });
  }

  reativarWhatsapp(org: AdminOrganizacaoOperacionalResumo | AdminNotificacaoDetalhe | AdminNotificacaoFilaItem): void {
    if (!confirm(`Cancelar a pausa e retomar os envios da organização ${org.nmOrganizacao}?`)) return;
    this.acaoLoading.set(true);
    this.adminNotificacaoService.reativarWhatsappOrganizacao(org.idOrganizacao).subscribe({
      next: () => {
        this.acaoLoading.set(false);
        this.carregar();
        this.carregarResumo();
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(err.error?.mensagem ?? 'Erro ao reativar WhatsApp.');
        this.acaoLoading.set(false);
      },
    });
  }

  toggleSelecao(idNotificacao: number, checked: boolean): void {
    const next = new Set(this.selecionados());
    if (checked) next.add(idNotificacao);
    else next.delete(idNotificacao);
    this.selecionados.set(next);
  }

  toggleSelecionarTodosCancelaveis(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.selecionados());
    for (const item of this.itensCancelaveisVisiveis()) {
      if (checked) next.add(item.idNotificacao);
      else next.delete(item.idNotificacao);
    }
    this.selecionados.set(next);
  }

  estaSelecionado(idNotificacao: number): boolean {
    return this.selecionados().has(idNotificacao);
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

  labelStatusOperacional = labelStatusOperacional;

  detalheErro(erro: string | null | undefined, codigoErro?: string | null) {
    return explicarErroFila(erro, codigoErro);
  }

  acaoSugeridaClass(item: AdminNotificacaoFilaItem): string {
    if (item.acaoSugeridaDestaque) {
      return 'app-badge-warning';
    }
    return 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border-[var(--color-border)]';
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
        this.carregarResumo();
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(err.error?.mensagem ?? err.error?.erro ?? 'Erro ao executar ação.');
        this.acaoLoading.set(false);
      },
    });
  }
}
