import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Clock, Inbox, LoaderCircle, LucideAngularModule, RefreshCw } from 'lucide-angular';

import { HeaderComponent } from '../../core/layout/header/header.component';
import { SidebarComponent } from '../../core/layout/layout.components';
import { FilaNotificacaoItemDTO, StatusNotificacao } from '../../shared/types/dtos';
import { NotificacaoService } from '../../core/services/whatsapp.service';

interface ColunaFila {
  titulo: string;
}

@Component({
  selector: 'app-historico-fila',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, SidebarComponent, HeaderComponent],
  templateUrl: './historico-fila.component.html',
})
export class HistoricoFilaComponent implements OnInit {
  private readonly notificacaoService = inject(NotificacaoService);

  protected readonly inboxIcon = Inbox;
  protected readonly clockIcon = Clock;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly refreshIcon = RefreshCw;

  readonly itens = signal<FilaNotificacaoItemDTO[]>([]);
  readonly carregando = signal(false);
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

  readonly colunas: ColunaFila[] = [
    { titulo: 'ID' },
    { titulo: 'Canal' },
    { titulo: 'Destinatario' },
    { titulo: 'Status' },
    { titulo: 'Provider' },
    { titulo: 'Tentativas' },
    { titulo: 'Proxima tentativa' },
    { titulo: 'Erro' },
    { titulo: 'Criado em' },
  ];

  ngOnInit(): void {
    this.carregarFila();
  }

  carregarFila(): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.notificacaoService.listarFila().subscribe({
      next: (res) => {
        this.itens.set(res.itens);
        this.carregando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(err.error?.mensagem ?? err.error?.erro ?? 'Erro ao carregar a fila.');
        this.carregando.set(false);
      },
    });
  }

  labelStatus(status: StatusNotificacao): string {
    return this.statusLabels[status];
  }

  ehStatusAlerta(status: StatusNotificacao): boolean {
    return status === 'PENDENTE' || status === 'PROCESSANDO';
  }

  ehStatusSucesso(status: StatusNotificacao): boolean {
    return ['ENVIADA', 'ENTREGUE', 'LIDA'].includes(status);
  }
}
