import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LoaderCircle, LucideAngularModule, PencilLine } from 'lucide-angular';

import { GithubIntegracaoService } from '../../../core/services/github-integracao.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  GithubGraphqlConsultaResponse,
  GithubResponsavel,
  GithubWebhookIntegracaoResponse,
} from '../../../shared/types/dtos';
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
  readonly salvarSolicitado = output<void>();

  private readonly templateModal = viewChild(GithubWhatsappTemplateModalComponent);

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
  readonly graphqlNodeId = signal('');
  readonly graphqlContentType = signal('Issue');
  readonly graphqlConsulta = signal<GithubGraphqlConsultaResponse | null>(null);
  readonly carregandoGraphqlConsulta = signal(false);
  readonly modalTemplateGithubAberto = signal(false);

  readonly responsaveisHabilitados = computed(() =>
    this.responsaveisGithub().filter((item) => item.habilitado));
  readonly responsaveisPendentes = computed(() =>
    this.responsaveisGithub().filter((item) => item.ativo && !item.habilitado));

  /** Logins GitHub persistidos em organizacao_github_responsavel (para sugestões em Regras). */
  readonly loginsGithubSugeridos = computed(() => {
    const porLogin = new Map<string, { login: string; habilitado: boolean }>();
    for (const item of this.responsaveisGithub()) {
      const login = item.githubLogin?.trim();
      if (!login) {
        continue;
      }
      const chave = login.toLowerCase();
      const existente = porLogin.get(chave);
      if (!existente) {
        porLogin.set(chave, { login, habilitado: item.habilitado });
      } else if (item.habilitado) {
        porLogin.set(chave, { ...existente, habilitado: true });
      }
    }
    return [...porLogin.values()].sort((a, b) => {
      if (a.habilitado !== b.habilitado) {
        return a.habilitado ? -1 : 1;
      }
      return a.login.localeCompare(b.login, 'pt-BR', { sensitivity: 'base' });
    });
  });

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
    if (this.githubSubAba() === 'habilitados' || this.githubSubAba() === 'regras') {
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
    if (id === 'habilitados' || id === 'regras') {
      this.carregarResponsaveisGithub();
    }
  }

  consultarGraphqlOrganizacao(): void {
    const nodeId = this.graphqlNodeId().trim();
    if (!nodeId) {
      this.toast.error('Informe o content_node_id do card');
      return;
    }
    this.carregandoGraphqlConsulta.set(true);
    this.graphqlConsulta.set(null);
    const contentType = this.graphqlContentType().trim();
    this.githubIntegracaoService
      .consultarGraphql({
        nodeId,
        contentType: contentType || null,
      })
      .subscribe({
        next: (resposta) => {
          this.graphqlConsulta.set(resposta);
          this.carregandoGraphqlConsulta.set(false);
        },
        error: () => {
          this.graphqlConsulta.set(null);
          this.carregandoGraphqlConsulta.set(false);
          this.toast.error('Falha ao consultar GraphQL');
        },
      });
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

  /** Copia assunto/mensagem do editor aberto para o FormGroup antes do PUT. */
  sincronizarTemplateEditorNoFormulario(): void {
    if (!this.modalTemplateGithubAberto()) {
      return;
    }
    const modal = this.templateModal();
    if (!modal) {
      return;
    }
    const dados = modal.valoresAtuais();
    this.form.patchValue({
      dsGithubTemplateAssuntoWhatsapp: dados.assunto,
      dsGithubTemplateMensagemWhatsapp: dados.mensagem,
    });
    this.form.markAsDirty();
  }

  onSalvarTemplateNoServidor(dados: GithubWhatsappTemplateAplicado): void {
    this.form.patchValue({
      dsGithubTemplateAssuntoWhatsapp: dados.assunto,
      dsGithubTemplateMensagemWhatsapp: dados.mensagem,
    });
    this.form.markAsDirty();
    this.salvarSolicitado.emit();
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

  loginJaNoCampo(campo: string, login: string): boolean {
    const raw = (this.form.get(campo)?.value ?? '') as string;
    return this.loginsDoCampo(raw).has(login.trim().toLowerCase());
  }

  adicionarLoginSugerido(campo: string, login: string): void {
    const control = this.form.get(campo);
    if (!control) {
      return;
    }
    const normalizado = login.trim();
    if (!normalizado || this.loginJaNoCampo(campo, normalizado)) {
      return;
    }
    const atual = String(control.value ?? '').trim();
    control.setValue(atual ? `${atual}, ${normalizado}` : normalizado);
    control.markAsDirty();
  }

  private loginsDoCampo(raw: string): Set<string> {
    const set = new Set<string>();
    for (const parte of raw.split(/[,;]+/)) {
      const login = parte.trim();
      if (login) {
        set.add(login.toLowerCase());
      }
    }
    return set;
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
