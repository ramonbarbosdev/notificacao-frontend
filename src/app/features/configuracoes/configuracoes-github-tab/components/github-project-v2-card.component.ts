import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { CheckCircle2, LucideAngularModule } from 'lucide-angular';

import { GithubProjectV2Resumo } from '../../../../shared/types/dtos';

@Component({
  selector: 'app-github-project-v2-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <button
      type="button"
      class="w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors flex items-start gap-3"
      [class.border-[var(--color-primary)]]="selecionado()"
      [class.bg-[var(--color-primary)]/10]="selecionado()"
      [class.shadow-sm]="selecionado()"
      [class.border-[var(--color-border)]]="!selecionado()"
      [class.hover:bg-[var(--color-surface-muted)]]="!selecionado()"
      (click)="selecionar.emit(project())"
    >
      <lucide-icon
        [img]="checkIcon"
        class="w-5 h-5 shrink-0 mt-0.5"
        [class.text-[var(--color-primary)]]="selecionado()"
        [class.text-[var(--color-text-faint)]]="!selecionado()"
      />
      <div class="min-w-0 flex-1">
        <span class="font-medium text-[var(--color-text)] block">
          #{{ project().number }} — {{ project().title || 'Sem título' }}
        </span>
        @if (project().url) {
          <span class="block text-xs text-[var(--color-text-muted)] truncate mt-0.5">{{ project().url }}</span>
        }
      </div>
    </button>
  `,
})
export class GithubProjectV2CardComponent {
  readonly project = input.required<GithubProjectV2Resumo>();
  readonly selecionado = input(false);
  readonly selecionar = output<GithubProjectV2Resumo>();

  protected readonly checkIcon = CheckCircle2;
}
