import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { LoaderCircle, LucideAngularModule } from 'lucide-angular';
import { z } from 'zod';

import { GithubIntegracaoService } from '../../../core/services/github-integracao.service';
import { ToastService } from '../../../core/services/toast.service';
import { GithubTemplatePorCenario } from '../../../shared/types/dtos';
import { getZodFieldErrors } from '../../../shared/helper/zod-form.helper';
import { extrairMensagemErroHttp } from '../../../shared/labels/notificacao.labels';
import {
  ConfiguracoesGithubTabComponent,
  GithubSubAba,
} from '../../configuracoes/configuracoes-github-tab/configuracoes-github-tab.component';
import { validarDocumentoRegras } from '../../configuracoes/configuracoes-github-tab/github-regras-flow.util';
import { parseRegrasPorStatus } from '../../configuracoes/configuracoes-github-tab/github-regras-por-status.util';
import {
  GithubIntegracaoFormData,
  GithubIntegracaoFormErrors,
  githubIntegracaoFormSchema,
} from './schemas/github-integracao-form.schema';

const SECOES_MODULO: GithubSubAba[] = ['kanban', 'regras', 'mensagem'];

@Component({
  selector: 'app-github-projects-v2-modulo-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    LucideAngularModule,
    ConfiguracoesGithubTabComponent,
  ],
  templateUrl: './github-projects-v2-modulo-page.component.html',
})
export class GithubProjectsV2ModuloPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly githubService = inject(GithubIntegracaoService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loaderIcon = LoaderCircle;

  @ViewChild(ConfiguracoesGithubTabComponent) private githubTab?: ConfiguracoesGithubTabComponent;

  readonly carregando = signal(true);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly errosFormulario = signal<GithubIntegracaoFormErrors>({});
  readonly githubTemplatesPorCenario = signal<Record<string, GithubTemplatePorCenario>>({});
  readonly moduloHabilitado = signal(true);
  readonly graphqlTokenConfigurado = signal(false);
  readonly githubAppPrivateKeyConfigurado = signal(false);

  readonly secao = toSignal(
    this.route.paramMap.pipe(
      map((params) => {
        const raw = params.get('secao') as GithubSubAba | null;
        if (raw && SECOES_MODULO.includes(raw)) {
          return raw;
        }
        return 'kanban';
      }),
    ),
    { initialValue: 'kanban' as GithubSubAba },
  );

  readonly form = this.fb.group({
    dsGithubFraseAtivacaoWhatsapp: [''],
    dsGithubOrganizationLogin: [''],
    dsGithubStatusDisparo: [''],
    dsGithubStatusDisparoGatilhos: [''],
    dsGithubRegrasPorStatus: [''],
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
    webhookRegistrarFilaSemDestinatario: [true],
  });

  ngOnInit(): void {
    const secao = this.route.snapshot.paramMap.get('secao');
    if (secao && !SECOES_MODULO.includes(secao as GithubSubAba)) {
      void this.router.navigate(['/app/integracoes/github/modulos/projects-v2/kanban'], { replaceUrl: true });
    }
    this.carregar();
  }

  navegarSecao(secao: GithubSubAba): void {
    void this.router.navigate(['/app/integracoes/github/modulos/projects-v2', secao]);
  }

  onTemplatesPorCenarioChange(mapa: Record<string, GithubTemplatePorCenario>): void {
    this.githubTemplatesPorCenario.set({ ...mapa });
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    forkJoin({
      compartilhado: this.githubService.obterCompartilhado(),
      projects: this.githubService.obterProjectsV2(),
    }).subscribe({
      next: ({ compartilhado, projects }) => {
        this.moduloHabilitado.set(projects.habilitado);
        this.graphqlTokenConfigurado.set(compartilhado.githubGraphqlTokenConfigurado);
        this.githubAppPrivateKeyConfigurado.set(compartilhado.githubAppPrivateKeyConfigurado);
        this.githubTemplatesPorCenario.set(projects.githubTemplatesPorCenario ?? {});
        this.form.patchValue({
          dsGithubOrganizationLogin: compartilhado.dsGithubOrganizationLogin ?? '',
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
        this.githubTab?.carregarGithubIntegracao();
        this.githubTab?.carregarVinculoKanban();
        this.carregando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(extrairMensagemErroHttp(err, 'Não foi possível carregar o módulo.'));
        this.carregando.set(false);
      },
    });
  }

  salvar(): void {
    this.githubTab?.sincronizarRegrasFluxoNoFormulario();
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
        this.toast.error('Regras incompletas', this.erro() ?? undefined);
        return;
      }
    }
    this.errosFormulario.set({});
    const dados = resultado.data;

    this.salvando.set(true);
    this.erro.set(null);

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

    this.githubService.patchProjectsV2(projectsPatch).subscribe({
      next: (res) => {
        this.moduloHabilitado.set(res.habilitado);
        this.githubTemplatesPorCenario.set(res.githubTemplatesPorCenario ?? {});
        this.form.markAsPristine();
        this.githubTab?.definirTemplatesPorCenario(this.githubTemplatesPorCenario());
        this.toast.success('Módulo Project v2 salvo');
        this.salvando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(extrairMensagemErroHttp(err, 'Não foi possível salvar.'));
        this.toast.error('Erro ao salvar', this.erro() ?? undefined);
        this.salvando.set(false);
      },
    });
  }
}
