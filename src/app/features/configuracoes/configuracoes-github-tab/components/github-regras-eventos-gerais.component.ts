import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { FormFieldComponent } from '../../../../shared/components/forms/form-field/app-form-field';
import { GithubLoginSugerido } from '../github-logins-lista.util';
import { GithubLoginsConfiguradosPickerComponent } from './github-logins-configurados-picker.component';
import { GithubStatusDisparoGatilhosComponent } from './github-status-disparo-gatilhos.component';

@Component({
  selector: 'app-github-regras-eventos-gerais',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormFieldComponent,
    GithubStatusDisparoGatilhosComponent,
    GithubLoginsConfiguradosPickerComponent,
  ],
  template: `
    <div class="space-y-6" [formGroup]="form">
      <div class="border border-[var(--color-border)] rounded-2xl p-5 md:p-6 space-y-6">
        <div class="space-y-2">
          <h3 class="text-base font-semibold text-[var(--color-text)]">Padrões da organização</h3>
          <p class="text-sm text-[var(--color-text-muted)] leading-relaxed">
            Valores padrão da organização. Quem recebe em cada coluna do kanban você define em

            <strong>Fluxos por coluna</strong> (padrão ou personalizado por status).
          </p>
        </div>

        <label class="config-toggle text-sm text-[var(--color-text)]">
          Não notificar quem realizou a movimentação
          <input type="checkbox" formControlName="githubNaoNotificarMovimentador" />
        </label>

        <div class="space-y-3">
          <h4 class="text-sm font-semibold text-[var(--color-text)]">Destinatários padrão (fluxo geral)</h4>
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
            <app-form-field label="Logins GitHub" [error]="campoErro('dsGithubDestinatariosExtras')">
              <app-github-logins-configurados-picker
                [extras]="form.get('dsGithubDestinatariosExtras')?.value"
                [loginsSugeridos]="loginsGithubSugeridos"
                [carregando]="carregandoLoginsGithub"
                (extrasChange)="atualizarDestinatariosExtras($event)"
              />
            </app-form-field>
          }
        </div>
        <label class="config-toggle text-sm text-[var(--color-text)]">
          Ignorar sem responsável
          <input type="checkbox" formControlName="githubIgnorarSemResponsavel" />
        </label>

      </div>

      <div class="border border-[var(--color-border)] rounded-2xl p-5 md:p-6 space-y-6">
        <div class="space-y-2">
          <h3 class="text-base font-semibold text-[var(--color-text)]">Eventos sem coluna</h3>
          <p class="text-sm text-[var(--color-text-muted)] leading-relaxed">
            Ligam ou desligam <em>tipos</em> de evento na integração. Quais <strong>colunas</strong> do board disparam ao

            mover card ficam em <strong>Fluxos por coluna</strong> (não marque todas as colunas aqui).
          </p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="config-toggle text-sm text-[var(--color-text)]">
            Status alterado
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
      </div>

      <div class="border border-[var(--color-border)] rounded-2xl p-5 md:p-6 space-y-3">
        <h3 class="text-base font-semibold text-[var(--color-text)]">Fila sem responsável</h3>
        <label class="config-toggle text-sm text-[var(--color-text)]">
          Registrar na fila quando não houver responsável ou destinatário
          <input type="checkbox" formControlName="webhookRegistrarFilaSemDestinatario" />
        </label>
        <p class="text-xs text-[var(--color-text-muted)]">
          Desligado: eventos sem destinatário são ignorados e não entram na fila.
        </p>
      </div>
    </div>
  `,
})
export class GithubRegrasEventosGeraisComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) campoErro!: (campo: string) => string | null;
  @Input() loginsGithubSugeridos: GithubLoginSugerido[] = [];
  @Input() carregandoLoginsGithub = false;

  atualizarDestinatariosExtras(extras: string | null): void {
    const control = this.form.get('dsGithubDestinatariosExtras');
    if (!control) {
      return;
    }
    control.setValue(extras ?? '');
    control.markAsDirty();
  }
}
