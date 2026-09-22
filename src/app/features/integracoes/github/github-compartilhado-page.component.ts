import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { LoaderCircle, LucideAngularModule } from 'lucide-angular';
import { z } from 'zod';

import { GithubIntegracaoService } from '../../../core/services/github-integracao.service';
import { OrganizacaoConfiguracaoService } from '../../../core/services/organizacao-configuracao.service';
import { ToastService } from '../../../core/services/toast.service';
import { OrganizacaoConfiguracao } from '../../../shared/types/dtos';
import { getZodFieldErrors } from '../../../shared/helper/zod-form.helper';
import { extrairMensagemErroHttp } from '../../../shared/labels/notificacao.labels';
import {
  ConfiguracoesGithubTabComponent,
  GithubSubAba,
} from '../../configuracoes/configuracoes-github-tab/configuracoes-github-tab.component';
import {
  GithubIntegracaoFormData,
  GithubIntegracaoFormErrors,
  githubIntegracaoFormSchema,
} from './schemas/github-integracao-form.schema';
import { montarOrgConfigRequestSnapshot } from './github-org-config-snapshot.util';

const SECOES_COMPARTILHADO: GithubSubAba[] = ['conexao', 'equipe', 'habilitados', 'eventos'];

@Component({
  selector: 'app-github-compartilhado-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ConfiguracoesGithubTabComponent],
  templateUrl: './github-compartilhado-page.component.html',
})
export class GithubCompartilhadoPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly githubService = inject(GithubIntegracaoService);
  private readonly configService = inject(OrganizacaoConfiguracaoService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loaderIcon = LoaderCircle;

  @ViewChild(ConfiguracoesGithubTabComponent) private githubTab?: ConfiguracoesGithubTabComponent;

  readonly carregando = signal(true);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly errosFormulario = signal<GithubIntegracaoFormErrors>({});
  readonly graphqlTokenConfigurado = signal(false);
  readonly githubAppPrivateKeyConfigurado = signal(false);
  private orgConfigSnapshot: OrganizacaoConfiguracao | null = null;

  readonly secao = toSignal(
    this.route.paramMap.pipe(
      map((params) => {
        const raw = params.get('secao') as GithubSubAba | null;
        if (raw && SECOES_COMPARTILHADO.includes(raw)) {
          return raw;
        }
        return 'conexao';
      }),
    ),
    { initialValue: 'conexao' as GithubSubAba },
  );

  readonly form = this.fb.group({
    dsGithubFraseAtivacaoWhatsapp: [''],
    dsGithubOrganizationLogin: [''],
    webhookRegistrarFilaSemDestinatario: [true],
    githubAppId: [null as number | null],
    githubAppPrivateKey: [''],
    githubInstallationId: [null as number | null],
    githubGraphqlUrl: [''],
    githubApiBaseUrl: [''],
    githubHttpConnectTimeoutMs: [null as number | null],
    githubHttpReadTimeoutMs: [null as number | null],
    githubInstallationTokenSkewSegundos: [null as number | null],
    githubGraphqlToken: [''],
    dsGithubProjectV2NodeId: [''],
    nuGithubProjectV2Number: [null as number | null],
  });

  ngOnInit(): void {
    const secao = this.route.snapshot.paramMap.get('secao');
    if (secao && !SECOES_COMPARTILHADO.includes(secao as GithubSubAba)) {
      void this.router.navigate(['/app/integracoes/github/compartilhado/conexao'], { replaceUrl: true });
    }
    this.carregar();
  }

  navegarSecao(secao: GithubSubAba): void {
    void this.router.navigate(['/app/integracoes/github/compartilhado', secao]);
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    forkJoin({
      compartilhado: this.githubService.obterCompartilhado(),
      org: this.configService.buscar(),
    }).subscribe({
      next: ({ compartilhado, org }) => {
        this.orgConfigSnapshot = org;
        this.graphqlTokenConfigurado.set(compartilhado.githubGraphqlTokenConfigurado);
        this.githubAppPrivateKeyConfigurado.set(compartilhado.githubAppPrivateKeyConfigurado);
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
        });
        this.form.markAsPristine();
        this.githubTab?.bloquearCamposConexaoAvancada();
        this.githubTab?.carregarGithubIntegracao();
        this.carregando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(extrairMensagemErroHttp(err, 'Não foi possível carregar a integração.'));
        this.carregando.set(false);
      },
    });
  }

  salvar(): void {
    const resultado = githubIntegracaoFormSchema.safeParse(this.form.getRawValue());
    if (!resultado.success) {
      this.errosFormulario.set(getZodFieldErrors(resultado.error as z.ZodError<GithubIntegracaoFormData>));
      this.erro.set('Corrija os campos destacados antes de salvar.');
      return;
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

    const org = this.orgConfigSnapshot;
    if (!org) {
      this.erro.set('Configuração da organização não carregada.');
      this.salvando.set(false);
      return;
    }

    forkJoin({
      compartilhado: this.githubService.patchCompartilhado(compartilhadoPatch),
      org: this.configService.atualizar(
        montarOrgConfigRequestSnapshot(org, dados.webhookRegistrarFilaSemDestinatario ?? true),
      ),
    }).subscribe({
      next: (res) => {
        this.orgConfigSnapshot = res.org;
        this.graphqlTokenConfigurado.set(res.compartilhado.githubGraphqlTokenConfigurado);
        this.githubAppPrivateKeyConfigurado.set(res.compartilhado.githubAppPrivateKeyConfigurado);
        this.form.patchValue({ githubGraphqlToken: '', githubAppPrivateKey: '' });
        this.form.markAsPristine();
        this.githubTab?.bloquearCamposConexaoAvancada();
        this.toast.success('Configuração compartilhada salva');
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
