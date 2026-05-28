import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <label class="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
        {{ label() }}
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
}