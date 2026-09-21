import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { AlertCircle, CheckCircle2, LucideAngularModule } from 'lucide-angular';

export interface GithubIntegracaoStatusItem {
  id: string;
  label: string;
  ok: boolean;
  hint?: string | null;
}

@Component({
  selector: 'app-github-integracao-status-strip',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div
      class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/40 px-5 py-4 space-y-3"
    >
      <p class="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        Saúde da integração
      </p>
      <div class="flex flex-wrap gap-2.5">
        @for (item of itens(); track item.id) {
          <span
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs"
            [class.border-[var(--color-success-border)]]="item.ok"
            [class.bg-[var(--color-success-bg)]]="item.ok"
            [class.text-[var(--color-success)]]="item.ok"
            [class.border-[var(--color-border)]]="!item.ok"
            [class.bg-[var(--color-surface-muted)]]="!item.ok"
            [class.text-[var(--color-text-muted)]]="!item.ok"
            [attr.title]="item.hint || null"
          >
            <lucide-icon
              [img]="item.ok ? okIcon : warnIcon"
              class="w-3.5 h-3.5 shrink-0"
            />
            {{ item.label }}
          </span>
        }
      </div>
    </div>
  `,
})
export class GithubIntegracaoStatusStripComponent {
  readonly itens = input.required<GithubIntegracaoStatusItem[]>();

  protected readonly okIcon = CheckCircle2;
  protected readonly warnIcon = AlertCircle;
}
