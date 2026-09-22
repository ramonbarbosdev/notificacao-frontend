import { Component, Input, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { OrganizacaoConfiguracaoFormData } from '../../../integracoes/github/schemas/github-integracao-form.schema';

export interface GithubGatilhoFiltroOpcao {
  id: keyof OrganizacaoConfiguracaoFormData | string;
  codigo: string;
  label: string;
  hint: string;
  /** Nome do checkbox de gatilho que precisa estar ligado para fazer sentido marcar o filtro */
  requerGatilho?: keyof OrganizacaoConfiguracaoFormData;
}

export const GITHUB_GATILHOS_FILTRO_STATUS_GERAL: GithubGatilhoFiltroOpcao[] = [
  {
    codigo: 'STATUS_ALTERADO',
    id: 'githubNotificarStatusAlterado',
    label: 'Status alterado',
    hint: 'Ao mover o card para outra coluna Status no board.',
    requerGatilho: 'githubNotificarStatusAlterado',
  },
  {
    codigo: 'REORDENADO',
    id: 'reord',
    label: 'Reordenação no board',
    hint: 'Quando o gatilho Reordenação estiver ligado.',
    requerGatilho: 'githubNotificarReordenacao',
  },
  {
    codigo: 'TAREFA_CRIADA',
    id: 'tarefaCriada',
    label: 'Tarefa criada',
    hint: 'Card novo no project (coluna inicial).',
    requerGatilho: 'githubNotificarTarefaCriada',
  },
  {
    codigo: 'RESPONSAVEL_ALTERADO',
    id: 'respAlt',
    label: 'Responsável alterado',
    hint: 'Issue assigned/unassigned — em geral deixe desmarcado (não usa nome de coluna).',
    requerGatilho: 'githubNotificarResponsavelAlterado',
  },
  {
    codigo: 'TAREFA_ATRIBUIDA',
    id: 'tarefaAtrib',
    label: 'Tarefa atribuída',
    hint: 'Mesmo evento assigned; só marque se quiser forçar filtro de colunas nesse caso.',
    requerGatilho: 'githubNotificarTarefaAtribuida',
  },
  {
    codigo: 'ISSUE_FECHADA_REABERTA',
    id: 'issueFech',
    label: 'Issue fechada/reaberta',
    hint: 'Evento issues closed/reopened.',
    requerGatilho: 'githubNotificarIssueFechadaReaberta',
  },
  {
    codigo: 'ISSUE_LABEL',
    id: 'issueLabel',
    label: 'Label na issue',
    hint: 'Evento issues labeled.',
    requerGatilho: 'githubNotificarIssueLabel',
  },
];

const PADRAO_GATILHOS = 'STATUS_ALTERADO,REORDENADO';

@Component({
  selector: 'app-github-status-disparo-gatilhos',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="space-y-3" [formGroup]="form">
      <div>
        <p class="text-sm font-medium text-[var(--color-text)]">Gatilhos que respeitam o fluxograma de colunas</p>
        <p class="text-xs text-[var(--color-text-muted)] leading-relaxed mt-1">
          Para os gatilhos marcados abaixo, o fluxo geral só dispara se a coluna de destino tiver
          <strong>Geral</strong> ativo no fluxograma (aba Fluxos). Os demais disparam sem essa checagem (ex.:
          responsável alterado).
        </p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        @for (op of opcoes; track op.codigo) {
          <label
            class="flex items-start gap-2.5 rounded-xl border border-[var(--color-border)] px-3 py-2.5 cursor-pointer hover:bg-[var(--color-surface-muted)]/40 transition-colors"
            [class.opacity-50]="!gatilhoLigado(op)"
          >
            <input
              type="checkbox"
              class="mt-1 shrink-0"
              [checked]="selecionado(op.codigo)"
              [disabled]="!gatilhoLigado(op)"
              (change)="alternar(op.codigo, $any($event.target).checked)"
            />
            <span class="min-w-0">
              <span class="text-sm text-[var(--color-text)] block">{{ op.label }}</span>
              <span class="text-[11px] text-[var(--color-text-muted)] leading-snug block">{{ op.hint }}</span>
            </span>
          </label>
        }
      </div>
      <input type="hidden" formControlName="dsGithubStatusDisparoGatilhos" />
    </div>
  `,
})
export class GithubStatusDisparoGatilhosComponent {
  @Input({ required: true }) form!: FormGroup;

  readonly opcoes = GITHUB_GATILHOS_FILTRO_STATUS_GERAL;

  gatilhoLigado(op: GithubGatilhoFiltroOpcao): boolean {
    if (!op.requerGatilho) {
      return true;
    }
    return !!this.form.get(op.requerGatilho)?.value;
  }

  selecionado(codigo: string): boolean {
    return this.parse(this.form.get('dsGithubStatusDisparoGatilhos')?.value).has(codigo);
  }

  alternar(codigo: string, marcado: boolean): void {
    const set = this.parse(this.form.get('dsGithubStatusDisparoGatilhos')?.value);
    if (marcado) {
      set.add(codigo);
    } else {
      set.delete(codigo);
    }
    const ordenados = [...set].sort();
    const valor = ordenados.length > 0 ? ordenados.join(', ') : PADRAO_GATILHOS;
    const control = this.form.get('dsGithubStatusDisparoGatilhos');
    control?.setValue(valor);
    control?.markAsDirty();
  }

  private parse(raw: unknown): Set<string> {
    const texto = String(raw ?? '').trim();
    const fonte = texto || PADRAO_GATILHOS;
    const set = new Set<string>();
    for (const parte of fonte.split(/[,;]+/)) {
      const t = parte.trim();
      if (t) {
        set.add(t);
      }
    }
    return set;
  }
}
