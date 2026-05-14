// src/app/features/login/login.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen app-page flex items-center justify-center p-4">

      <!-- Glow de fundo -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                    w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl"></div>
      </div>

      <div class="relative w-full max-w-md">

        <!-- Logo / Brand -->
        <div class="text-center mb-10">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl
                      bg-indigo-600 shadow-lg shadow-indigo-600/40 mb-4">
            <svg class="w-7 h-7 app-title" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002
                       6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6
                       8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6
                       0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold app-title tracking-tight">Notificação API</h1>
          <p class="app-muted text-sm mt-1">Acesse sua conta para continuar</p>
        </div>

        <!-- Card -->
        <div class="app-surface border rounded-2xl p-8 shadow-2xl">

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">

            <!-- Login -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                CPF ou E-mail
              </label>
              <input
                formControlName="login"
                type="text"
                placeholder="000.000.000-00 ou seu@email.com"
                class="w-full app-surface-muted border rounded-xl px-4 py-3
                       app-title placeholder-slate-500 text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                       transition-all duration-200"
              />
              @if (form.get('login')?.invalid && form.get('login')?.touched) {
                <p class="app-alert-danger-text text-xs mt-1">Campo obrigatório</p>
              }
            </div>

            <!-- Senha -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">Senha</label>
              <input
                formControlName="senha"
                type="password"
                placeholder="••••••••"
                class="w-full app-surface-muted border rounded-xl px-4 py-3
                       app-title placeholder-slate-500 text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                       transition-all duration-200"
              />
              @if (form.get('senha')?.invalid && form.get('senha')?.touched) {
                <p class="app-alert-danger-text text-xs mt-1">Campo obrigatório</p>
              }
            </div>

            <!-- Erro geral -->
            @if (erro()) {
              <div class="app-alert-danger border rounded-xl px-4 py-3">
                <p class="app-alert-danger-text text-sm">{{ erro() }}</p>
              </div>
            }

            <!-- Botão -->
            <button
              type="submit"
              [disabled]="form.invalid || authService.carregando()"
              class="w-full app-button-primary disabled:opacity-50
                     disabled:cursor-not-allowed app-title font-semibold py-3 px-4
                     rounded-xl transition-all duration-200 text-sm
                     shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30"
            >
              @if (authService.carregando()) {
                <span class="flex items-center justify-center gap-2">
                  <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10"
                            stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Entrando...
                </span>
              } @else {
                Entrar
              }
            </button>

          </form>
        </div>

        <p class="text-center app-faint text-xs mt-6">
          © {{ ano }} Notificação API · Todos os direitos reservados
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly ano = new Date().getFullYear();
  readonly erro = signal<string | null>(null);

  readonly form = this.fb.group({
    login: ['', [Validators.required]],
    senha: ['', [Validators.required]],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    this.erro.set(null);

    const { login, senha } = this.form.getRawValue();
    this.authService.login({ login: login!, senha: senha! }).subscribe({
      next: (res) => {
        if (res.deveSelecionarOrganizacao) {
          this.router.navigate(['/selecionar-organizacao']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.erro.set(
          err.error?.mensagem ?? 'Credenciais inválidas. Verifique e tente novamente.'
        );
      },
    });
  }
}
