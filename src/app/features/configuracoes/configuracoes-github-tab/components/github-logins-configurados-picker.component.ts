import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';

import {
  GithubLoginSugerido,
  loginJaNaLista,
  parseLoginsLista,
  serializarLoginsLista,
} from '../github-logins-lista.util';

@Component({
  selector: 'app-github-logins-configurados-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-3 max-w-md">
      @if (selecionados().length > 0) {
        <div class="flex flex-wrap gap-2">
          @for (login of selecionados(); track login) {
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-[var(--color-border)] text-xs font-mono text-[var(--color-text)] bg-[var(--color-surface-muted)]/40"
            >
              {{ '@' + login }}
              <button
                type="button"
                class="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] leading-none"
                [attr.aria-label]="'Remover ' + login"
                (click)="remover(login)"
              >
                ×
              </button>
            </span>
          }
        </div>
      }

      @if (carregando() && loginsSugeridos().length === 0) {
        <p class="text-xs text-[var(--color-text-muted)]">Carregando logins salvos na organização…</p>
      } @else if (loginsParaSelect().length > 0) {
        <select
          class="form-input-admin text-sm w-full"
          [value]="selectValor()"
          (change)="adicionarDoSelect($any($event.target).value)"
        >
          <option value="">Selecione um login para adicionar…</option>
          @for (item of loginsParaSelect(); track item.login) {
            <option [value]="item.login">
              {{ item.login }}
              @if (item.habilitado) {
                — WhatsApp ok
              } @else {
                — sem opt-in
              }
            </option>
          }
        </select>
      } @else {
        <p class="text-xs text-[var(--color-text-muted)]">
          Nenhum login GitHub salvo ainda. Vincule responsáveis nas abas Equipe / Habilitados.
        </p>
      }

      <div class="flex gap-2">
        <input
          class="form-input-admin text-sm flex-1 font-mono"
          placeholder="Ou digite um login e adicione"
          [value]="loginManual()"
          (input)="loginManual.set($any($event.target).value)"
          (keydown.enter)="adicionarManual(); $event.preventDefault()"
        />
        <button
          type="button"
          class="px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] shrink-0 disabled:opacity-45"
          [disabled]="!loginManual().trim()"
          (click)="adicionarManual()"
        >
          Adicionar
        </button>
      </div>
    </div>
  `,
})
export class GithubLoginsConfiguradosPickerComponent {
  readonly extras = input<string | null>(null);
  readonly loginsSugeridos = input<GithubLoginSugerido[]>([]);
  readonly carregando = input(false);

  readonly extrasChange = output<string | null>();

  readonly loginManual = signal('');
  readonly selectValor = signal('');

  readonly selecionados = computed(() => parseLoginsLista(this.extras()));

  readonly loginsParaSelect = computed(() => {
    const atuais = this.selecionados();
    return this.loginsSugeridos().filter((item) => !loginJaNaLista(atuais, item.login));
  });

  adicionarDoSelect(login: string): void {
    this.selectValor.set('');
    this.adicionar(login);
  }

  adicionarManual(): void {
    const login = this.loginManual().trim();
    if (!login) {
      return;
    }
    this.adicionar(login);
    this.loginManual.set('');
  }

  remover(login: string): void {
    const chave = login.toLowerCase();
    const restante = this.selecionados().filter((l) => l.toLowerCase() !== chave);
    this.emitir(restante);
  }

  private adicionar(login: string): void {
    const normalizado = login.trim();
    if (!normalizado) {
      return;
    }
    const atuais = this.selecionados();
    if (loginJaNaLista(atuais, normalizado)) {
      return;
    }
    this.emitir([...atuais, normalizado]);
  }

  private emitir(logins: string[]): void {
    this.extrasChange.emit(serializarLoginsLista(logins));
  }
}
