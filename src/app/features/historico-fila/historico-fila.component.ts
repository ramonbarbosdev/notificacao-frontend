import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  ChevronDown,
  ChevronUp,
  LayoutList,
  LayoutPanelLeft,
  LoaderCircle,
  LucideAngularModule,
  Radio,
  RefreshCw,
  Search,
  Users,
} from 'lucide-angular';
import { Subscription, timer } from 'rxjs';

import { NotificacaoService } from '../../core/services/notificacao.service';
import { OrganizacaoConfiguracaoService } from '../../core/services/organizacao-configuracao.service';
import { CommandDialogService } from '../../core/services/command-dialog.service';
import { NotificacaoFilaEventsService } from '../../core/http/notificacao-fila-events.service';
import { AuthService } from '../../core/auth/auth.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { FilaProgressoPainelComponent } from '../../shared/components/fila-progresso-painel/fila-progresso-painel.component';
import { usePaginatedTable } from '../../shared/helper/paginated-table.state';
import { formatCanal, canalUnicoUi } from '../../shared/helper/channel.utils';
import { formatDateTimePtBr } from '../../shared/helper/date.utils';
import {
  destinatarioMatchesFilter,
  formatDestinatario,
  maskPhoneInput,
  normalizeBrazilWhatsappMobile,
} from '../../shared/helper/phone.utils';
import {
  ehErroPausaSessaoWhatsapp,
  ehErroRestricaoContatoWhatsapp,
  explicarErroFila,
} from '../../shared/labels/whatsapp-operacional.labels';
import { CanalNotificacao, FilaNotificacaoItemDTO, FilaResumoResponseDTO, StatusNotificacao } from '../../shared/types/dtos';

type ModoExibicaoFila = 'lista' | 'fila' | 'contatos';

interface GrupoContatoFila {
  chave: string;
  canal: CanalNotificacao;
  destinatario: string;
  rotulo: string;
  total: number;
  pendentes: number;
  falhas: number;
  ultimoEnvio: string;
  itens: FilaNotificacaoItemDTO[];
}

@Component({
  selector: 'app-historico-fila',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule,
    EmptyStateComponent,
    FilaProgressoPainelComponent,
  ],
  templateUrl: './historico-fila.component.html',
})
export class HistoricoFilaComponent implements OnInit, OnDestroy {
  private readonly notificacaoService = inject(NotificacaoService);
  private readonly orgConfigService = inject(OrganizacaoConfiguracaoService);
  private readonly commandDialog = inject(CommandDialogService);
  private readonly filaEventsService = inject(NotificacaoFilaEventsService);
  private readonly authService = inject(AuthService);

  private wsSub?: Subscription;
  private pollSub?: Subscription;

  readonly reenviandoId = signal<number | null>(null);
  readonly aoVivo = signal(false);
  readonly resumoFila = signal<FilaResumoResponseDTO | null>(null);
  readonly ultimaAtualizacao = signal<Date | null>(null);

  protected readonly loaderIcon = LoaderCircle;
  protected readonly refreshIcon = RefreshCw;
  protected readonly searchIcon = Search;
  protected readonly chevronDownIcon = ChevronDown;
  protected readonly chevronUpIcon = ChevronUp;
  protected readonly aoVivoIcon = Radio;
  protected readonly listaIcon = LayoutList;
  protected readonly filaIcon = LayoutPanelLeft;
  protected readonly contatosIcon = Users;

  readonly modoExibicao = signal<ModoExibicaoFila>('lista');
  readonly delayMinSegundos = signal<number | null>(null);
  readonly delayMaxSegundos = signal<number | null>(null);

  readonly table = usePaginatedTable(10);
  readonly itens = signal<FilaNotificacaoItemDTO[]>([]);
  readonly erro = signal<string | null>(null);
  readonly expandidos = signal<Set<number>>(new Set());
  readonly gruposExpandidos = signal<Set<string>>(new Set());

  readonly canalUnico = canalUnicoUi();
  readonly filtroDestinatario = signal('');
  readonly filtroCanal = signal<CanalNotificacao | ''>(this.canalUnico ? 'WHATSAPP' : '');
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

  readonly canais = this.montarOpcoesCanal();

  private montarOpcoesCanal(): { value: CanalNotificacao | ''; label: string }[] {
    if (this.canalUnico) {
      return [{ value: 'WHATSAPP', label: 'WhatsApp' }];
    }

    return [
      { value: '', label: 'Todos os canais' },
      { value: 'WHATSAPP', label: 'WhatsApp' },
      { value: 'EMAIL', label: 'E-mail' },
      { value: 'TELEGRAM', label: 'Telegram' },
      { value: 'WEBHOOK', label: 'Webhook' },
    ];
  }

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
        destinatarioMatchesFilter(item.canal, item.destinatario, destinatario) &&
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

  readonly itensFilaAtivos = computed(() =>
    this.itensFiltrados()
      .filter((item) =>
        ['PENDENTE', 'PROCESSANDO', 'FALHOU', 'BLOQUEADA'].includes(item.status),
      )
      .sort((a, b) => {
        const peso = (status: StatusNotificacao) => {
          if (status === 'PROCESSANDO') return 0;
          if (status === 'PENDENTE') return 1;
          return 2;
        };
        const diff = peso(a.status) - peso(b.status);
        if (diff !== 0) {
          return diff;
        }
        return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
      }),
  );

  readonly gruposContato = computed(() => this.agruparPorContato(this.itensFiltrados()));

  readonly totalGrupos = computed(() => this.gruposContato().length);

  readonly totalPaginasGrupos = computed(() =>
    Math.max(1, Math.ceil(this.totalGrupos() / this.table.tamanhoPagina())),
  );

  readonly gruposPaginados = computed(() => {
    const inicio = this.table.paginaAtual() * this.table.tamanhoPagina();
    const fim = inicio + this.table.tamanhoPagina();
    return this.gruposContato().slice(inicio, fim);
  });

  readonly resumoStatus = computed(() => {
    const contagem = new Map<StatusNotificacao, number>();

    for (const item of this.itensFiltrados()) {
      contagem.set(item.status, (contagem.get(item.status) ?? 0) + 1);
    }

    return Array.from(contagem.entries()).map(([status, total]) => ({ status, total }));
  });

  readonly temItensAtivos = computed(() =>
    this.itens().some((item) => item.status === 'PENDENTE' || item.status === 'PROCESSANDO')
  );

  constructor() {
    effect(() => {
      this.temItensAtivos();
      this.reagendarPolling();
    });
  }

  ngOnInit(): void {
    this.carregarFila();
    this.carregarResumo();
    this.carregarConfiguracaoEnvio();
    this.iniciarAoVivo();
  }

  selecionarModoExibicao(modo: ModoExibicaoFila): void {
    this.modoExibicao.set(modo);
    this.table.paginaAtual.set(0);
    this.expandidos.set(new Set());
    this.gruposExpandidos.set(new Set());
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.pollSub?.unsubscribe();
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
          this.ultimaAtualizacao.set(new Date());
        },
        error: (err: HttpErrorResponse) => {
          this.erro.set(err.error?.mensagem ?? err.error?.erro ?? 'Erro ao carregar a fila.');
          this.table.loading.set(false);
        },
      });
  }

  private carregarFilaSilencioso(): void {
    this.notificacaoService
      .listar({
        page: 0,
        size: 200,
        sort: 'dtCriacao,desc',
      })
      .subscribe({
        next: (res) => {
          this.itens.set(res.data);
          this.ultimaAtualizacao.set(new Date());
        },
      });

    this.carregarResumo();
  }

  private carregarResumo(): void {
    this.notificacaoService.resumoFila().subscribe({
      next: (resumo) => this.resumoFila.set(resumo),
    });
  }

  private carregarConfiguracaoEnvio(): void {
    this.orgConfigService.buscar().subscribe({
      next: (config) => {
        this.delayMinSegundos.set(config.whatsappDelayMinSegundos);
        this.delayMaxSegundos.set(config.whatsappDelayMaxSegundos);
      },
    });
  }

  private iniciarAoVivo(): void {
    const idOrganizacao = this.authService.idOrganizacaoAtual();
    if (!idOrganizacao) return;

    this.wsSub?.unsubscribe();
    this.wsSub = this.filaEventsService.conectar(idOrganizacao).subscribe({
      next: (evento) => {
        this.aoVivo.set(true);
        if (evento.resumo) {
          this.resumoFila.set(evento.resumo);
        }
        this.carregarFilaSilencioso();
      },
      error: () => {
        this.aoVivo.set(false);
      },
      complete: () => {
        this.aoVivo.set(false);
      },
    });
  }

  private reagendarPolling(): void {
    this.pollSub?.unsubscribe();

    if (!this.temItensAtivos()) return;

    this.pollSub = timer(6000, 6000).subscribe(() => this.carregarFilaSilencioso());
  }

  textoPrevisao(item: FilaNotificacaoItemDTO): string | null {
    if (item.status !== 'PENDENTE' && item.status !== 'PROCESSANDO') {
      return null;
    }

    if (item.tempoEstimadoEnvioTexto) {
      return `Previsão de envio: ${item.tempoEstimadoEnvioTexto}`;
    }

    if (item.retomadaPrevistaTexto) {
      return `Retomada ${item.retomadaPrevistaTexto}`;
    }

    return 'Aguardando processamento';
  }

  horarioPrevisao(item: FilaNotificacaoItemDTO): string | null {
    if (!item.previsaoEnvioEm) return null;
    return formatDateTimePtBr(item.previsaoEnvioEm);
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

  totalPaginasExibicao(): number {
    return this.modoExibicao() === 'contatos' ? this.totalPaginasGrupos() : this.totalPaginas();
  }

  totalElementosExibicao(): number {
    return this.modoExibicao() === 'contatos' ? this.totalGrupos() : this.totalElementos();
  }

  proximaPagina(): void {
    if (this.table.paginaAtual() + 1 >= this.totalPaginasExibicao()) return;
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

  toggleGrupoContato(chave: string): void {
    this.gruposExpandidos.update((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(chave)) {
        proximo.delete(chave);
      } else {
        proximo.add(chave);
      }
      return proximo;
    });
  }

  grupoExpandido(chave: string): boolean {
    return this.gruposExpandidos().has(chave);
  }

  iniciaisContato(rotulo: string): string {
    const limpo = rotulo.replace(/\D/g, '');
    if (limpo.length >= 2) {
      return limpo.slice(-2);
    }
    return rotulo.slice(0, 2).toUpperCase() || '?';
  }

  private agruparPorContato(itens: FilaNotificacaoItemDTO[]): GrupoContatoFila[] {
    const mapa = new Map<string, GrupoContatoFila>();

    for (const item of itens) {
      const destinatarioCanonico =
        item.canal === 'WHATSAPP'
          ? normalizeBrazilWhatsappMobile(item.destinatario)
          : item.destinatario.trim().toLowerCase();
      const chave = `${item.canal}:${destinatarioCanonico || item.destinatario}`;
      const rotulo = formatDestinatario(item.canal, item.destinatario);
      const existente = mapa.get(chave);

      if (!existente) {
        mapa.set(chave, {
          chave,
          canal: item.canal,
          destinatario: item.destinatario,
          rotulo,
          total: 1,
          pendentes: this.ehStatusAtivo(item.status) ? 1 : 0,
          falhas: this.ehStatusFalha(item.status) ? 1 : 0,
          ultimoEnvio: item.criadoEm,
          itens: [item],
        });
        continue;
      }

      existente.total += 1;
      if (this.ehStatusAtivo(item.status)) {
        existente.pendentes += 1;
      }
      if (this.ehStatusFalha(item.status)) {
        existente.falhas += 1;
      }
      if (new Date(item.criadoEm).getTime() > new Date(existente.ultimoEnvio).getTime()) {
        existente.ultimoEnvio = item.criadoEm;
      }
      existente.itens.push(item);
    }

    return Array.from(mapa.values())
      .map((grupo) => ({
        ...grupo,
        itens: [...grupo.itens].sort(
          (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(),
        ),
      }))
      .sort((a, b) => new Date(b.ultimoEnvio).getTime() - new Date(a.ultimoEnvio).getTime());
  }

  private ehStatusAtivo(status: StatusNotificacao): boolean {
    return status === 'PENDENTE' || status === 'PROCESSANDO';
  }

  private ehStatusFalha(status: StatusNotificacao): boolean {
    return status === 'FALHOU' || status === 'BLOQUEADA' || status === 'CANCELADA';
  }

  formatarDestinatario = formatDestinatario;

  formatarCanal(canal: CanalNotificacao): string {
    return formatCanal(canal);
  }

  formatarData(valor: string | Date | null | undefined): string {
    return formatDateTimePtBr(valor);
  }

  resumoMotivo(item: FilaNotificacaoItemDTO): string | null {
    if (item.motivoAguardando?.trim()) {
      if (item.status === 'PENDENTE' || item.status === 'ENVIADA') {
        return item.motivoAguardando;
      }
    }
    if (!item.erro?.trim()) return null;
    const info = explicarErroFila(item.erro, item.codigoErro);
    return info.titulo ?? info.mensagem;
  }

  detalheErro(item: FilaNotificacaoItemDTO): ReturnType<typeof explicarErroFila> {
    if (item.motivoAguardando?.trim()) {
      if (item.status === 'PENDENTE') {
        return {
          titulo: 'Aguardando envio',
          mensagem: item.motivoAguardando,
          explicacao: item.motivoAguardando,
        };
      }
      if (item.status === 'ENVIADA') {
        return {
          titulo: 'Entrega nao confirmada',
          mensagem: item.motivoAguardando,
          explicacao: item.motivoAguardando,
        };
      }
    }
    return explicarErroFila(item.erro, item.codigoErro);
  }

  linkWhatsappOperacional(item: FilaNotificacaoItemDTO): boolean {
    const texto = item.erro ?? item.motivoAguardando ?? '';
    if (ehErroRestricaoContatoWhatsapp(texto, item.codigoErro)) {
      return false;
    }
    return ehErroPausaSessaoWhatsapp(texto);
  }

  isAdminOrganizacao(): boolean {
    return this.authService.role() === 'ADMIN';
  }

  podeReenviar(status: StatusNotificacao): boolean {
    return status === 'FALHOU' || status === 'BLOQUEADA' || status === 'CANCELADA';
  }

  async reenviar(item: FilaNotificacaoItemDTO): Promise<void> {
    const confirmado = await this.commandDialog.confirm({
      title: 'Reenviar notificacao',
      message: `Reenviar notificacao #${item.idNotificacao}?`,
      confirmLabel: 'Reenviar',
    });
    if (!confirmado) return;
    this.reenviandoId.set(item.idNotificacao);
    this.notificacaoService.reenviar(item.idNotificacao).subscribe({
      next: () => {
        this.reenviandoId.set(null);
        this.carregarFila();
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(err.error?.mensagem ?? err.error?.erro ?? 'Erro ao reenviar notificação.');
        this.reenviandoId.set(null);
      },
    });
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

  classeCanal(canal: CanalNotificacao): string {
    switch (canal) {
      case 'WHATSAPP':
        return 'app-badge-success';
      case 'EMAIL':
        return 'app-badge-info';
      case 'TELEGRAM':
        return 'app-badge-info';
      default:
        return 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border-[var(--color-border)]';
    }
  }
}
