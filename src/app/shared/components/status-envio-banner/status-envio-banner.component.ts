import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { AlertTriangle, Clock, LucideAngularModule } from 'lucide-angular';
import { interval, startWith, switchMap } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { NotificacaoService } from '../../../core/services/notificacao.service';
import { formatDateTimePtBr } from '../../helper/date.utils';
import { StatusEnvioOrganizacaoResponse } from '../../types/dtos';

@Component({
  selector: 'app-status-envio-banner',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './status-envio-banner.component.html',
})
export class StatusEnvioBannerComponent implements OnInit {
  private readonly notificacaoService = inject(NotificacaoService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly alertIcon = AlertTriangle;
  protected readonly clockIcon = Clock;

  readonly status = signal<StatusEnvioOrganizacaoResponse | null>(null);
  readonly carregando = signal(false);

  ngOnInit(): void {
    if (this.authService.isSuperAdmin()) {
      return;
    }

    interval(30_000)
      .pipe(
        startWith(0),
        switchMap(() => {
          this.carregando.set(true);
          return this.notificacaoService.consultarStatusEnvio('WHATSAPP');
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          this.status.set(res);
          this.carregando.set(false);
        },
        error: () => {
          this.carregando.set(false);
        },
      });
  }

  bloqueado(): boolean {
    return this.status()?.podeEnviar === false;
  }

  formatarRetomada(): string | null {
    const atual = this.status();
    if (!atual) return null;
    if (atual.retomadaPrevistaTexto) return atual.retomadaPrevistaTexto;
    if (atual.retomadaPrevistaEm) return formatDateTimePtBr(atual.retomadaPrevistaEm);
    return null;
  }
}
