import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly sidebarAberta = signal(false);

  abrirSidebar(): void {
    this.sidebarAberta.set(true);
  }

  fecharSidebar(): void {
    this.sidebarAberta.set(false);
  }

  alternarSidebar(): void {
    this.sidebarAberta.update((aberta) => !aberta);
  }
}
