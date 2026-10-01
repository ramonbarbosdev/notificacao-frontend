import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { LoaderCircle, LucideAngularModule } from 'lucide-angular';

import { GithubIntegracaoService } from '../../../core/services/github-integracao.service';
import { ToastService } from '../../../core/services/toast.service';
import { extrairMensagemErroHttp } from '../../../shared/labels/notificacao.labels';

/** Como a org trata notificações após o webhook GitHub (movimentação no kanban). */
export type GithubKanbanDestinoNotificacao = 'nenhum' | 'whatsapp' | 'webhook' | 'ambos';

function destinoFromFlags(webhook: boolean, whatsapp: boolean): GithubKanbanDestinoNotificacao {
  if (webhook && whatsapp) {
    return 'ambos';
  }
  if (webhook) {
    return 'webhook';
  }
  if (whatsapp) {
    return 'whatsapp';
  }
  return 'nenhum';
}

function flagsFromDestino(destino: GithubKanbanDestinoNotificacao): {
  kanbanMovimentacaoWebhookHabilitado: boolean;
  githubWhatsappDiretoHabilitado: boolean;
} {
  switch (destino) {
    case 'ambos':
      return { kanbanMovimentacaoWebhookHabilitado: true, githubWhatsappDiretoHabilitado: true };
    case 'webhook':
      return { kanbanMovimentacaoWebhookHabilitado: true, githubWhatsappDiretoHabilitado: false };
    case 'whatsapp':
      return { kanbanMovimentacaoWebhookHabilitado: false, githubWhatsappDiretoHabilitado: true };
    case 'nenhum':
      return { kanbanMovimentacaoWebhookHabilitado: false, githubWhatsappDiretoHabilitado: false };
  }
}

@Component({
  selector: 'app-github-kanban-movimentacao-webhook-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  template: `
    <section
      class="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 space-y-4"
    >
      <div>
        <h2 class="text-lg font-semibold text-[var(--color-text)]">
          Destino das notificações (movimentação no kanban)
        </h2>
        <p class="text-sm text-[var(--color-text-muted)] mt-1">
          Quando um card mudar de coluna no Project v2, escolha se a API envia WhatsApp aos responsáveis,
          chama um webhook externo (bot/automação), os dois ou nenhum. O WhatsApp direto vale para todo o
          fluxo GitHub desta integração; o webhook externo só dispara na mudança de coluna.
        </p>
      </div>

      @if (carregando()) {
        <p class="text-sm text-[var(--color-text-muted)] flex items-center gap-2">
          <lucide-icon [img]="loaderIcon" class="w-4 h-4 animate-spin" />
          Carregando…
        </p>
      } @else {
        <form [formGroup]="form" class="space-y-4" (ngSubmit)="salvar()">
          <fieldset class="space-y-2 border-0 p-0 m-0">
            <legend class="text-sm font-medium text-[var(--color-text)] mb-2">Modo de envio</legend>
            @for (opcao of opcoesDestino; track opcao.valor) {
              <label class="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  formControlName="destinoNotificacao"
                  [value]="opcao.valor"
                  class="mt-0.5"
                />
                <span>
                  <span class="font-medium text-[var(--color-text)]">{{ opcao.titulo }}</span>
                  <span class="block text-xs text-[var(--color-text-muted)]">{{ opcao.descricao }}</span>
                </span>
              </label>
            }
          </fieldset>

          @if (exibirCamposWebhook()) {
            <div class="space-y-4 pt-2 border-t border-[var(--color-border)]">
              <div>
                <label class="block text-sm font-medium mb-1">URL do webhook (bot)</label>
                <input
                  type="url"
                  class="input-admin w-full"
                  formControlName="kanbanMovimentacaoWebhookUrl"
                  placeholder="https://…"
                  autocomplete="off"
                />
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Header Authorization</label>
                <input
                  type="password"
                  class="input-admin w-full"
                  formControlName="kanbanMovimentacaoWebhookAuthorization"
                  [placeholder]="
                    authConfigurado() ? 'Deixe em branco para manter o valor salvo' : 'Bearer …'
                  "
                  autocomplete="new-password"
                />
                @if (authConfigurado()) {
                  <p class="text-xs text-[var(--color-text-muted)] mt-1">Authorization já configurado.</p>
                }
              </div>
            </div>
          }

          <div class="flex flex-wrap gap-2 justify-end">
            @if (exibirCamposWebhook()) {
              <button
                type="button"
                class="btn-secondary-admin"
                [disabled]="testando() || salvando()"
                (click)="testar()"
              >
                @if (testando()) {
                  <lucide-icon [img]="loaderIcon" class="w-4 h-4 animate-spin inline" />
                }
                Enviar evento de teste
              </button>
            }
            <button type="submit" class="btn-primary-admin" [disabled]="salvando() || form.pristine">
              @if (salvando()) {
                <lucide-icon [img]="loaderIcon" class="w-4 h-4 animate-spin inline" />
              }
              Salvar
            </button>
          </div>
        </form>
      }
    </section>
  `,
})
export class GithubKanbanMovimentacaoWebhookCardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly github = inject(GithubIntegracaoService);
  private readonly toast = inject(ToastService);

  protected readonly loaderIcon = LoaderCircle;

  readonly carregando = signal(true);
  readonly salvando = signal(false);
  readonly testando = signal(false);
  readonly authConfigurado = signal(false);

  readonly opcoesDestino: {
    valor: GithubKanbanDestinoNotificacao;
    titulo: string;
    descricao: string;
  }[] = [
    {
      valor: 'whatsapp',
      titulo: 'Somente WhatsApp',
      descricao: 'Mensagens pela fila da API (templates e regras do módulo Project v2).',
    },
    {
      valor: 'webhook',
      titulo: 'Somente webhook externo (bot)',
      descricao: 'POST JSON na URL configurada; não enfileira WhatsApp.',
    },
    {
      valor: 'ambos',
      titulo: 'WhatsApp e webhook',
      descricao: 'Os dois canais na mesma movimentação (quando as regras permitirem).',
    },
    {
      valor: 'nenhum',
      titulo: 'Nenhum',
      descricao: 'Não envia WhatsApp nem chama o webhook externo.',
    },
  ];

  readonly form = this.fb.group({
    destinoNotificacao: ['whatsapp' as GithubKanbanDestinoNotificacao],
    kanbanMovimentacaoWebhookUrl: [''],
    kanbanMovimentacaoWebhookAuthorization: [''],
  });

  private readonly destinoAtual = toSignal(
    this.form.controls.destinoNotificacao.valueChanges.pipe(
      startWith(this.form.controls.destinoNotificacao.value),
    ),
    { initialValue: 'whatsapp' as GithubKanbanDestinoNotificacao },
  );

  readonly exibirCamposWebhook = computed(
    () => this.destinoAtual() === 'webhook' || this.destinoAtual() === 'ambos',
  );

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.github.obterKanbanMovimentacaoWebhook().subscribe({
      next: (cfg) => {
        this.authConfigurado.set(cfg.kanbanMovimentacaoWebhookAuthorizationConfigurado);
        this.form.patchValue({
          destinoNotificacao: destinoFromFlags(
            cfg.kanbanMovimentacaoWebhookHabilitado,
            cfg.githubWhatsappDiretoHabilitado,
          ),
          kanbanMovimentacaoWebhookUrl: cfg.kanbanMovimentacaoWebhookUrl ?? '',
          kanbanMovimentacaoWebhookAuthorization: '',
        });
        this.form.markAsPristine();
        this.carregando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.toast.error(
          'Notificações kanban',
          extrairMensagemErroHttp(err, 'Não foi possível carregar a configuração.'),
        );
        this.carregando.set(false);
      },
    });
  }

  salvar(): void {
    const v = this.form.getRawValue();
    const destino = (v.destinoNotificacao ?? 'whatsapp') as GithubKanbanDestinoNotificacao;
    const flags = flagsFromDestino(destino);
    const authDirty = this.form.controls.kanbanMovimentacaoWebhookAuthorization.dirty;
    const body: Record<string, unknown> = {
      kanbanMovimentacaoWebhookHabilitado: flags.kanbanMovimentacaoWebhookHabilitado,
      githubWhatsappDiretoHabilitado: flags.githubWhatsappDiretoHabilitado,
      kanbanMovimentacaoWebhookUrl: (v.kanbanMovimentacaoWebhookUrl ?? '').trim() || null,
    };
    if (authDirty && (v.kanbanMovimentacaoWebhookAuthorization ?? '').trim()) {
      body['kanbanMovimentacaoWebhookAuthorization'] = v.kanbanMovimentacaoWebhookAuthorization!.trim();
    }

    this.salvando.set(true);
    this.github.patchKanbanMovimentacaoWebhook(body).subscribe({
      next: (cfg) => {
        this.authConfigurado.set(cfg.kanbanMovimentacaoWebhookAuthorizationConfigurado);
        this.form.patchValue({
          destinoNotificacao: destinoFromFlags(
            cfg.kanbanMovimentacaoWebhookHabilitado,
            cfg.githubWhatsappDiretoHabilitado,
          ),
        });
        this.form.controls.kanbanMovimentacaoWebhookAuthorization.reset('');
        this.form.markAsPristine();
        this.salvando.set(false);
        this.toast.success('Notificações kanban', 'Configuração salva.');
      },
      error: (err: HttpErrorResponse) => {
        this.salvando.set(false);
        this.toast.error('Notificações kanban', extrairMensagemErroHttp(err, 'Falha ao salvar.'));
      },
    });
  }

  testar(): void {
    this.testando.set(true);
    this.github.testarKanbanMovimentacaoWebhook().subscribe({
      next: () => {
        this.testando.set(false);
        this.toast.success('Notificações kanban', 'Evento de teste enviado.');
      },
      error: (err: HttpErrorResponse) => {
        this.testando.set(false);
        this.toast.error('Notificações kanban', extrairMensagemErroHttp(err, 'Falha no teste.'));
      },
    });
  }
}
