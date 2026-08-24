import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Check, LoaderCircle, LucideAngularModule, MessageSquare, RefreshCw, Trash2 } from 'lucide-angular';
import { Subscription } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { WhatsappEventsService } from '../../core/http/whatsapp-events.service';
import { CommandDialogService } from '../../core/services/command-dialog.service';
import { WhatsappConversasService } from '../../core/services/whatsapp-conversas.service';
import { formatDateTimePtBr } from '../../shared/helper/date.utils';
import { formatPhone } from '../../shared/helper/phone.utils';
import { WhatsappConversaResponse, WhatsappConversaStatus } from '../../shared/types/dtos';

@Component({
  selector: 'app-whatsapp-conversas',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './whatsapp-conversas.component.html',
})
export class WhatsappConversasComponent implements OnInit, OnDestroy {
  private readonly conversasService = inject(WhatsappConversasService);
  private readonly commandDialog = inject(CommandDialogService);
  private readonly whatsappEventsService = inject(WhatsappEventsService);
  private readonly authService = inject(AuthService);

  private eventosSubscription: Subscription | null = null;

  protected readonly refreshIcon = RefreshCw;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly checkIcon = Check;
  protected readonly messageIcon = MessageSquare;
  protected readonly trashIcon = Trash2;

  readonly conversas = signal<WhatsappConversaResponse[]>([]);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly acaoTelefone = signal<string | null>(null);
  readonly mensagemSucesso = signal<string | null>(null);

  readonly totalPendentes = computed(
    () => this.conversas().filter((item) => item.status === 'PENDENTE' && item.exigirConsentimento).length,
  );

  readonly exigirConsentimento = computed(
    () => this.conversas()[0]?.exigirConsentimento ?? true,
  );

  readonly formatarTelefone = formatPhone;
  readonly formatarData = formatDateTimePtBr;

  ngOnInit(): void {
    this.carregar();
    this.conectarEventos();
  }

  ngOnDestroy(): void {
    this.eventosSubscription?.unsubscribe();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.conversasService.listar().subscribe({
      next: (lista) => {
        this.conversas.set(lista);
        this.carregando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(err.error?.message || 'Nao foi possivel carregar as conversas.');
        this.carregando.set(false);
      },
    });
  }

  liberar(conversa: WhatsappConversaResponse): void {
    if (conversa.status === 'LIBERADO' || conversa.status === 'BLOQUEADO') {
      return;
    }

    this.acaoTelefone.set(conversa.telefone);
    this.mensagemSucesso.set(null);

    this.conversasService.liberar(conversa.telefone).subscribe({
      next: (atualizada) => {
        this.atualizarConversaNaLista(atualizada);
        this.mensagemSucesso.set(`Contato ${atualizada.nmContato} liberado para notificacoes.`);
        this.acaoTelefone.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(err.error?.message || 'Nao foi possivel liberar o contato.');
        this.acaoTelefone.set(null);
      },
    });
  }

  async excluir(conversa: WhatsappConversaResponse): Promise<void> {
    const confirmado = await this.commandDialog.confirm({
      title: 'Remover conversa',
      message:
        `Remover a conversa de ${conversa.nmContato} da caixa de entrada?\n\n`
        + 'O contato e o historico de mensagens nao serao apagados.',
      confirmLabel: 'Remover',
      variant: 'danger',
    });

    if (!confirmado) {
      return;
    }

    this.acaoTelefone.set(conversa.telefone);
    this.mensagemSucesso.set(null);
    this.erro.set(null);

    this.conversasService.excluir(conversa.telefone).subscribe({
      next: () => {
        this.removerConversaDaLista(conversa);
        this.mensagemSucesso.set(`Conversa de ${conversa.nmContato} removida.`);
        this.acaoTelefone.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(err.error?.message || 'Nao foi possivel remover a conversa.');
        this.acaoTelefone.set(null);
      },
    });
  }

  labelStatus(status: WhatsappConversaStatus): string {
    if (!this.exigirConsentimento() && status === 'LIBERADO') {
      return 'Recebida';
    }

    switch (status) {
      case 'LIBERADO':
        return 'Liberado';
      case 'BLOQUEADO':
        return 'Bloqueado';
      default:
        return 'Pendente';
    }
  }

  classeStatus(status: WhatsappConversaStatus): string {
    switch (status) {
      case 'LIBERADO':
        return 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]';
      case 'BLOQUEADO':
        return 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger-border)]';
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
  }

  previewMensagem(conversa: WhatsappConversaResponse): string {
    if (conversa.ultimaMensagem?.trim()) {
      return conversa.ultimaMensagem;
    }

    if (conversa.tipoUltimaMensagem && conversa.tipoUltimaMensagem !== 'texto') {
      return `[${conversa.tipoUltimaMensagem}]`;
    }

    return 'Mensagem recebida';
  }

  private conectarEventos(): void {
    const idOrganizacao = this.authService.idOrganizacaoAtual();
    if (!idOrganizacao) {
      return;
    }

    this.eventosSubscription = this.whatsappEventsService.conectar(idOrganizacao).subscribe({
      next: (evento) => {
        if (evento.tipo === 'CONVERSA_EXCLUIDA' && evento.conversa) {
          this.removerConversaDaLista(evento.conversa);
          return;
        }

        if (
          (evento.tipo === 'MENSAGEM_RECEBIDA' || evento.tipo === 'CONVERSA_ATUALIZADA')
          && evento.conversa
        ) {
          this.atualizarConversaNaLista(evento.conversa);
        }
      },
    });
  }

  private atualizarConversaNaLista(atualizada: WhatsappConversaResponse): void {
    const lista = [...this.conversas()];
    const indice = lista.findIndex((item) => item.telefone === atualizada.telefone);

    if (indice >= 0) {
      lista[indice] = atualizada;
    } else {
      lista.unshift(atualizada);
    }

    lista.sort(
      (a, b) =>
        new Date(b.dtUltimaMensagem).getTime() - new Date(a.dtUltimaMensagem).getTime(),
    );

    this.conversas.set(lista);
  }

  private removerConversaDaLista(conversa: WhatsappConversaResponse): void {
    this.conversas.set(
      this.conversas().filter(
        (item) =>
          item.idConversa !== conversa.idConversa
          && item.telefone !== conversa.telefone,
      ),
    );
  }
}
