import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  Bold,
  Check,
  Copy,
  ExternalLink,
  Italic,
  LoaderCircle,
  LucideAngularModule,
  RefreshCw,
  Share2,
  Smile,
  Strikethrough,
} from 'lucide-angular';

import { AuthService } from '../../core/auth/auth.service';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { ToastService } from '../../core/services/toast.service';
import { formatPhone } from '../../shared/helper/phone.utils';
import {
  MENSAGEM_SAUDACAO_WHATSAPP_PADRAO,
  buildWhatsappMeLink,
  chaveMensagemLinkWhatsapp,
} from '../../shared/helper/whatsapp-link.utils';
import { ehWhatsappConectado } from '../whatsapp/whatsapp.helpers';

@Component({
  selector: 'app-whatsapp-link-gerador',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './whatsapp-link-gerador.component.html',
})
export class WhatsappLinkGeradorComponent implements OnInit {
  private readonly whatsappService = inject(WhatsappService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly shareIcon = Share2;
  protected readonly refreshIcon = RefreshCw;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly copyIcon = Copy;
  protected readonly checkIcon = Check;
  protected readonly externalIcon = ExternalLink;
  protected readonly boldIcon = Bold;
  protected readonly italicIcon = Italic;
  protected readonly strikeIcon = Strikethrough;
  protected readonly smileIcon = Smile;

  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly telefoneSessao = signal<string | null>(null);
  readonly sessaoConectada = signal(false);
  readonly mensagem = signal(MENSAGEM_SAUDACAO_WHATSAPP_PADRAO);
  readonly linkCopiado = signal(false);

  readonly linkGerado = computed(() => {
    const telefone = this.telefoneSessao();

    if (!telefone) {
      return '';
    }

    return buildWhatsappMeLink(telefone, this.mensagem());
  });

  readonly formatarTelefone = formatPhone;

  readonly emojisRapidos = ['👋', '🙂', '✅', '📲', '🔔', '💬'];

  ngOnInit(): void {
    this.restaurarMensagemSalva();
    this.carregarNumeroSessao();
  }

  carregarNumeroSessao(): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.whatsappService.status().subscribe({
      next: (status) => {
        this.telefoneSessao.set(status.telefone);
        this.sessaoConectada.set(ehWhatsappConectado(status.status, status.conectado));
        this.carregando.set(false);

        if (!status.telefone) {
          this.erro.set('Nenhum numero vinculado na sessao. Conecte o WhatsApp para gerar o link.');
        }
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(err.error?.message || 'Nao foi possivel carregar o numero da sessao.');
        this.carregando.set(false);
      },
    });
  }

  atualizarMensagem(valor: string): void {
    this.mensagem.set(valor);
    this.persistirMensagem(valor);
    this.linkCopiado.set(false);
  }

  aplicarFormatacao(tipo: 'bold' | 'italic' | 'strike', textarea: HTMLTextAreaElement): void {
    const inicio = textarea.selectionStart;
    const fim = textarea.selectionEnd;
    const texto = this.mensagem();
    const selecionado = texto.slice(inicio, fim) || 'texto';

    const marcadores: Record<typeof tipo, [string, string]> = {
      bold: ['*', '*'],
      italic: ['_', '_'],
      strike: ['~', '~'],
    };

    const [abre, fecha] = marcadores[tipo];
    const novoTrecho = `${abre}${selecionado}${fecha}`;
    const atualizado = texto.slice(0, inicio) + novoTrecho + texto.slice(fim);

    this.atualizarMensagem(atualizado);

    queueMicrotask(() => {
      textarea.focus();
      const cursor = inicio + novoTrecho.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  adicionarEmoji(emoji: string, textarea: HTMLTextAreaElement): void {
    const inicio = textarea.selectionStart;
    const fim = textarea.selectionEnd;
    const texto = this.mensagem();
    const atualizado = texto.slice(0, inicio) + emoji + texto.slice(fim);

    this.atualizarMensagem(atualizado);

    queueMicrotask(() => {
      textarea.focus();
      const cursor = inicio + emoji.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  async copiarLink(): Promise<void> {
    const link = this.linkGerado();

    if (!link) {
      this.toast.error('Conecte o WhatsApp antes de copiar o link.');
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      this.linkCopiado.set(true);
      this.toast.success('Link copiado para a area de transferencia.');
      window.setTimeout(() => this.linkCopiado.set(false), 2000);
    } catch {
      this.toast.error('Nao foi possivel copiar o link.');
    }
  }

  abrirLink(): void {
    const link = this.linkGerado();

    if (!link) {
      return;
    }

    window.open(link, '_blank', 'noopener,noreferrer');
  }

  private restaurarMensagemSalva(): void {
    const idOrganizacao = this.authService.idOrganizacaoAtual();

    if (!idOrganizacao) {
      return;
    }

    const salva = localStorage.getItem(chaveMensagemLinkWhatsapp(idOrganizacao));

    if (salva?.trim()) {
      this.mensagem.set(salva);
    }
  }

  private persistirMensagem(valor: string): void {
    const idOrganizacao = this.authService.idOrganizacaoAtual();

    if (!idOrganizacao) {
      return;
    }

    localStorage.setItem(chaveMensagemLinkWhatsapp(idOrganizacao), valor);
  }
}
