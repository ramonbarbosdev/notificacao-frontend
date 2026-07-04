
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
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
import { WhatsappService } from '../../core/services/whatsapp.service';
import { FilaNotificacaoResponseDTO, StatusNotificacao, WhatsappStatusResponse } from '../../shared/types/dtos';
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
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly whatsappService = inject(WhatsappService);
  private readonly notificacaoService = inject(NotificacaoService);

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
      title: 'Enviar notificação',
      description: 'Criar envio manual',
      routerLink: '/app/notificacoes',
      icon: Send,
      tone: 'success',
    },
    {
      title: 'Templates',
      description: 'Gerenciar modelos',
      routerLink: '/app/templates',
      icon: MessageSquareText,
    },
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
      .listar({ page: 0, size: 500 })
      .pipe(finalize(() => this.carregandoMetricas.set(false)))
      .subscribe({
        next: (page) => {
          const totais = {
            PENDENTE: 0,
            PROCESSANDO: 0,
            ENVIADA: 0,
            ENTREGUE: 0,
            LIDA: 0,
            FALHOU: 0,
            BLOQUEADA: 0,
            CANCELADA: 0,
          } satisfies Record<StatusNotificacao, number>;

          for (const item of page.data as FilaNotificacaoResponseDTO[]) {
            totais[item.status] = (totais[item.status] ?? 0) + 1;
          }
          this.contadores.set(totais);
        },
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
}
