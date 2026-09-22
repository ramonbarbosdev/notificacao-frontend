import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LoaderCircle, LucideAngularModule, Settings2 } from 'lucide-angular';

import { GithubIntegracaoService } from '../../../core/services/github-integracao.service';
import { ToastService } from '../../../core/services/toast.service';
import { GithubIntegracaoModuloStatus } from '../../../shared/types/dtos';
import { extrairMensagemErroHttp } from '../../../shared/labels/notificacao.labels';
import { slugModuloGithub } from './github-modulo-routes';

@Component({
  selector: 'app-github-modulos-hub',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './github-modulos-hub.component.html',
})
export class GithubModulosHubComponent implements OnInit {
  private readonly githubService = inject(GithubIntegracaoService);
  private readonly toast = inject(ToastService);

  protected readonly loaderIcon = LoaderCircle;
  protected readonly settingsIcon = Settings2;

  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly modulos = signal<GithubIntegracaoModuloStatus[]>([]);
  readonly alternando = signal<string | null>(null);

  ngOnInit(): void {
    this.recarregar();
  }

  recarregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.githubService.obterHub().subscribe({
      next: (hub) => {
        this.modulos.set(hub.modulos ?? []);
        this.carregando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(extrairMensagemErroHttp(err, 'Não foi possível carregar os módulos.'));
        this.carregando.set(false);
      },
    });
  }

  rotaModulo(modulo: GithubIntegracaoModuloStatus): string | null {
    const slug = slugModuloGithub(modulo.codigo);
    if (!slug || !modulo.implementado) {
      return null;
    }
    return `/app/integracoes/github/modulos/${slug}/kanban`;
  }

  alternarHabilitado(modulo: GithubIntegracaoModuloStatus, event: Event): void {
    const input = event.target as HTMLInputElement;
    const novo = input.checked;
    this.alternando.set(modulo.codigo);
    this.githubService.patchModuloHabilitado(modulo.codigo, novo).subscribe({
      next: (atualizado) => {
        this.modulos.update((lista) =>
          lista.map((item) => (item.codigo === atualizado.codigo ? atualizado : item)),
        );
        this.alternando.set(null);
        this.toast.success(novo ? 'Módulo ativado' : 'Módulo desativado');
      },
      error: (err: HttpErrorResponse) => {
        this.alternando.set(null);
        this.toast.error('Erro', extrairMensagemErroHttp(err, 'Não foi possível atualizar o módulo.'));
      },
    });
  }

  estaAlternando(codigo: string): boolean {
    return this.alternando() === codigo;
  }
}
