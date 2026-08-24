import { Injectable, signal } from '@angular/core';

export type CommandDialogVariant = 'default' | 'danger';

export interface CommandDialogOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: CommandDialogVariant;
}

export interface CommandDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: CommandDialogVariant;
}

@Injectable({ providedIn: 'root' })
export class CommandDialogService {
  readonly dialog = signal<CommandDialogState | null>(null);

  private resolver: ((confirmed: boolean) => void) | null = null;

  confirm(options: CommandDialogOptions): Promise<boolean> {
    if (this.resolver) {
      this.resolver(false);
      this.resolver = null;
    }

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
      this.dialog.set({
        title: options.title ?? 'Confirmacao',
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Confirmar',
        cancelLabel: options.cancelLabel ?? 'Cancelar',
        variant: options.variant ?? 'default',
      });
    });
  }

  close(confirmed: boolean): void {
    this.dialog.set(null);
    this.resolver?.(confirmed);
    this.resolver = null;
  }
}
