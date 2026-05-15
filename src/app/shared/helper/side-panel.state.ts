// shared/helper/side-panel.state.ts
import { signal } from '@angular/core';

export function useSidePanel<T = unknown>() {
  const aberto = signal(false);
  const item = signal<T | null>(null);

  function abrir(value?: T): void {
    item.set(value ?? null);
    aberto.set(true);
  }

  function fechar(): void {
    aberto.set(false);
    item.set(null);
  }

  function alternar(value?: T): void {
    if (aberto()) {
      fechar();
      return;
    }

    abrir(value);
  }

  return {
    aberto,
    item,
    abrir,
    fechar,
    alternar,
  };
}