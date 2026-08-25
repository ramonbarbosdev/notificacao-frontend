import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Check, Flag, LoaderCircle, LucideAngularModule } from 'lucide-angular';

import { AdminService } from '../../../core/http/admin.service';
import { FeatureFlagService } from '../../../core/services/feature-flag.service';
import { SidePanelComponent } from '../../../shared/components/side-panel/side-panel.component';
import { useSidePanel } from '../../../shared/helper/side-panel.state';
import { FeatureFlag, OrganizacaoAdminResponse, RecursoFeature } from '../../../shared/types/dtos';

type MotorWhatsapp = 'none' | 'WHATSAPP_GATEWAY' | 'WHATSAPP_META_CLOUD';

interface RecursoConfig {
  recurso: RecursoFeature;
  label: string;
  descricao: string;
}

@Component({
  selector: 'app-feature-flags',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, SidePanelComponent],
  templateUrl: './feature-flags.component.html',
})
export class FeatureFlagsComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly featureService = inject(FeatureFlagService);

  protected readonly flagIcon = Flag;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly checkIcon = Check;

  readonly recursosGerais: RecursoConfig[] = [
    { recurso: 'EMAIL', label: 'E-mail', descricao: 'Envio de notificacoes por e-mail.' },
    { recurso: 'TELEGRAM', label: 'Telegram', descricao: 'Canal Telegram para notificacoes.' },
    { recurso: 'WEBHOOK', label: 'Webhook', descricao: 'Entrega via HTTP callback.' },
    { recurso: 'TEMPLATES', label: 'Templates', descricao: 'Modelos reutilizaveis de mensagem.' },
    { recurso: 'API_PUBLICA', label: 'API publica', descricao: 'Integracao externa via API key.' },
    { recurso: 'ANALYTICS', label: 'Analytics', descricao: 'Metricas e relatorios avancados.' },
  ];

  readonly motoresWhatsapp: { valor: MotorWhatsapp; label: string; descricao: string }[] = [
    {
      valor: 'none',
      label: 'Nenhum',
      descricao: 'WhatsApp desabilitado para esta organizacao.',
    },
    {
      valor: 'WHATSAPP_GATEWAY',
      label: 'Gateway (Baileys)',
      descricao: 'Sessao propria via whatsapp-gateway.',
    },
    {
      valor: 'WHATSAPP_META_CLOUD',
      label: 'Cloud API (Meta)',
      descricao: 'WhatsApp Business via Embedded Signup.',
    },
  ];

  readonly panel = useSidePanel<OrganizacaoAdminResponse>();
  readonly organizacoes = signal<OrganizacaoAdminResponse[]>([]);
  readonly features = signal<Partial<Record<RecursoFeature, boolean>>>({});
  readonly motorWhatsapp = signal<MotorWhatsapp>('WHATSAPP_GATEWAY');
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly sucesso = signal<string | null>(null);

  readonly organizacaoAtual = computed(() => this.panel.item());

  ngOnInit(): void {
    this.adminService.listarOrganizacoes().subscribe({
      next: (orgs) => this.organizacoes.set(orgs),
      error: (err: HttpErrorResponse) => this.erro.set(this.mensagemErro(err, 'Erro ao listar organizacoes.')),
    });
  }

  abrirConfiguracao(org: OrganizacaoAdminResponse): void {
    this.erro.set(null);
    this.sucesso.set(null);
    this.features.set({});
    this.motorWhatsapp.set('WHATSAPP_GATEWAY');
    this.panel.abrir(org);
    this.carregarFeatures(org.idOrganizacao);
  }

  fecharPainel(): void {
    this.panel.fechar();
  }

  carregarFeatures(idOrganizacao: number): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.featureService.listarAdmin(idOrganizacao).subscribe({
      next: (features) => {
        const mapa = this.mapFeatures(features);
        this.features.set(mapa);
        this.motorWhatsapp.set(this.resolverMotorWhatsapp(mapa));
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

  definirMotorWhatsapp(motor: MotorWhatsapp): void {
    this.motorWhatsapp.set(motor);
    this.features.update((features) => ({
      ...features,
      WHATSAPP: false,
      WHATSAPP_GATEWAY: motor === 'WHATSAPP_GATEWAY',
      WHATSAPP_META_CLOUD: motor === 'WHATSAPP_META_CLOUD',
    }));
  }

  salvar(): void {
    const org = this.organizacaoAtual();
    if (!org) return;

    this.salvando.set(true);
    this.erro.set(null);
    this.sucesso.set(null);

    const payload = this.featuresParaSalvar();

    this.featureService.atualizarAdmin(org.idOrganizacao, { features: payload }).subscribe({
      next: (features) => {
        const mapa = this.mapFeatures(features);
        this.features.set(mapa);
        this.motorWhatsapp.set(this.resolverMotorWhatsapp(mapa));
        this.sucesso.set('Feature flags salvas.');
        this.salvando.set(false);
        this.panel.fechar();
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(this.mensagemErro(err, 'Erro ao salvar features.'));
        this.salvando.set(false);
      },
    });
  }

  private featuresParaSalvar(): Partial<Record<RecursoFeature, boolean>> {
    const motor = this.motorWhatsapp();
    return {
      ...this.features(),
      WHATSAPP: false,
      WHATSAPP_GATEWAY: motor === 'WHATSAPP_GATEWAY',
      WHATSAPP_META_CLOUD: motor === 'WHATSAPP_META_CLOUD',
    };
  }

  private resolverMotorWhatsapp(features: Partial<Record<RecursoFeature, boolean>>): MotorWhatsapp {
    if (features.WHATSAPP_META_CLOUD) return 'WHATSAPP_META_CLOUD';
    if (features.WHATSAPP_GATEWAY) return 'WHATSAPP_GATEWAY';
    if (features.WHATSAPP) return 'WHATSAPP_GATEWAY';
    return 'none';
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
