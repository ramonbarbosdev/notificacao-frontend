import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { GithubIntegracaoService } from '../../../core/services/github-integracao.service';

type AreaGithub = 'compartilhado' | 'modulos';

@Component({
  selector: 'app-github-integracao-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './github-integracao-shell.component.html',
})
export class GithubIntegracaoShellComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly githubService = inject(GithubIntegracaoService);

  readonly featureHabilitada = signal(true);

  private readonly urlAtual = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly areaAtiva = () => {
    const url = this.urlAtual();
    if (url.includes('/integracoes/github/modulos')) {
      return 'modulos' as AreaGithub;
    }
    return 'compartilhado' as AreaGithub;
  };

  ngOnInit(): void {
    this.githubService.obterHub().subscribe({
      next: (hub) => this.featureHabilitada.set(hub.featureHabilitada),
      error: (_err: HttpErrorResponse) => this.featureHabilitada.set(false),
    });
  }
}
