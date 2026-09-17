import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Eye,
  LoaderCircle,
  LucideAngularModule,
  RotateCcw,
  Search,
  X,
} from 'lucide-angular';
import { EMPTY, Subject, Subscription, debounceTime, finalize, switchMap } from 'rxjs';

import { GithubIntegracaoService } from '../../../core/services/github-integracao.service';
import {
  GithubWebhookIntegracaoResponse,
  GithubWebhookTemplatePreviewResponse,
  GithubWebhookTemplateVariavel,
} from '../../../shared/types/dtos';
import { extrairMensagemErroHttp } from '../../../shared/labels/notificacao.labels';

export interface GithubWhatsappTemplateAplicado {
  assunto: string;
  mensagem: string;
}

type CampoTemplate = 'assunto' | 'mensagem';

@Component({
  selector: 'app-github-whatsapp-template-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './github-whatsapp-template-modal.component.html',
})
export class GithubWhatsappTemplateModalComponent implements OnDestroy {
  private readonly githubIntegracaoService = inject(GithubIntegracaoService);

  readonly aberto = input(false);
  readonly assuntoInicial = input('');
  readonly mensagemInicial = input('');
  readonly integracao = input<GithubWebhookIntegracaoResponse | null>(null);
  readonly carregandoIntegracao = input(false);

  readonly fechado = output<void>();
  readonly aplicado = output<GithubWhatsappTemplateAplicado>();
  /** Aplica no formulario e pede save na pagina (configuracoes-organizacao). */
  readonly salvarNoServidor = output<GithubWhatsappTemplateAplicado>();

  protected readonly closeIcon = X;
  protected readonly previewIcon = Eye;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly searchIcon = Search;
  protected readonly resetIcon = RotateCcw;

  readonly assuntoInput = viewChild<ElementRef<HTMLInputElement>>('assuntoInput');
  readonly mensagemInput = viewChild<ElementRef<HTMLTextAreaElement>>('mensagemInput');

  readonly assunto = signal('');
  readonly mensagem = signal('');
  readonly buscaVariavel = signal('');
  readonly campoFoco = signal<CampoTemplate>('mensagem');
  readonly cenarioId = signal('');
  readonly preview = signal<GithubWebhookTemplatePreviewResponse | null>(null);
  readonly previewErro = signal<string | null>(null);
  readonly previewCarregando = signal(false);

  private readonly previewTrigger = new Subject<void>();
  private readonly subscriptions = new Subscription();
  private abertoAnterior = false;

  constructor() {
    effect(() => {
      const aberto = this.aberto();
      if (aberto && !this.abertoAnterior) {
        this.assunto.set(this.assuntoInicial() ?? '');
        this.mensagem.set(this.mensagemInicial() ?? '');
        const cen = this.integracao()?.cenariosPreview?.[0]?.id;
        if (cen) {
          this.cenarioId.set(cen);
        }
        this.preview.set(null);
        this.previewErro.set(null);
        queueMicrotask(() => this.dispararPreview());
      }
      this.abertoAnterior = aberto;
    });

    this.subscriptions.add(
      this.previewTrigger
        .pipe(
          debounceTime(400),
          switchMap(() => {
            if (!this.aberto() || !this.cenarioId() || !this.integracao()) {
              return EMPTY;
            }
            this.previewCarregando.set(true);
            this.previewErro.set(null);
            return this.githubIntegracaoService
              .previewTemplate({
                templateAssunto: this.assunto(),
                templateMensagem: this.mensagem(),
                cenarioId: this.cenarioId(),
              })
              .pipe(finalize(() => this.previewCarregando.set(false)));
          }),
        )
        .subscribe({
          next: (res) => this.preview.set(res),
          error: (err: HttpErrorResponse) => {
            this.previewErro.set(extrairMensagemErroHttp(err, 'Não foi possível gerar o preview.'));
          },
        }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.aberto()) {
      this.fechar();
    }
  }

  variaveisFiltradas(): GithubWebhookTemplateVariavel[] {
    const lista = this.integracao()?.variaveisTemplateDetalhadas ?? [];
    const q = this.buscaVariavel().trim().toLowerCase();
    if (!q) {
      return lista;
    }
    return lista.filter(
      (v) =>
        v.chave.toLowerCase().includes(q) ||
        v.titulo.toLowerCase().includes(q) ||
        v.descricao.toLowerCase().includes(q),
    );
  }

  fechar(): void {
    this.fechado.emit();
  }

  valoresAtuais(): GithubWhatsappTemplateAplicado {
    return {
      assunto: this.assunto(),
      mensagem: this.mensagem(),
    };
  }

  aplicar(): void {
    this.aplicado.emit(this.valoresAtuais());
    this.fechar();
  }

  aplicarESalvarNoServidor(): void {
    this.salvarNoServidor.emit(this.valoresAtuais());
    this.fechar();
  }

  restaurarPadrao(): void {
    const info = this.integracao();
    if (!info) {
      return;
    }
    this.assunto.set(info.templateAssuntoPadrao);
    this.mensagem.set(info.templateMensagemPadrao);
    this.dispararPreview();
  }

  marcarFoco(campo: CampoTemplate): void {
    this.campoFoco.set(campo);
  }

  inserirVariavel(chave: string): void {
    const token = `{{${chave}}}`;
    const campo = this.campoFoco();
    if (campo === 'assunto') {
      const el = this.assuntoInput()?.nativeElement;
      this.assunto.set(this.inserirNoElemento(el, this.assunto(), token));
    } else {
      const el = this.mensagemInput()?.nativeElement;
      this.mensagem.set(this.inserirNoElemento(el, this.mensagem(), token));
    }
    this.dispararPreview();
  }

  private inserirNoElemento(
    el: HTMLInputElement | HTMLTextAreaElement | undefined,
    valorAtual: string,
    token: string,
  ): string {
    if (!el) {
      return valorAtual + token;
    }
    const start = el.selectionStart ?? valorAtual.length;
    const end = el.selectionEnd ?? start;
    const novo = valorAtual.slice(0, start) + token + valorAtual.slice(end);
    queueMicrotask(() => {
      const pos = start + token.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
    return novo;
  }

  onAssuntoInput(valor: string): void {
    this.assunto.set(valor);
    this.dispararPreview();
  }

  onMensagemInput(valor: string): void {
    this.mensagem.set(valor);
    this.dispararPreview();
  }

  onCenarioChange(id: string): void {
    this.cenarioId.set(id);
    this.dispararPreview();
  }

  dispararPreview(): void {
    if (!this.aberto() || !this.integracao() || !this.cenarioId()) {
      return;
    }
    this.previewTrigger.next();
  }

  chavePlaceholder(chave: string): string {
    return `{{${chave}}}`;
  }

  contextoEventoJson(): string {
    const ctx = this.preview()?.contextoEvento;
    if (!ctx) {
      return '';
    }
    const exemplo = {
      evento: ctx['evento'],
      acao: ctx['acao'],
      titulo: ctx['titulo'],
      url: ctx['url'],
      status_anterior: ctx['status_anterior'],
      status_atual: ctx['status_atual'],
      movimentador: ctx['movimentador'],
      responsaveis: ctx['responsaveis'],
      destinatarios: ctx['destinatarios'],
    };
    return JSON.stringify(exemplo, null, 2);
  }
}
