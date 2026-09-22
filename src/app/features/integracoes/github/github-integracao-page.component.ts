import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LoaderCircle, LucideAngularModule } from 'lucide-angular';
import { z } from 'zod';

import { GithubIntegracaoService } from '../../../core/services/github-integracao.service';
import { OrganizacaoConfiguracaoService } from '../../../core/services/organizacao-configuracao.service';
import { ToastService } from '../../../core/services/toast.service';
import { GithubTemplatePorCenario, OrganizacaoConfiguracao, OrganizacaoConfiguracaoRequest } from '../../../shared/types/dtos';
import { getZodFieldErrors } from '../../../shared/helper/zod-form.helper';
import { extrairMensagemErroHttp } from '../../../shared/labels/notificacao.labels';
import { ConfiguracoesGithubTabComponent } from '../../configuracoes/configuracoes-github-tab/configuracoes-github-tab.component';
import { validarDocumentoRegras } from '../../configuracoes/configuracoes-github-tab/github-regras-flow.util';
import { parseRegrasPorStatus } from '../../configuracoes/configuracoes-github-tab/github-regras-por-status.util';
import {
  GithubIntegracaoFormData,
  GithubIntegracaoFormErrors,
  githubIntegracaoFormSchema,
} from './schemas/github-integracao-form.schema';

@Component({
  selector: 'app-github-integracao-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ConfiguracoesGithubTabComponent],
  templateUrl: './github-integracao-page.component.html',
})
export class GithubIntegracaoPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly githubService = inject(GithubIntegracaoService);
  private readonly configService = inject(OrganizacaoConfiguracaoService);
  private readonly toast = inject(ToastService);

  protected readonly loaderIcon = LoaderCircle;

  @ViewChild(ConfiguracoesGithubTabComponent) private githubTab?: ConfiguracoesGithubTabComponent;

  readonly carregando = signal(true);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly errosFormulario = signal<GithubIntegracaoFormErrors>({});
  readonly githubTemplatesPorCenario = signal<Record<string, GithubTemplatePorCenario>>({});
  readonly graphqlTokenConfigurado = signal(false);
  readonly githubAppPrivateKeyConfigurado = signal(false);
  readonly featureHabilitada = signal(true);
  private orgConfigSnapshot: OrganizacaoConfiguracao | null = null;

  readonly form = this.fb.group({
    dsGithubFraseAtivacaoWhatsapp: [''],
    dsGithubStatusDisparo: [''],
    dsGithubStatusDisparoGatilhos: [''],
    dsGithubRegrasPorStatus: [''],
    webhookRegistrarFilaSemDestinatario: [true],
    dsGithubTemplateAssuntoWhatsapp: [''],
    dsGithubTemplateMensagemWhatsapp: [''],
    githubNaoNotificarMovimentador: [true],
    githubNotificarStatusAlterado: [true],
    githubNotificarTarefaCriada: [false],
    githubNotificarResponsavelAlterado: [false],
    githubNotificarTarefaAtribuida: [false],
    githubIgnorarSemResponsavel: [true],
    dsGithubDestinatariosModo: ['RESPONSAVEIS'],
    dsGithubDestinatariosExtras: [''],
    githubNotificarIssueFechadaReaberta: [false],
    githubNotificarIssueLabel: [false],
    githubNotificarSomenteCampoStatus: [false],
    githubNotificarReordenacao: [false],
    githubPrAvisarAvaliadores: [false],
    dsGithubPrStatusDisparo: [''],
    dsGithubPrLoginsAvaliadores: [''],
    githubIssueAvisarAvaliadores: [false],
    dsGithubIssueStatusDisparo: [''],
    dsGithubOrganizationLogin: [''],
    dsGithubProjectV2NodeId: [''],
    nuGithubProjectV2Number: [null as number | null],
    githubAppId: [null as number | null],
    githubAppPrivateKey: [''],
    githubInstallationId: [null as number | null],
    githubGraphqlUrl: [''],
    githubApiBaseUrl: [''],
    githubHttpConnectTimeoutMs: [null as number | null],
    githubHttpReadTimeoutMs: [null as number | null],
    githubInstallationTokenSkewSegundos: [null as number | null],
    githubGraphqlToken: [''],
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    forkJoin({
      hub: this.githubService.obterHub(),
      compartilhado: this.githubService.obterCompartilhado(),
      projects: this.githubService.obterProjectsV2(),
      org: this.configService.buscar(),
    }).subscribe({
      next: ({ hub, compartilhado, projects, org }) => {
        this.orgConfigSnapshot = org;
        this.featureHabilitada.set(hub.featureHabilitada);
        this.graphqlTokenConfigurado.set(compartilhado.githubGraphqlTokenConfigurado);
        this.githubAppPrivateKeyConfigurado.set(compartilhado.githubAppPrivateKeyConfigurado);
        this.githubTemplatesPorCenario.set(projects.githubTemplatesPorCenario ?? {});
        this.form.patchValue({
          dsGithubFraseAtivacaoWhatsapp: compartilhado.dsGithubFraseAtivacaoWhatsapp ?? '',
          dsGithubOrganizationLogin: compartilhado.dsGithubOrganizationLogin ?? '',
          githubAppId: compartilhado.githubAppId ?? null,
          githubInstallationId: compartilhado.githubInstallationId ?? null,
          githubGraphqlUrl: compartilhado.githubGraphqlUrl ?? '',
          githubApiBaseUrl: compartilhado.githubApiBaseUrl ?? '',
          githubHttpConnectTimeoutMs: compartilhado.githubHttpConnectTimeoutMs ?? null,
          githubHttpReadTimeoutMs: compartilhado.githubHttpReadTimeoutMs ?? null,
          githubInstallationTokenSkewSegundos: compartilhado.githubInstallationTokenSkewSegundos ?? null,
          githubGraphqlToken: '',
          githubAppPrivateKey: '',
          webhookRegistrarFilaSemDestinatario: org.webhookRegistrarFilaSemDestinatario ?? true,
          dsGithubProjectV2NodeId: projects.dsGithubProjectV2NodeId ?? '',
          nuGithubProjectV2Number: projects.nuGithubProjectV2Number ?? null,
          dsGithubStatusDisparo: projects.dsGithubStatusDisparo ?? '',
          dsGithubStatusDisparoGatilhos: projects.dsGithubStatusDisparoGatilhos ?? '',
          dsGithubRegrasPorStatus: projects.dsGithubRegrasPorStatus ?? '',
          dsGithubTemplateAssuntoWhatsapp: projects.dsGithubTemplateAssuntoWhatsapp ?? '',
          dsGithubTemplateMensagemWhatsapp: projects.dsGithubTemplateMensagemWhatsapp ?? '',
          githubNaoNotificarMovimentador: projects.githubNaoNotificarMovimentador ?? true,
          githubNotificarStatusAlterado: projects.githubNotificarStatusAlterado ?? true,
          githubNotificarTarefaCriada: projects.githubNotificarTarefaCriada ?? false,
          githubNotificarResponsavelAlterado: projects.githubNotificarResponsavelAlterado ?? false,
          githubNotificarTarefaAtribuida: projects.githubNotificarTarefaAtribuida ?? false,
          githubIgnorarSemResponsavel: projects.githubIgnorarSemResponsavel ?? true,
          dsGithubDestinatariosModo:
            projects.dsGithubDestinatariosModo === 'RESPONSAVEIS_E_MOVIMENTADOR'
            || projects.dsGithubDestinatariosModo === 'LOGINS_CONFIGURADOS'
              ? projects.dsGithubDestinatariosModo
              : 'RESPONSAVEIS',
          dsGithubDestinatariosExtras: projects.dsGithubDestinatariosExtras ?? '',
          githubNotificarIssueFechadaReaberta: projects.githubNotificarIssueFechadaReaberta ?? false,
          githubNotificarIssueLabel: projects.githubNotificarIssueLabel ?? false,
          githubNotificarSomenteCampoStatus: projects.githubNotificarSomenteCampoStatus ?? false,
          githubNotificarReordenacao: projects.githubNotificarReordenacao ?? false,
          githubPrAvisarAvaliadores: projects.githubPrAvisarAvaliadores ?? false,
          dsGithubPrStatusDisparo: projects.dsGithubPrStatusDisparo ?? '',
          dsGithubPrLoginsAvaliadores: projects.dsGithubPrLoginsAvaliadores ?? '',
          githubIssueAvisarAvaliadores: projects.githubIssueAvisarAvaliadores ?? false,
          dsGithubIssueStatusDisparo: projects.dsGithubIssueStatusDisparo ?? '',
        });
        this.form.markAsPristine();
        this.githubTab?.definirTemplatesPorCenario(this.githubTemplatesPorCenario());
        this.githubTab?.bloquearCamposConexaoAvancada();
        this.githubTab?.carregarGithubIntegracao();
        this.githubTab?.carregarVinculoKanban();
        this.carregando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(extrairMensagemErroHttp(err, 'Não foi possível carregar a integração GitHub.'));
        this.carregando.set(false);
      },
    });
  }

  onTemplatesPorCenarioChange(mapa: Record<string, GithubTemplatePorCenario>): void {
    this.githubTemplatesPorCenario.set({ ...mapa });
  }

  salvar(): void {
    this.githubTab?.sincronizarTemplateEditorNoFormulario();
    const resultado = githubIntegracaoFormSchema.safeParse(this.form.getRawValue());
    if (!resultado.success) {
      this.errosFormulario.set(getZodFieldErrors(resultado.error as z.ZodError<GithubIntegracaoFormData>));
      this.erro.set('Corrija os campos destacados antes de salvar.');
      return;
    }

    const rawRegras = String(this.form.get('dsGithubRegrasPorStatus')?.value ?? '');
    if (rawRegras.trim()) {
      const validacaoRegras = validarDocumentoRegras(parseRegrasPorStatus(rawRegras));
      if (!validacaoRegras.ok) {
        const nomes = validacaoRegras.colunasInvalidas.map((c) => c.nome).join(', ');
        this.erro.set(
          `No fluxograma, colunas com fluxo Geral precisam de template padrão ou cenário: ${nomes}.`,
        );
        this.toast.error('Regras GitHub incompletas', this.erro() ?? undefined);
        return;
      }
    }
    this.errosFormulario.set({});

    const dados = resultado.data;
    const appPrivateKeyDirty = this.form.controls.githubAppPrivateKey.dirty;
    const graphqlTokenDirty = this.form.controls.githubGraphqlToken.dirty;

    this.salvando.set(true);
    this.erro.set(null);

    const compartilhadoPatch = {
      dsGithubFraseAtivacaoWhatsapp: (dados.dsGithubFraseAtivacaoWhatsapp ?? '').trim(),
      dsGithubOrganizationLogin: (dados.dsGithubOrganizationLogin ?? '').trim() || null,
      githubAppId: dados.githubAppId != null && dados.githubAppId > 0 ? dados.githubAppId : null,
      githubInstallationId:
        dados.githubInstallationId != null && dados.githubInstallationId > 0 ? dados.githubInstallationId : null,
      githubGraphqlUrl: dados.githubGraphqlUrl?.trim() || null,
      githubApiBaseUrl: dados.githubApiBaseUrl?.trim() || null,
      githubHttpConnectTimeoutMs: dados.githubHttpConnectTimeoutMs ?? null,
      githubHttpReadTimeoutMs: dados.githubHttpReadTimeoutMs ?? null,
      githubInstallationTokenSkewSegundos: dados.githubInstallationTokenSkewSegundos ?? null,
      ...(graphqlTokenDirty ? { githubGraphqlToken: dados.githubGraphqlToken?.trim() ?? '' } : {}),
      ...(appPrivateKeyDirty ? { githubAppPrivateKey: dados.githubAppPrivateKey?.trim() ?? '' } : {}),
    };

    const projectsPatch = {
      dsGithubProjectV2NodeId: (dados.dsGithubProjectV2NodeId ?? '').trim() || null,
      nuGithubProjectV2Number:
        dados.nuGithubProjectV2Number != null && dados.nuGithubProjectV2Number > 0
          ? dados.nuGithubProjectV2Number
          : null,
      dsGithubStatusDisparo: (dados.dsGithubStatusDisparo ?? '').trim() || null,
      dsGithubStatusDisparoGatilhos: (dados.dsGithubStatusDisparoGatilhos ?? '').trim() || null,
      dsGithubRegrasPorStatus: (dados.dsGithubRegrasPorStatus ?? '').trim() || null,
      dsGithubTemplateAssuntoWhatsapp: (dados.dsGithubTemplateAssuntoWhatsapp ?? '').trim() || null,
      dsGithubTemplateMensagemWhatsapp: (dados.dsGithubTemplateMensagemWhatsapp ?? '').trim() || null,
      githubTemplatesPorCenario: this.githubTab?.obterTemplatesPorCenarioParaSalvar()
        ?? this.githubTemplatesPorCenario(),
      githubNaoNotificarMovimentador: dados.githubNaoNotificarMovimentador,
      githubNotificarStatusAlterado: dados.githubNotificarStatusAlterado,
      githubNotificarTarefaCriada: dados.githubNotificarTarefaCriada,
      githubNotificarResponsavelAlterado: dados.githubNotificarResponsavelAlterado,
      githubNotificarTarefaAtribuida: dados.githubNotificarTarefaAtribuida,
      githubIgnorarSemResponsavel: dados.githubIgnorarSemResponsavel,
      dsGithubDestinatariosModo: dados.dsGithubDestinatariosModo,
      dsGithubDestinatariosExtras: (dados.dsGithubDestinatariosExtras ?? '').trim() || null,
      githubNotificarIssueFechadaReaberta: dados.githubNotificarIssueFechadaReaberta,
      githubNotificarIssueLabel: dados.githubNotificarIssueLabel,
      githubNotificarSomenteCampoStatus: dados.githubNotificarSomenteCampoStatus,
      githubNotificarReordenacao: dados.githubNotificarReordenacao,
      githubPrAvisarAvaliadores: dados.githubPrAvisarAvaliadores,
      dsGithubPrStatusDisparo: (dados.dsGithubPrStatusDisparo ?? '').trim() || null,
      dsGithubPrLoginsAvaliadores: (dados.dsGithubPrLoginsAvaliadores ?? '').trim() || null,
      githubIssueAvisarAvaliadores: dados.githubIssueAvisarAvaliadores,
      dsGithubIssueStatusDisparo: (dados.dsGithubIssueStatusDisparo ?? '').trim() || null,
    };

    forkJoin({
      compartilhado: this.githubService.patchCompartilhado(compartilhadoPatch),
      projects: this.githubService.patchProjectsV2(projectsPatch),
      org: this.configService.atualizar(
        this.montarOrgConfigRequest(dados.webhookRegistrarFilaSemDestinatario),
      ),
    }).subscribe({
      next: (res) => {
        this.graphqlTokenConfigurado.set(res.compartilhado.githubGraphqlTokenConfigurado);
        this.githubAppPrivateKeyConfigurado.set(res.compartilhado.githubAppPrivateKeyConfigurado);
        this.githubTemplatesPorCenario.set(res.projects.githubTemplatesPorCenario ?? {});
        this.form.patchValue({ githubGraphqlToken: '', githubAppPrivateKey: '' });
        this.form.markAsPristine();
        this.githubTab?.definirTemplatesPorCenario(this.githubTemplatesPorCenario());
        this.githubTab?.bloquearCamposConexaoAvancada();
        this.toast.success('Integração GitHub salva');
        this.salvando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(extrairMensagemErroHttp(err, 'Não foi possível salvar.'));
        this.toast.error('Erro ao salvar', this.erro() ?? undefined);
        this.salvando.set(false);
      },
    });
  }

  private montarOrgConfigRequest(webhookRegistrarFilaSemDestinatario: boolean): OrganizacaoConfiguracaoRequest {
    const c = this.orgConfigSnapshot;
    if (!c) {
      throw new Error('Configuração da organização não carregada.');
    }
    return {
      nmExibicao: c.nmExibicao,
      dsLogoUrl: c.dsLogoUrl,
      dsIdioma: c.dsIdioma,
      timezone: c.timezone,
      nuTelefoneOperacional: c.nuTelefoneOperacional,
      dsEmailOperacional: c.dsEmailOperacional,
      dsEmailAlertas: c.dsEmailAlertas,
      whatsappReconexaoAutomatica: c.whatsappReconexaoAutomatica,
      whatsappDelayMinSegundos: c.whatsappDelayMinSegundos,
      whatsappDelayMaxSegundos: c.whatsappDelayMaxSegundos,
      whatsappSimularDigitando: c.whatsappSimularDigitando,
      whatsappLimitePorMinuto: c.whatsappLimitePorMinuto,
      whatsappLimitePorDia: c.whatsappLimitePorDia,
      whatsappModoEnvio: c.whatsappModoEnvio,
      templatesVersionamento: c.templatesVersionamento,
      templatesExigirAprovacao: c.templatesExigirAprovacao,
      templatesValidarVariaveis: c.templatesValidarVariaveis,
      retryAutomatico: c.retryAutomatico,
      retryTentativas: c.retryTentativas,
      retryIntervaloSegundos: c.retryIntervaloSegundos,
      prioridadePadrao: c.prioridadePadrao,
      expiracaoFilaHoras: c.expiracaoFilaHoras,
      auditoriaHabilitada: c.auditoriaHabilitada,
      webhookInboundUrl: c.webhookInboundUrl,
      webhookInboundHabilitado: c.webhookInboundHabilitado,
      webhookRegistrarFilaSemDestinatario,
    };
  }
}
