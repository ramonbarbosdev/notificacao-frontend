import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import {
  Ban,
  Bot,
  Check,
  Layers,
  LoaderCircle,
  LucideAngularModule,
  MessageCircle,
} from 'lucide-angular';

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
  styles: [
    `
      :host {
        display: block;
      }

      .destino-grid {
        display: grid;
        gap: 0.5rem;
      }

      @media (min-width: 640px) {
        .destino-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      .destino-opcao {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.75rem 0.875rem;
        border-radius: 10px;
        border: 1px solid var(--color-border-soft);
        background: var(--color-surface-muted);
        cursor: pointer;
        transition:
          border-color 150ms ease,
          background 150ms ease,
          box-shadow 150ms ease;
      }

      .destino-opcao:hover {
        border-color: var(--color-border);
      }

      .destino-opcao--ativo {
        border-color: color-mix(in srgb, var(--color-primary) 55%, var(--color-border));
        background: var(--color-success-bg);
        box-shadow: inset 0 0 0 1px var(--color-success-border);
      }

      .destino-opcao__radio {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      .destino-opcao__icon {
        flex-shrink: 0;
        width: 2rem;
        height: 2rem;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-surface);
        border: 1px solid var(--color-border-soft);
        color: var(--color-text-muted);
      }

      .destino-opcao--ativo .destino-opcao__icon {
        color: var(--color-primary);
        border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border-soft));
      }

      .destino-opcao__titulo {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text);
        line-height: 1.3;
      }

      .destino-opcao__desc {
        display: block;
        font-size: 11.5px;
        color: var(--color-text-faint);
        line-height: 1.45;
        margin-top: 0.2rem;
      }

      .webhook-panel {
        border-radius: 10px;
        border: 1px solid var(--color-border-soft);
        background: var(--color-surface-muted);
        padding: 1rem;
      }

      .auth-ok {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 11px;
        color: var(--color-primary);
        margin-top: 0.375rem;
      }
    `,
  ],
  template: `
    <div class="ui-card">
      <div class="ui-card-head">
        <span class="ui-eyebrow">Project v2</span>
        <h2 class="ui-card-title">Destino ao mover card no kanban</h2>
        <p class="ui-hint m-0 mt-2 max-w-2xl">
          Define o que a API faz quando a coluna do card mudar. O WhatsApp segue as regras deste módulo;
          o bot recebe um POST JSON só nessa movimentação.
        </p>
      </div>

      @if (carregando()) {
        <div class="ui-card-body flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <lucide-icon [img]="loaderIcon" class="w-4 h-4 animate-spin" />
          Carregando…
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="salvar()">
          <div class="ui-card-body space-y-4">
            <div>
              <span class="ui-field-label">Modo de envio</span>
              <div class="destino-grid" role="radiogroup" aria-label="Modo de envio">
                @for (opcao of opcoesDestino; track opcao.valor) {
                  <label
                    class="destino-opcao"
                    [class.destino-opcao--ativo]="destinoAtual() === opcao.valor"
                  >
                    <input
                      type="radio"
                      class="destino-opcao__radio"
                      formControlName="destinoNotificacao"
                      [value]="opcao.valor"
                    />
                    <span class="destino-opcao__icon" aria-hidden="true">
                      <lucide-icon [img]="opcao.icon" class="w-4 h-4" />
                    </span>
                    <span>
                      <span class="destino-opcao__titulo">{{ opcao.titulo }}</span>
                      <span class="destino-opcao__desc">{{ opcao.descricao }}</span>
                    </span>
                  </label>
                }
              </div>
            </div>

            @if (exibirCamposWebhook()) {
              <div class="webhook-panel space-y-3">
                <div>
                  <span class="ui-eyebrow">Bot externo</span>
                  <p class="text-xs text-[var(--color-text-muted)] m-0 mt-0.5">
                    URL e credencial usados no POST assíncrono (Authorization criptografado no servidor).
                  </p>
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label class="ui-field-label" for="kanban-webhook-modo">Envio ao bot</label>
                    <select
                      id="kanban-webhook-modo"
                      class="form-input-admin w-full text-sm"
                      formControlName="kanbanMovimentacaoWebhookModoEnvio"
                    >
                      <option value="LOTE">Lote (economiza chamadas)</option>
                      <option value="IMEDIATO">Imediato (1 POST por movimentação)</option>
                    </select>
                  </div>
                  @if (form.controls.kanbanMovimentacaoWebhookModoEnvio.value === 'LOTE') {
                    <div>
                      <label class="ui-field-label" for="kanban-webhook-intervalo">Intervalo do lote (min)</label>
                      <input
                        id="kanban-webhook-intervalo"
                        type="number"
                        min="5"
                        max="1440"
                        class="form-input-admin w-full"
                        formControlName="kanbanMovimentacaoWebhookIntervaloMinutos"
                      />
                      <p class="ui-hint m-0 mt-1">Padrão 30 — só envia se houver movimentações novas.</p>
                    </div>
                  }
                </div>
                <div>
                  <label class="ui-field-label" for="kanban-webhook-url">URL do webhook</label>
                  <input
                    id="kanban-webhook-url"
                    type="url"
                    class="form-input-admin w-full font-mono text-xs"
                    formControlName="kanbanMovimentacaoWebhookUrl"
                    placeholder="https://…"
                    autocomplete="off"
                  />
                </div>
                <div>
                  <label class="ui-field-label" for="kanban-webhook-auth">Header Authorization</label>
                  <input
                    id="kanban-webhook-auth"
                    type="password"
                    class="form-input-admin w-full font-mono text-xs"
                    formControlName="kanbanMovimentacaoWebhookAuthorization"
                    [placeholder]="
                      authConfigurado() ? 'Deixe em branco para manter o valor salvo' : 'Bearer …'
                    "
                    autocomplete="new-password"
                  />
                  @if (authConfigurado()) {
                    <span class="auth-ok">
                      <lucide-icon [img]="checkIcon" class="w-3.5 h-3.5" />
                      Credencial já salva
                    </span>
                  }
                </div>
              </div>
            }
          </div>

          <div class="ui-card-footer flex-wrap gap-3">
            <span class="text-[11px] leading-snug max-w-md">
              Salvar aqui não altera kanban/regras abaixo — só este destino de notificação.
            </span>
            <div class="flex flex-wrap gap-2 shrink-0">
              @if (exibirCamposWebhook()) {
                <button
                  type="button"
                  class="ui-btn ui-btn-ghost !flex-none !min-w-0 !py-2 !px-3 text-xs"
                  [disabled]="testando() || salvando()"
                  (click)="testar()"
                >
                  @if (testando()) {
                    <lucide-icon [img]="loaderIcon" class="w-3.5 h-3.5 animate-spin" />
                  }
                  Testar webhook
                </button>
              }
              <button
                type="submit"
                class="ui-btn ui-btn-primary !flex-none !min-w-0 !py-2 !px-4 text-xs"
                [disabled]="salvando() || form.pristine"
              >
                @if (salvando()) {
                  <lucide-icon [img]="loaderIcon" class="w-3.5 h-3.5 animate-spin" />
                }
                Salvar destino
              </button>
            </div>
          </div>
        </form>
      }
    </div>
  `,
})
export class GithubKanbanMovimentacaoWebhookCardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly github = inject(GithubIntegracaoService);
  private readonly toast = inject(ToastService);

  protected readonly loaderIcon = LoaderCircle;
  protected readonly checkIcon = Check;

  readonly carregando = signal(true);
  readonly salvando = signal(false);
  readonly testando = signal(false);
  readonly authConfigurado = signal(false);

  readonly opcoesDestino: {
    valor: GithubKanbanDestinoNotificacao;
    titulo: string;
    descricao: string;
    icon: typeof MessageCircle;
  }[] = [
    {
      valor: 'whatsapp',
      titulo: 'Somente WhatsApp',
      descricao: 'Fila da API com templates e regras do módulo.',
      icon: MessageCircle,
    },
    {
      valor: 'webhook',
      titulo: 'Somente bot',
      descricao: 'POST na URL do bot; sem mensagem WhatsApp.',
      icon: Bot,
    },
    {
      valor: 'ambos',
      titulo: 'WhatsApp e bot',
      descricao: 'Os dois canais na mesma mudança de coluna.',
      icon: Layers,
    },
    {
      valor: 'nenhum',
      titulo: 'Nenhum',
      descricao: 'Não envia WhatsApp nem chama o bot.',
      icon: Ban,
    },
  ];

  readonly form = this.fb.group({
    destinoNotificacao: ['whatsapp' as GithubKanbanDestinoNotificacao],
    kanbanMovimentacaoWebhookUrl: [''],
    kanbanMovimentacaoWebhookAuthorization: [''],
    kanbanMovimentacaoWebhookModoEnvio: ['LOTE' as 'IMEDIATO' | 'LOTE'],
    kanbanMovimentacaoWebhookIntervaloMinutos: [30],
  });

  readonly destinoAtual = toSignal(
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
          kanbanMovimentacaoWebhookModoEnvio: cfg.kanbanMovimentacaoWebhookModoEnvio ?? 'LOTE',
          kanbanMovimentacaoWebhookIntervaloMinutos: cfg.kanbanMovimentacaoWebhookIntervaloMinutos ?? 30,
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
      kanbanMovimentacaoWebhookModoEnvio: v.kanbanMovimentacaoWebhookModoEnvio ?? 'LOTE',
      kanbanMovimentacaoWebhookIntervaloMinutos: v.kanbanMovimentacaoWebhookIntervaloMinutos ?? 30,
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
