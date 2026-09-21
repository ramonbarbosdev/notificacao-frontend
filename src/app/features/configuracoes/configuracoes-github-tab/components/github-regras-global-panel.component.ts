import { CommonModule } from '@angular/common';
import { Component, Input, TemplateRef } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { FormFieldComponent } from '../../../../shared/components/forms/form-field/app-form-field';
import { GithubStatusDisparoGatilhosComponent } from './github-status-disparo-gatilhos.component';

@Component({
  selector: 'app-github-regras-global-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent, GithubStatusDisparoGatilhosComponent],
  template: `
    <div class="border border-[var(--color-border)] rounded-2xl p-5 md:p-6 space-y-6" [formGroup]="form">
      <div class="space-y-2">
        <h3 class="text-base font-semibold text-[var(--color-text)]">Fora do board</h3>
        <p class="text-sm text-[var(--color-text-muted)] leading-relaxed">
          Eventos que não são “entrar em uma coluna” (responsável, label, issue aberta…). O board acima configura
          colunas Status do Project v2.
        </p>
      </div>

      <label class="config-toggle text-sm text-[var(--color-text)]">
        Não notificar quem realizou a movimentação
        <input type="checkbox" formControlName="githubNaoNotificarMovimentador" />
      </label>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="config-toggle text-sm text-[var(--color-text)]">
          Status alterado (global)
          <input type="checkbox" formControlName="githubNotificarStatusAlterado" />
        </label>
        <label class="config-toggle text-sm text-[var(--color-text)]">
          Tarefa criada
          <input type="checkbox" formControlName="githubNotificarTarefaCriada" />
        </label>
        <label class="config-toggle text-sm text-[var(--color-text)]">
          Responsável alterado
          <input type="checkbox" formControlName="githubNotificarResponsavelAlterado" />
        </label>
        <label class="config-toggle text-sm text-[var(--color-text)]">
          Tarefa atribuída
          <input type="checkbox" formControlName="githubNotificarTarefaAtribuida" />
        </label>
        <label class="config-toggle text-sm text-[var(--color-text)]">
          Issue fechada/reaberta
          <input type="checkbox" formControlName="githubNotificarIssueFechadaReaberta" />
        </label>
        <label class="config-toggle text-sm text-[var(--color-text)]">
          Label na issue
          <input type="checkbox" formControlName="githubNotificarIssueLabel" />
        </label>
        <label class="config-toggle text-sm text-[var(--color-text)]">
          Só campo Status (v2)
          <input type="checkbox" formControlName="githubNotificarSomenteCampoStatus" />
        </label>
        <label class="config-toggle text-sm text-[var(--color-text)]">
          Reordenação no board
          <input type="checkbox" formControlName="githubNotificarReordenacao" />
        </label>
      </div>

      <app-github-status-disparo-gatilhos [form]="form" />

      <div class="pt-4 border-t border-[var(--color-border)] space-y-6">
        <h4 class="text-sm font-semibold text-[var(--color-text)]">Destinatários (padrão da org)</h4>
        <p class="text-xs text-[var(--color-text-muted)]">
          Usado no fluxo geral e quando a coluna estiver com destinatários = “Herdar padrão”.
        </p>
        <div class="space-y-3">
          <label class="flex items-start gap-2 text-sm text-[var(--color-text)] cursor-pointer">
            <input type="radio" formControlName="dsGithubDestinatariosModo" value="RESPONSAVEIS" class="mt-1" />
            <span>Responsáveis da tarefa (assignees)</span>
          </label>
          <label class="flex items-start gap-2 text-sm text-[var(--color-text)] cursor-pointer">
            <input
              type="radio"
              formControlName="dsGithubDestinatariosModo"
              value="RESPONSAVEIS_E_MOVIMENTADOR"
              class="mt-1"
            />
            <span>Responsáveis + quem moveu/editou</span>
          </label>
          <label class="flex items-start gap-2 text-sm text-[var(--color-text)] cursor-pointer">
            <input type="radio" formControlName="dsGithubDestinatariosModo" value="LOGINS_CONFIGURADOS" class="mt-1" />
            <span>Logins GitHub configurados (opt-in obrigatório)</span>
          </label>
          @if (form.get('dsGithubDestinatariosModo')?.value === 'LOGINS_CONFIGURADOS') {
            <app-form-field label="Logins GitHub (vírgula)" [error]="campoErro('dsGithubDestinatariosExtras')">
              <input formControlName="dsGithubDestinatariosExtras" class="form-input-admin" placeholder="octocat, dev1" />
            </app-form-field>
            @if (sugestoesLoginsExtras) {
              <ng-container *ngTemplateOutlet="sugestoesLoginsExtras; context: { campo: 'dsGithubDestinatariosExtras' }" />
            }
          }
        </div>
        <label class="config-toggle text-sm text-[var(--color-text)]">
          Ignorar sem responsável
          <input type="checkbox" formControlName="githubIgnorarSemResponsavel" />
        </label>
      </div>

      <div class="pt-4 border-t border-[var(--color-border)] space-y-4">
        <h4 class="text-sm font-semibold text-[var(--color-text)]">Avaliadores (PR / Issue)</h4>
        <label class="config-toggle text-sm text-[var(--color-text)]">
          Habilitar aviso a avaliadores em PR
          <input type="checkbox" formControlName="githubPrAvisarAvaliadores" />
        </label>
        <label class="config-toggle text-sm text-[var(--color-text)]">
          Habilitar aviso a avaliadores em Issue
          <input type="checkbox" formControlName="githubIssueAvisarAvaliadores" />
        </label>
        <app-form-field
          label="Logins GitHub dos avaliadores"
          helper="Usados quando uma coluna tiver PR/Issue avaliadores ativos"
          [error]="campoErro('dsGithubPrLoginsAvaliadores')"
        >
          <input formControlName="dsGithubPrLoginsAvaliadores" class="form-input-admin" placeholder="reviewer1, tech-lead" />
        </app-form-field>
        @if (sugestoesLoginsPr) {
          <ng-container *ngTemplateOutlet="sugestoesLoginsPr; context: { campo: 'dsGithubPrLoginsAvaliadores' }" />
        }
      </div>

      <div class="pt-4 border-t border-[var(--color-border)] space-y-3">
        <h4 class="text-sm font-semibold text-[var(--color-text)]">Fila sem responsável</h4>
        <label class="config-toggle text-sm text-[var(--color-text)]">
          Registrar na fila quando não houver responsável ou destinatário
          <input type="checkbox" formControlName="webhookRegistrarFilaSemDestinatario" />
        </label>
      </div>
    </div>
  `,
})
export class GithubRegrasGlobalPanelComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) campoErro!: (campo: string) => string | null;
  @Input() sugestoesLoginsExtras: TemplateRef<unknown> | null = null;
  @Input() sugestoesLoginsPr: TemplateRef<unknown> | null = null;
}
