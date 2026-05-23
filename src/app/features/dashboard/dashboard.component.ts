
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { finalize } from 'rxjs';

import {
  Ban,
  ChevronRight,
  Clock,
  History,
  LoaderCircle,
  LucideIconData,
  LucideAngularModule,
  MessageCircle,
  MessageSquareText,
  Send,
  Settings,
  TriangleAlert,
  UserCheck,
} from 'lucide-angular';

import { SidebarComponent } from '../../core/layout/layout.components';
import { HeaderComponent } from '../../core/layout/header/header.component';

import { AuthService } from '../../core/auth/auth.service';
import { WhatsappService } from '../../core/services/whatsapp.service';

import { WhatsappStatusResponse } from '../../shared/types/dtos';

import { WhatsappStatusCardComponent } from '../../shared/components/whatsapp-status-card/whatsapp-status-card.component';
import { MetricCardComponent, MetricTone } from '../../shared/components/metric-card/metric-card.component';
import { DashboardAlertComponent } from '../../shared/components/dashboard-alert/dashboard-alert.component';
import {
  QuickActionCardComponent,
  QuickActionTone,
} from '../../shared/components/quick-action-card/quick-action-card.component';

interface DashboardMetric {
  title: string;
  description: string;
  icon: LucideIconData;
  tone: MetricTone;
  value?: string | number;
  label?: string;
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

    SidebarComponent,
    HeaderComponent,

    WhatsappStatusCardComponent,
    MetricCardComponent,
    DashboardAlertComponent,
    QuickActionCardComponent,
  ],

  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly whatsappService = inject(WhatsappService);

  // ICONS

  protected readonly icons = {
    whatsapp: MessageCircle,
    send: Send,
    alert: TriangleAlert,
    ban: Ban,
    clock: Clock,
    loading: LoaderCircle,
    chevron: ChevronRight,
    templates: MessageSquareText,
    contacts: UserCheck,
    history: History,
    settings: Settings,
  };

  protected readonly whatsappIcon = this.icons.whatsapp;
  protected readonly chevronRightIcon = this.icons.chevron;

  // STATE

  readonly whatsappStatus =
    signal<WhatsappStatusResponse | null>(null);

  readonly carregandoStatus =
    signal(true);

  readonly metricas: DashboardMetric[] = [
    {
      title: 'Pendentes',
      description: 'Aguardando processamento',
      icon: Clock,
      tone: 'warning',
    },

    {
      title: 'Processando',
      description: 'Em execucao pela fila',
      icon: LoaderCircle,
      tone: 'info',
    },

    {
      title: 'Enviadas',
      description: 'Endpoint de metricas pendente',
      icon: Send,
      tone: 'success',
    },

    {
      title: 'Falhas',
      description: 'Endpoint de metricas pendente',
      icon: TriangleAlert,
      tone: 'danger',
    },

    {
      title: 'Bloqueadas',
      description: 'Consentimento ou bloqueio',
      icon: Ban,
      tone: 'danger',
    },
  ];

  readonly quickActions: QuickAction[] = [
    {
      title: 'Enviar notificacao',
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
      title: 'Historico da fila',
      description: 'Tentativas e reprocessos',
      routerLink: '/app/fila',
      icon: History,
    },
  ];

  readonly primeiroNome = () => {
    const nome =
      this.authService.nomeUsuario() ?? '';

    return nome.split(' ')[0];
  };

  ngOnInit(): void {
    this.carregarStatus();
  }

  private carregarStatus(): void {

    this.carregandoStatus.set(true);

    this.whatsappService
      .status()
      .pipe(
        finalize(() => {
          this.carregandoStatus.set(false);
        })
      )
      .subscribe({

        next: (status) => {
          this.whatsappStatus.set(status);
        },

        error: () => {
          this.whatsappStatus.set(null);
        },

      });

  }

}
