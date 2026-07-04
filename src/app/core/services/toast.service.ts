import { Injectable, signal } from '@angular/core';

export type ToastSeverity = 'success' | 'error' | 'info' | 'warn';

export interface ToastMessage {
  id: number;
  severity: ToastSeverity;
  title: string;
  detail?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  readonly mensagens = signal<ToastMessage[]>([]);

  success(title: string, detail?: string): void {
    this.push('success', title, detail);
  }

  error(title: string, detail?: string): void {
    this.push('error', title, detail);
  }

  info(title: string, detail?: string): void {
    this.push('info', title, detail);
  }

  warn(title: string, detail?: string): void {
    this.push('warn', title, detail);
  }

  remover(id: number): void {
    this.mensagens.update((items) => items.filter((item) => item.id !== id));
  }

  private push(severity: ToastSeverity, title: string, detail?: string): void {
    const id = ++this.seq;
    this.mensagens.update((items) => [...items, { id, severity, title, detail }]);
    window.setTimeout(() => this.remover(id), 5000);
  }
}
