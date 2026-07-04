import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      @for (toast of toastService.mensagens(); track toast.id) {
        <div
          class="pointer-events-auto rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-right"
          [class.bg-[var(--color-success-bg)]]="toast.severity === 'success'"
          [class.border-[var(--color-success-border)]]="toast.severity === 'success'"
          [class.bg-[var(--color-danger-bg)]]="toast.severity === 'error'"
          [class.border-[var(--color-danger-border)]]="toast.severity === 'error'"
          [class.bg-[var(--color-surface)]]="toast.severity === 'info' || toast.severity === 'warn'"
          [class.border-[var(--color-border)]]="toast.severity === 'info' || toast.severity === 'warn'"
        >
          <div class="flex items-start gap-3">
            <lucide-icon
              [img]="icone(toast.severity)"
              class="w-5 h-5 flex-shrink-0 mt-0.5"
              [class.text-[var(--color-success)]]="toast.severity === 'success'"
              [class.text-[var(--color-danger)]]="toast.severity === 'error'"
              [class.text-[var(--color-primary-soft)]]="toast.severity === 'info'"
              [class.text-[var(--color-warning)]]="toast.severity === 'warn'"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-[var(--color-text)]">{{ toast.title }}</p>
              @if (toast.detail) {
                <p class="text-xs text-[var(--color-text-muted)] mt-1">{{ toast.detail }}</p>
              }
            </div>
            <button
              type="button"
              class="text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
              (click)="toastService.remover(toast.id)"
            >
              <lucide-icon [img]="closeIcon" class="w-4 h-4" />
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);
  readonly closeIcon = X;
  readonly successIcon = CheckCircle2;
  readonly errorIcon = XCircle;
  readonly infoIcon = Info;
  readonly warnIcon = TriangleAlert;

  icone(severity: string) {
    switch (severity) {
      case 'success':
        return this.successIcon;
      case 'error':
        return this.errorIcon;
      case 'warn':
        return this.warnIcon;
      default:
        return this.infoIcon;
    }
  }
}
