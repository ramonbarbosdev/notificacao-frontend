// src/app/features/selecionar-organizacao/selecionar-organizacao.component.ts

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  LucideAngularModule,
  Building2,
  LoaderCircle,
  ChevronRight,
} from 'lucide-angular';

import { AuthService } from '../../core/auth/auth.service';

import { Organizacao } from '../../shared/types/dtos';

@Component({
  selector: 'app-selecionar-organizacao',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
  ],
  templateUrl: './selecionar-organizacao.component.html',
})
export class SelecionarOrganizacaoComponent {

  readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  protected readonly buildingIcon = Building2;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly chevronRightIcon = ChevronRight;

  readonly carregando = signal<number | null>(null);
  readonly erro = signal<string | null>(null);

  selecionar(org: Organizacao): void {

    this.erro.set(null);

    this.carregando.set(org.idOrganizacao);

    this.authService
      .selecionarOrganizacao({
        idOrganizacao: org.idOrganizacao
      })
      .subscribe({
        next: () => {
          this.router.navigate(['/app/dashboard']);
        },

        error: (err) => {

          this.erro.set(
            err.error?.mensagem ??
            err.error?.erro ??
            'Erro ao selecionar organização.'
          );

          this.carregando.set(null);
        },
      });
  }
}
