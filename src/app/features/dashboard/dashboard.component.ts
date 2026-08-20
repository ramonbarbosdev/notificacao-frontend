
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize, Subscription, timer } from 'rxjs';
import {
  Ban,
  ChevronRight,
  Clock,
  History,
  LoaderCircle,
  LucideAngularModule,
  LucideIconData,
  MessageCircle,
  MessageSquareText,
  Send,
  TriangleAlert,
  UserCheck,
} from 'lucide-angular';

import { formatNumberPtBr } from '../../shared/helper/number.utils';
import { AuthService } from '../../core/auth/auth.service';
import { NotificacaoService } from '../../core/services/notificacao.service';
import { NotificacaoFilaEventsService } from '../../core/http/notificacao-fila-events.service';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { FilaResumoResponseDTO, StatusNotificacao, WhatsappStatusResponse } from '../../shared/types/dtos';
import { WhatsappStatusCardComponent } from '../../shared/components/whatsapp-status-card/whatsapp-status-card.component';
import { MetricCardComponent, MetricTone } from '../../shared/components/metric-card/metric-card.component';
import {
  QuickActionCardComponent,
  QuickActionTone,
} from '../../shared/components/quick-action-card/quick-action-card.component';

interface DashboardMetric {
  title: string;
  description: string;
  icon: LucideIconData;
  tone: MetricTone;
  status: StatusNotificacao;
}

interface QuickAction {
  title: string;
  description: string;
  routerLink: string;
  icon: LucideIconData;
  tone?: QuickActionTone;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule,
    WhatsappStatusCardComponent,
    MetricCardComponent,
    QuickActionCardComponent,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly whatsappService = inject(WhatsappService);
  private readonly notificacaoService = inject(NotificacaoService);
  private readonly filaEventsService = inject(NotificacaoFilaEventsService);

  private wsSub?: Subscription;
  private pollSub?: Subscription;

  readonly resumoFila = signal<FilaResumoResponseDTO | null>(null);
  readonly aoVivo = signal(false);

  protected readonly whatsappIcon = MessageCircle;
  protected readonly chevronRightIcon = ChevronRight;

  readonly whatsappStatus = signal<WhatsappStatusResponse | null>(null);
  readonly carregandoStatus = signal(true);
  readonly carregandoMetricas = signal(true);
  readonly contadores = signal<Record<StatusNotificacao, number>>({
    PENDENTE: 0,
    PROCESSANDO: 0,
    ENVIADA: 0,
    ENTREGUE: 0,
    LIDA: 0,
    FALHOU: 0,
    BLOQUEADA: 0,
    CANCELADA: 0,
  });

  readonly metricas: DashboardMetric[] = [
    {
      title: 'Pendentes',
      description: 'Aguardando processamento',
      icon: Clock,
      tone: 'warning',
      status: 'PENDENTE',
    },
    {
      title: 'Processando',
      description: 'Em execução pela fila',
      icon: LoaderCircle,
      tone: 'info',
      status: 'PROCESSANDO',
    },
    {
      title: 'Enviadas',
      description: 'Enviadas com sucesso',
      icon: Send,
      tone: 'success',
      status: 'ENVIADA',
    },
    {
      title: 'Falhas',
      description: 'Erros de envio',
      icon: TriangleAlert,
      tone: 'danger',
      status: 'FALHOU',
    },
    {
      title: 'Bloqueadas',
      description: 'Consentimento ou bloqueio',
      icon: Ban,
      tone: 'danger',
      status: 'BLOQUEADA',
    },
  ];

  readonly quickActions: QuickAction[] = [
    {
      title: 'Enviar mensagem',
      description: 'WhatsApp manual com consentimento',
      routerLink: '/app/whatsapp',
      icon: MessageCircle,
      tone: 'success',
    },
    // {
    //   title: 'Templates',
    //   description: 'Gerenciar modelos',
    //   routerLink: '/app/templates',
    //   icon: MessageSquareText,
    // },
    {
      title: 'Contatos',
      description: 'Consentimentos e bloqueios',
      routerLink: '/app/contatos',
      icon: UserCheck,
    },
    {
      title: 'Histórico da fila',
      description: 'Tentativas e reprocessos',
      routerLink: '/app/fila',
      icon: History,
    },
  ];

  readonly saudacao = computed(() => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  });

  readonly primeiroNome = () => (this.authService.nomeUsuario() ?? '').split(' ')[0];

  valorMetrica(status: StatusNotificacao): string {
    const dados = this.contadores();
    const total =
      status === 'ENVIADA'
        ? dados.ENVIADA + dados.ENTREGUE + dados.LIDA
        : dados[status] ?? 0;

    return formatNumberPtBr(total);
  }

  ngOnInit(): void {
    this.carregarStatus();
    this.carregarMetricas();
    this.iniciarAoVivo();
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.pollSub?.unsubscribe();
  }

  private iniciarAoVivo(): void {
    const idOrganizacao = this.authService.idOrganizacaoAtual();
    if (!idOrganizacao) return;

    this.wsSub?.unsubscribe();
    this.wsSub = this.filaEventsService.conectar(idOrganizacao).subscribe({
      next: (evento) => {
        this.aoVivo.set(true);
        if (evento.resumo) {
          this.aplicarResumo(evento.resumo);
        } else {
          this.carregarMetricasSilencioso();
        }
      },
      error: () => this.aoVivo.set(false),
      complete: () => this.aoVivo.set(false),
    });

    this.pollSub?.unsubscribe();
    this.pollSub = timer(8000, 8000).subscribe(() => {
      if (this.temFilaAtiva()) {
        this.carregarMetricasSilencioso();
      }
    });
  }

  private temFilaAtiva(): boolean {
    const resumo = this.resumoFila();
    if (!resumo) return true;
    return resumo.pendente > 0 || resumo.processando > 0;
  }

  private carregarStatus(): void {
    this.carregandoStatus.set(true);
    this.whatsappService
      .status()
      .pipe(finalize(() => this.carregandoStatus.set(false)))
      .subscribe({
        next: (status) => this.whatsappStatus.set(status),
        error: () => this.whatsappStatus.set(null),
      });
  }

  private carregarMetricas(): void {
    this.carregandoMetricas.set(true);
    this.notificacaoService
      .resumoFila()
      .pipe(finalize(() => this.carregandoMetricas.set(false)))
      .subscribe({
        next: (resumo) => this.aplicarResumo(resumo),
        error: () => this.contadores.set({
          PENDENTE: 0,
          PROCESSANDO: 0,
          ENVIADA: 0,
          ENTREGUE: 0,
          LIDA: 0,
          FALHOU: 0,
          BLOQUEADA: 0,
          CANCELADA: 0,
        }),
      });
  }

  private carregarMetricasSilencioso(): void {
    this.notificacaoService.resumoFila().subscribe({
      next: (resumo) => this.aplicarResumo(resumo),
    });
  }

  private aplicarResumo(resumo: FilaResumoResponseDTO): void {
    this.resumoFila.set(resumo);
    this.contadores.set({
      PENDENTE: resumo.pendente,
      PROCESSANDO: resumo.processando,
      ENVIADA: resumo.enviada,
      ENTREGUE: 0,
      LIDA: 0,
      FALHOU: resumo.falhou,
      BLOQUEADA: resumo.bloqueada,
      CANCELADA: 0,
    });
  }
}
