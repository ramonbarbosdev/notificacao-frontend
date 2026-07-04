import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Check, Flag, LoaderCircle, LucideAngularModule } from 'lucide-angular';

import { AdminService } from '../../../core/http/admin.service';
import { FeatureFlagService } from '../../../core/services/feature-flag.service';
import { FeatureFlag, OrganizacaoAdminResponse, RecursoFeature } from '../../../shared/types/dtos';

@Component({
  selector: 'app-feature-flags',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './feature-flags.component.html',
})
export class FeatureFlagsComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly featureService = inject(FeatureFlagService);

  protected readonly flagIcon = Flag;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly checkIcon = Check;

  readonly recursos: RecursoFeature[] = ['WHATSAPP', 'EMAIL', 'TELEGRAM', 'WEBHOOK', 'TEMPLATES', 'API_PUBLICA', 'ANALYTICS'];
  readonly organizacoes = signal<OrganizacaoAdminResponse[]>([]);
  readonly idOrganizacao = signal<number | null>(null);
  readonly features = signal<Partial<Record<RecursoFeature, boolean>>>({});
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly sucesso = signal<string | null>(null);

  ngOnInit(): void {
    this.adminService.listarOrganizacoes().subscribe({
      next: (orgs) => this.organizacoes.set(orgs),
      error: (err: HttpErrorResponse) => this.erro.set(this.mensagemErro(err, 'Erro ao listar organizacoes.')),
    });
  }

  selecionarOrganizacao(event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    this.idOrganizacao.set(id || null);
    this.features.set({});
    if (id) this.carregarFeatures(id);
  }

  carregarFeatures(idOrganizacao: number): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.featureService.listarAdmin(idOrganizacao).subscribe({
      next: (features) => {
        this.features.set(this.mapFeatures(features));
        this.carregando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(this.mensagemErro(err, 'Erro ao carregar features.'));
        this.carregando.set(false);
      },
    });
  }

  alternar(recurso: RecursoFeature): void {
    this.features.update((features) => ({ ...features, [recurso]: !features[recurso] }));
  }

  salvar(): void {
    const id = this.idOrganizacao();
    if (!id) return;

    this.salvando.set(true);
    this.erro.set(null);
    this.sucesso.set(null);

    this.featureService.atualizarAdmin(id, { features: this.features() }).subscribe({
      next: (features) => {
        this.features.set(this.mapFeatures(features));
        this.sucesso.set('Feature flags salvas.');
        this.salvando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(this.mensagemErro(err, 'Erro ao salvar features.'));
        this.salvando.set(false);
      },
    });
  }

  private mapFeatures(features: FeatureFlag[]): Partial<Record<RecursoFeature, boolean>> {
    return features.reduce((acc, feature) => {
      acc[feature.recurso] = feature.habilitado;
      return acc;
    }, {} as Partial<Record<RecursoFeature, boolean>>);
  }

  private mensagemErro(err: HttpErrorResponse, fallback: string): string {
    if (err.status === 403) return 'Voce nao tem permissao para executar esta acao.';
    return err.error?.mensagem ?? err.error?.erro ?? err.error?.message ?? fallback;
  }
}
