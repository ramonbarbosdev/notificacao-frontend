import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <label class="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] mb-2">
        <span>{{ label() }}</span>
        @if (savedOnServer()) {
          <span
            class="inline-flex items-center text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success)] font-semibold"
            title="Valor já armazenado no servidor (não é exibido)"
          >
            Salvo
          </span>
        }
      </label>

      <ng-content />

      @if (helper()) {
        <p class="text-[var(--color-text-subtle)] text-xs mt-1">
          {{ helper() }}
        </p>
      }

      @if (error()) {
        <p class="text-[var(--color-danger)] text-xs mt-1">
          {{ error() }}
        </p>
      }
    </div>
  `,
})
export class FormFieldComponent {
  label = input.required<string>();
  helper = input<string | null>(null);
  error = input<string | null>(null);
  /** Segredos já persistidos (PEM, PAT, etc.) — badge “Salvo” no label. */
  savedOnServer = input(false);
}