// src/app/features/login/login.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import {
  Bell,
  LoaderCircle,
  LucideAngularModule
} from 'lucide-angular';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly brandIcon = Bell;
  protected readonly loaderIcon = LoaderCircle;

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

    this.authService.login({
      login: login!,
      senha: senha!
    }).subscribe({
      next: (res) => {
        if (res.deveSelecionarOrganizacao) {
          this.router.navigate(['/selecionar-organizacao']);
          return;
        }

        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.erro.set(
          err.error?.mensagem ??
          err.error?.erro ??
          'Credenciais inválidas. Verifique e tente novamente.'
        );
      },
    });
  }
}