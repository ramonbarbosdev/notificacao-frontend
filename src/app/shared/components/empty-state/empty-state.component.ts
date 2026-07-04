import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, LucideIconData, Inbox } from 'lucide-angular';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="flex flex-col items-center justify-center text-center py-12 px-6">
      <div
        class="w-14 h-14 rounded-2xl bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex items-center justify-center mb-4"
      >
        <lucide-icon [img]="icon" class="w-7 h-7 text-[var(--color-text-faint)]" />
      </div>
      <h3 class="text-[var(--color-text)] font-semibold text-base mb-1">{{ title }}</h3>
      @if (description) {
        <p class="text-[var(--color-text-muted)] text-sm max-w-md mb-4">{{ description }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() title = 'Nenhum registro encontrado';
  @Input() description = '';
  @Input() icon: LucideIconData = Inbox;
}
