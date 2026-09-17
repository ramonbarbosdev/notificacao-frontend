import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LoaderCircle, LucideAngularModule, PencilLine } from 'lucide-angular';

import { GithubIntegracaoService } from '../../../core/services/github-integracao.service';
import { ToastService } from '../../../core/services/toast.service';
import { GithubResponsavel, GithubWebhookIntegracaoResponse } from '../../../shared/types/dtos';
import { formatDateTimePtBr } from '../../../shared/helper/date.utils';
import { FormFieldComponent } from '../../../shared/components/forms/form-field/app-form-field';
import {
  FRASE_ATIVACAO_GITHUB_PADRAO,
  GITHUB_DEFAULT_API_BASE_URL,
  GITHUB_DEFAULT_CONNECT_TIMEOUT_MS,
  GITHUB_DEFAULT_GRAPHQL_URL,
  GITHUB_DEFAULT_INSTALLATION_TOKEN_SKEW_SEGUNDOS,
  GITHUB_DEFAULT_READ_TIMEOUT_MS,
  OrganizacaoConfiguracaoFormData,
  OrganizacaoConfiguracaoFormErrors,
} from '../schemas/organizacao-configuracao-form.schema';
import {
  GithubWhatsappTemplateAplicado,
  GithubWhatsappTemplateModalComponent,
} from '../github-whatsapp-template-modal/github-whatsapp-template-modal.component';

export type GithubSubAba = 'conexao' | 'equipe' | 'habilitados' | 'regras' | 'mensagem';

@Component({
  selector: 'app-configuracoes-github-tab',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
    FormFieldComponent,
    GithubWhatsappTemplateModalComponent,
  ],
  templateUrl: './configuracoes-github-tab.component.html',
})
export class ConfiguracoesGithubTabComponent implements OnInit {
  private readonly githubIntegracaoService = inject(GithubIntegracaoService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) errosFormulario: OrganizacaoConfiguracaoFormErrors = {};
  readonly graphqlTokenConfigurado = input(false);
  readonly githubAppPrivateKeyConfigurado = input(false);

  readonly githubDefaultGraphqlUrl = GITHUB_DEFAULT_GRAPHQL_URL;
  readonly githubDefaultApiBaseUrl = GITHUB_DEFAULT_API_BASE_URL;
  readonly githubDefaultConnectTimeoutMs = GITHUB_DEFAULT_CONNECT_TIMEOUT_MS;
  readonly githubDefaultReadTimeoutMs = GITHUB_DEFAULT_READ_TIMEOUT_MS;
  readonly githubDefaultInstallationTokenSkewSegundos = GITHUB_DEFAULT_INSTALLATION_TOKEN_SKEW_SEGUNDOS;

  protected readonly loaderIcon = LoaderCircle;
  protected readonly editTemplateIcon = PencilLine;

  readonly githubSubAba = signal<GithubSubAba>('conexao');
  readonly githubIntegracao = signal<GithubWebhookIntegracaoResponse | null>(null);
  readonly carregandoGithubIntegracao = signal(false);
  readonly responsaveisGithub = signal<GithubResponsavel[]>([]);
  readonly carregandoResponsaveis = signal(false);
  readonly erroResponsaveis = signal<string | null>(null);
  readonly modalTemplateGithubAberto = signal(false);

  readonly responsaveisHabilitados = computed(() =>
    this.responsaveisGithub().filter((item) => item.habilitado));
  readonly responsaveisPendentes = computed(() =>
    this.responsaveisGithub().filter((item) => item.ativo && !item.habilitado));

  readonly fraseAtivacaoGithubPadrao = FRASE_ATIVACAO_GITHUB_PADRAO;

  readonly subAbas: { id: GithubSubAba; label: string }[] = [
    { id: 'conexao', label: 'Conexão' },
    { id: 'equipe', label: 'Equipe' },
    { id: 'habilitados', label: 'Habilitados' },
    { id: 'regras', label: 'Regras' },
    { id: 'mensagem', label: 'Mensagem' },
  ];

  readonly formatarData = formatDateTimePtBr;

  private static readonly CAMPOS_CONEXAO_SOMENTE_LEITURA: (keyof OrganizacaoConfiguracaoFormData)[] = [
    'githubGraphqlUrl',
    'githubApiBaseUrl',
    'githubHttpConnectTimeoutMs',
    'githubHttpReadTimeoutMs',
    'githubInstallationTokenSkewSegundos',
    'githubGraphqlToken',
  ];

  ngOnInit(): void {
    const secao = this.route.snapshot.queryParamMap.get('githubSecao');
    if (
      secao === 'conexao'
      || secao === 'equipe'
      || secao === 'habilitados'
      || secao === 'regras'
      || secao === 'mensagem'
    ) {
      this.githubSubAba.set(secao);
    }
    this.bloquearCamposConexaoAvancada();
    this.carregarGithubIntegracao();
    if (this.githubSubAba() === 'habilitados') {
      this.carregarResponsaveisGithub();
    }
  }

  bloquearCamposConexaoAvancada(): void {
    for (const campo of ConfiguracoesGithubTabComponent.CAMPOS_CONEXAO_SOMENTE_LEITURA) {
      this.form.get(campo)?.disable({ emitEvent: false });
    }
  }

  selecionarSubAba(id: GithubSubAba): void {
    this.githubSubAba.set(id);
    if (id === 'habilitados') {
      this.carregarResponsaveisGithub();
    }
  }

  carregarResponsaveisGithub(): void {
    this.carregandoResponsaveis.set(true);
    this.erroResponsaveis.set(null);
    this.githubIntegracaoService.listarResponsaveis().subscribe({
      next: (lista) => {
        this.responsaveisGithub.set(lista);
        this.carregandoResponsaveis.set(false);
      },
      error: () => {
        this.responsaveisGithub.set([]);
        this.erroResponsaveis.set('Não foi possível carregar a lista de habilitados.');
        this.carregandoResponsaveis.set(false);
      },
    });
  }

  carregarGithubIntegracao(): void {
    this.carregandoGithubIntegracao.set(true);
    this.githubIntegracaoService.buscarInstrucoesWebhook().subscribe({
      next: (info) => {
        this.githubIntegracao.set(info);
        this.carregandoGithubIntegracao.set(false);
      },
      error: () => {
        this.githubIntegracao.set(null);
        this.carregandoGithubIntegracao.set(false);
      },
    });
  }

  urlWebhookGithubAbsoluta(): string | null {
    const info = this.githubIntegracao();
    if (!info?.webhookUrlTemplate) return null;
    return this.githubIntegracaoService.montarUrlWebhookAbsoluta(info.webhookUrlTemplate);
  }

  abrirEditorTemplateGithub(): void {
    this.modalTemplateGithubAberto.set(true);
    if (!this.githubIntegracao() && !this.carregandoGithubIntegracao()) {
      this.carregarGithubIntegracao();
    }
  }

  fecharEditorTemplateGithub(): void {
    this.modalTemplateGithubAberto.set(false);
  }

  aplicarTemplateGithub(dados: GithubWhatsappTemplateAplicado): void {
    this.form.patchValue({
      dsGithubTemplateAssuntoWhatsapp: dados.assunto,
      dsGithubTemplateMensagemWhatsapp: dados.mensagem,
    });
    this.form.markAsDirty();
    this.toast.success('Template aplicado — salve as configurações');
  }

  resumoGithubTemplateAssunto(): string {
    const valor = (this.form.get('dsGithubTemplateAssuntoWhatsapp')?.value ?? '').trim();
    if (valor) {
      return this.truncarResumo(valor, 120);
    }
    const padrao = this.githubIntegracao()?.templateAssuntoPadrao;
    return padrao ? `(padrão) ${this.truncarResumo(padrao, 100)}` : 'Usando padrão da API';
  }

  resumoGithubTemplateMensagem(): string {
    const valor = (this.form.get('dsGithubTemplateMensagemWhatsapp')?.value ?? '').trim();
    if (valor) {
      return this.truncarResumo(valor, 280);
    }
    const padrao = this.githubIntegracao()?.templateMensagemPadrao;
    return padrao ? `(padrão) ${this.truncarResumo(padrao, 240)}` : 'Usando padrão da API';
  }

  destinatariosGithubModoLoginsConfigurados(): boolean {
    return this.form.get('dsGithubDestinatariosModo')?.value === 'LOGINS_CONFIGURADOS';
  }

  campoErro(campo: keyof OrganizacaoConfiguracaoFormData): string | null {
    return this.errosFormulario[campo] ?? null;
  }

  copiarTexto(texto: string, mensagemSucesso = 'Copiado'): void {
    navigator.clipboard.writeText(texto).then(
      () => this.toast.success(mensagemSucesso),
      () => this.toast.error('Não foi possível copiar'),
    );
  }

  private truncarResumo(texto: string, max: number): string {
    const normalizado = texto.replace(/\s+/g, ' ').trim();
    if (normalizado.length <= max) {
      return normalizado;
    }
    return normalizado.slice(0, max - 1) + '…';
  }
}
