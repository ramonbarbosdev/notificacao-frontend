// src/app/features/dashboard/dashboard.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../core/layout/layout.components';
import { AuthService } from '../../core/auth/auth.service';
import { WhatsappStatusResponse } from '../../shared/types/dtos';
import {
  Ban,
  Clock,
  LoaderCircle,
  MessageCircle,
  Send,
  TriangleAlert,
  ChevronRight,
  LucideAngularModule
} from 'lucide-angular';
import { HeaderComponent } from '../../core/layout/header/header.component';
import { WhatsappService } from '../../core/services/whatsapp.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule,
    RouterModule,
    LucideAngularModule,
    SidebarComponent,
    HeaderComponent],
  templateUrl: './dashboard.component.html',

})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly whatsappService = inject(WhatsappService);

  protected readonly clockIcon = Clock;
  protected readonly processingIcon = LoaderCircle;
  protected readonly whatsappIcon = MessageCircle;
  protected readonly sendIcon = Send;
  protected readonly alertIcon = TriangleAlert;
  protected readonly banIcon = Ban;
  protected readonly chevronRightIcon = ChevronRight;

  readonly whatsappStatus = signal<WhatsappStatusResponse | null>(null);
  readonly carregandoStatus = signal(true);
  readonly metricas = [
    { titulo: 'Pendentes', descricao: 'Aguardando processamento', icon: Clock, tom: 'warning' },
    { titulo: 'Processando', descricao: 'Em execucao pela fila', icon: LoaderCircle, tom: 'info' },
    { titulo: 'Enviadas', descricao: 'Endpoint de metricas pendente', icon: Send, tom: 'success' },
    { titulo: 'Falhas', descricao: 'Endpoint de metricas pendente', icon: TriangleAlert, tom: 'danger' },
    { titulo: 'Bloqueadas', descricao: 'Consentimento ou bloqueio', icon: Ban, tom: 'danger' },
  ];

  readonly primeiroNome = () => {
    const nome = this.authService.nomeUsuario() ?? '';
    return nome.split(' ')[0];
  };

  ngOnInit(): void {
    this.carregarStatus();
  }

  carregarStatus(): void {
    this.carregandoStatus.set(true);
    this.whatsappService.status().subscribe({
      next: (s) => {
        this.whatsappStatus.set(s);
        this.carregandoStatus.set(false);
      },
      error: () => this.carregandoStatus.set(false),
    });
  }
}
