import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { LoaderCircle, LucideAngularModule, RefreshCw } from 'lucide-angular';

import { GithubIntegracaoService } from '../../../../core/services/github-integracao.service';
import { formatDateTimePtBr } from '../../../../shared/helper/date.utils';
import { GithubWebhookDecisao, GithubWebhookDecisaoListaResponse } from '../../../../shared/types/dtos';

@Component({
  selector: 'app-github-webhook-decisoes-panel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './github-webhook-decisoes-panel.component.html',
})
export class GithubWebhookDecisoesPanelComponent implements OnInit {
  private readonly githubIntegracaoService = inject(GithubIntegracaoService);

  protected readonly loaderIcon = LoaderCircle;
  protected readonly refreshIcon = RefreshCw;
  readonly formatarData = formatDateTimePtBr;

  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly lista = signal<GithubWebhookDecisaoListaResponse | null>(null);
  readonly itemExpandidoId = signal<number | null>(null);

  readonly pagina = signal(0);
  readonly tamanho = 20;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.githubIntegracaoService.listarWebhookDecisoes(this.pagina(), this.tamanho).subscribe({
      next: (resposta) => {
        this.lista.set(resposta);
        this.carregando.set(false);
      },
      error: () => {
        this.lista.set(null);
        this.erro.set('Não foi possível carregar o histórico de eventos.');
        this.carregando.set(false);
      },
    });
  }

  paginaAnterior(): void {
    const atual = this.pagina();
    if (atual <= 0) {
      return;
    }
    this.pagina.set(atual - 1);
    this.carregar();
  }

  paginaProxima(): void {
    const meta = this.lista();
    if (!meta || this.pagina() >= meta.totalPaginas - 1) {
      return;
    }
    this.pagina.set(this.pagina() + 1);
    this.carregar();
  }

  alternarDetalhe(item: GithubWebhookDecisao): void {
    this.itemExpandidoId.set(this.itemExpandidoId() === item.id ? null : item.id);
  }

  labelResultado(resultado: string): string {
    switch (resultado) {
      case 'ENVIADO':
        return 'Enviado';
      case 'IGNORADO_GATILHO':
        return 'Ignorado (gatilho)';
      case 'IGNORADO_STATUS':
        return 'Ignorado (status)';
      case 'IGNORADO_EVENTO':
        return 'Ignorado (evento)';
      case 'IGNORADO_SEM_OPTIN':
        return 'Sem opt-in';
      case 'FILA_SEM_DESTINATARIO':
        return 'Fila bloqueada';
      case 'PING':
        return 'Ping';
      default:
        return resultado;
    }
  }

  classeResultado(resultado: string): string {
    if (resultado === 'ENVIADO') {
      return 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]';
    }
    if (resultado === 'FILA_SEM_DESTINATARIO') {
      return 'bg-[var(--color-surface-muted)] text-[var(--color-text)] border-[var(--color-border)]';
    }
    if (resultado.startsWith('IGNORADO')) {
      return 'app-alert-warning border text-[var(--color-text)]';
    }
    return 'border border-[var(--color-border)] text-[var(--color-text-muted)]';
  }

  labelFluxo(fluxo: string | null | undefined): string {
    switch (fluxo) {
      case 'PR_AVALIADORES':
        return 'PR avaliadores';
      case 'ISSUE_AVALIADORES':
        return 'Issue avaliadores';
      case 'GERAL':
        return 'Fluxo geral';
      default:
        return '—';
    }
  }

  tipoCard(item: GithubWebhookDecisao): string {
    if (item.pullRequest) {
      return 'PR';
    }
    if (item.issueProjectV2) {
      return 'Issue';
    }
    return 'Card';
  }

  detalheJson(item: GithubWebhookDecisao): string {
    if (!item.detalhe || Object.keys(item.detalhe).length === 0) {
      return '';
    }
    try {
      return JSON.stringify(item.detalhe, null, 2);
    } catch {
      return '';
    }
  }
}
