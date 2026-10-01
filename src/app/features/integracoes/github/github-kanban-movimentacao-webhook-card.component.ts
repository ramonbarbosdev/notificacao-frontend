import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LoaderCircle, LucideAngularModule } from 'lucide-angular';

import { GithubIntegracaoService } from '../../../core/services/github-integracao.service';
import { ToastService } from '../../../core/services/toast.service';
import { extrairMensagemErroHttp } from '../../../shared/labels/notificacao.labels';

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
          Webhook externo — movimentação no kanban
        </h2>
        <p class="text-sm text-[var(--color-text-muted)] mt-1">
          Quando um card mudar de coluna no GitHub Project v2, a API pode notificar um sistema externo
          (bot, automação, etc.). O header Authorization é armazenado criptografado.
        </p>
      </div>

      @if (carregando()) {
        <p class="text-sm text-[var(--color-text-muted)] flex items-center gap-2">
          <lucide-icon [img]="loaderIcon" class="w-4 h-4 animate-spin" />
          Carregando…
        </p>
      } @else {
        <form [formGroup]="form" class="space-y-4" (ngSubmit)="salvar()">
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" formControlName="kanbanMovimentacaoWebhookHabilitado" />
            Habilitar webhook de movimentação
          </label>

          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" formControlName="githubWhatsappDiretoHabilitado" />
            Enviar WhatsApp direto (fluxo GitHub atual)
          </label>

          <div>
            <label class="block text-sm font-medium mb-1">URL do webhook</label>
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

          <div class="flex flex-wrap gap-2 justify-end">
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

  readonly form = this.fb.group({
    kanbanMovimentacaoWebhookHabilitado: [false],
    githubWhatsappDiretoHabilitado: [true],
    kanbanMovimentacaoWebhookUrl: [''],
    kanbanMovimentacaoWebhookAuthorization: [''],
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.github.obterKanbanMovimentacaoWebhook().subscribe({
      next: (cfg) => {
        this.authConfigurado.set(cfg.kanbanMovimentacaoWebhookAuthorizationConfigurado);
        this.form.patchValue({
          kanbanMovimentacaoWebhookHabilitado: cfg.kanbanMovimentacaoWebhookHabilitado,
          githubWhatsappDiretoHabilitado: cfg.githubWhatsappDiretoHabilitado,
          kanbanMovimentacaoWebhookUrl: cfg.kanbanMovimentacaoWebhookUrl ?? '',
          kanbanMovimentacaoWebhookAuthorization: '',
        });
        this.form.markAsPristine();
        this.carregando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.toast.error(
          'Webhook kanban',
          extrairMensagemErroHttp(err, 'Não foi possível carregar a configuração.'),
        );
        this.carregando.set(false);
      },
    });
  }

  salvar(): void {
    const v = this.form.getRawValue();
    const authDirty = this.form.controls.kanbanMovimentacaoWebhookAuthorization.dirty;
    const body: Record<string, unknown> = {
      kanbanMovimentacaoWebhookHabilitado: v.kanbanMovimentacaoWebhookHabilitado ?? false,
      githubWhatsappDiretoHabilitado: v.githubWhatsappDiretoHabilitado ?? true,
      kanbanMovimentacaoWebhookUrl: (v.kanbanMovimentacaoWebhookUrl ?? '').trim() || null,
    };
    if (authDirty && (v.kanbanMovimentacaoWebhookAuthorization ?? '').trim()) {
      body['kanbanMovimentacaoWebhookAuthorization'] = v.kanbanMovimentacaoWebhookAuthorization!.trim();
    }

    this.salvando.set(true);
    this.github.patchKanbanMovimentacaoWebhook(body).subscribe({
      next: (cfg) => {
        this.authConfigurado.set(cfg.kanbanMovimentacaoWebhookAuthorizationConfigurado);
        this.form.controls.kanbanMovimentacaoWebhookAuthorization.reset('');
        this.form.markAsPristine();
        this.salvando.set(false);
        this.toast.success('Webhook kanban', 'Configuração salva.');
      },
      error: (err: HttpErrorResponse) => {
        this.salvando.set(false);
        this.toast.error('Webhook kanban', extrairMensagemErroHttp(err, 'Falha ao salvar.'));
      },
    });
  }

  testar(): void {
    this.testando.set(true);
    this.github.testarKanbanMovimentacaoWebhook().subscribe({
      next: () => {
        this.testando.set(false);
        this.toast.success('Webhook kanban', 'Evento de teste enviado.');
      },
      error: (err: HttpErrorResponse) => {
        this.testando.set(false);
        this.toast.error('Webhook kanban', extrairMensagemErroHttp(err, 'Falha no teste.'));
      },
    });
  }
}
