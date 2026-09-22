import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  Bell,
  Copy,
  LayoutGrid,
  Link2,
  LoaderCircle,
  LucideAngularModule,
  LucideIconData,
  MessageSquare,
  PencilLine,
  ScrollText,
  UserCheck,
  Users,
} from 'lucide-angular';

import { GithubIntegracaoService } from '../../../core/services/github-integracao.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  GithubGraphqlConsultaResponse,
  GithubProjectV2ListaResponse,
  GithubProjectV2Resumo,
  GithubProjectV2StatusOpcao,
  GithubProjectV2VinculoResponse,
  GithubResponsavel,
  GithubTemplatePorCenario,
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
} from '../../integracoes/github/schemas/github-integracao-form.schema';
import {
  GithubWhatsappTemplateAplicado,
  GithubWhatsappTemplateModalComponent,
} from '../github-whatsapp-template-modal/github-whatsapp-template-modal.component';
import {
  GithubIntegracaoStatusItem,
  GithubIntegracaoStatusStripComponent,
} from './components/github-integracao-status-strip.component';
import { GithubProjectV2CardComponent } from './components/github-project-v2-card.component';
import { GithubRegrasEventosGeraisComponent } from './components/github-regras-eventos-gerais.component';
import {
  GithubFlowEditarMensagemEvento,
  GithubRegrasFlowEditorComponent,
} from './components/github-regras-flow-editor.component';
import { GithubWebhookDecisoesPanelComponent } from './components/github-webhook-decisoes-panel.component';
import { corStatusGithubProject } from './github-status-color.util';

export type GithubSubAba =
  | 'conexao'
  | 'kanban'
  | 'equipe'
  | 'habilitados'
  | 'regras'
  | 'mensagem'
  | 'eventos';

export type GithubRegrasView = 'fluxos' | 'eventos';

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
    GithubIntegracaoStatusStripComponent,
    GithubProjectV2CardComponent,
    GithubWebhookDecisoesPanelComponent,
    GithubRegrasFlowEditorComponent,
    GithubRegrasEventosGeraisComponent,
  ],
  templateUrl: './configuracoes-github-tab.component.html',
})
export class ConfiguracoesGithubTabComponent implements OnInit {
  private readonly githubIntegracaoService = inject(GithubIntegracaoService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) errosFormulario: OrganizacaoConfiguracaoFormErrors = {};
  readonly graphqlTokenConfigurado = input(false);
  readonly githubAppPrivateKeyConfigurado = input(false);
  readonly templatesPorCenarioServidor = input<Record<string, GithubTemplatePorCenario>>({});
  readonly templatesPorCenarioChange = output<Record<string, GithubTemplatePorCenario>>();
  readonly salvarSolicitado = output<void>();

  private readonly templateModal = viewChild(GithubWhatsappTemplateModalComponent);

  readonly githubDefaultGraphqlUrl = GITHUB_DEFAULT_GRAPHQL_URL;
  readonly githubDefaultApiBaseUrl = GITHUB_DEFAULT_API_BASE_URL;
  readonly githubDefaultConnectTimeoutMs = GITHUB_DEFAULT_CONNECT_TIMEOUT_MS;
  readonly githubDefaultReadTimeoutMs = GITHUB_DEFAULT_READ_TIMEOUT_MS;
  readonly githubDefaultInstallationTokenSkewSegundos = GITHUB_DEFAULT_INSTALLATION_TOKEN_SKEW_SEGUNDOS;

  protected readonly loaderIcon = LoaderCircle;
  protected readonly editTemplateIcon = PencilLine;
  protected readonly copyIcon = Copy;
  protected readonly linkIcon = Link2;
  readonly corStatusGithub = corStatusGithubProject;

  readonly githubSubAba = signal<GithubSubAba>('conexao');
  readonly githubRegrasView = signal<GithubRegrasView>('fluxos');
  readonly githubIntegracao = signal<GithubWebhookIntegracaoResponse | null>(null);
  readonly carregandoGithubIntegracao = signal(false);
  readonly responsaveisGithub = signal<GithubResponsavel[]>([]);
  readonly carregandoResponsaveis = signal(false);
  readonly erroResponsaveis = signal<string | null>(null);
  readonly graphqlNodeId = signal('');
  readonly graphqlContentType = signal('Issue');
  readonly graphqlConsulta = signal<GithubGraphqlConsultaResponse | null>(null);
  readonly carregandoGraphqlConsulta = signal(false);
  readonly vinculoKanban = signal<GithubProjectV2VinculoResponse | null>(null);
  readonly carregandoVinculoKanban = signal(false);
  readonly listaProjects = signal<GithubProjectV2ListaResponse | null>(null);
  readonly carregandoProjects = signal(false);
  readonly statusOpcoesKanban = signal<GithubProjectV2StatusOpcao[]>([]);
  readonly carregandoStatusOpcoes = signal(false);
  readonly modalTemplateGithubAberto = signal(false);
  readonly modalTemplateGithubCenarioInicial = signal<string | null>(null);
  readonly templatesPorCenario = signal<Record<string, GithubTemplatePorCenario>>({});

  constructor() {
    effect(() => {
      if (this.modalTemplateGithubAberto()) {
        return;
      }
      const mapa = this.templatesPorCenarioServidor();
      this.templatesPorCenario.set(mapa ? { ...mapa } : {});
    });
  }

  readonly responsaveisHabilitados = computed(() =>
    this.responsaveisGithub().filter((item) => item.habilitado));
  readonly responsaveisPendentes = computed(() =>
    this.responsaveisGithub().filter((item) => item.ativo && !item.habilitado));
  readonly responsaveisDesativados = computed(() =>
    this.responsaveisGithub().filter(
      (item) => !!item.githubLogin?.trim() && !item.ativo,
    ));

  readonly responsavelAcaoId = signal<number | null>(null);

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

  readonly subAbas: {
    id: GithubSubAba;
    label: string;
    icon: LucideIconData;
    descricaoCurta: string;
  }[] = [
    {
      id: 'conexao',
      label: 'Conexão',
      icon: Link2,
      descricaoCurta: 'Webhook no GitHub App e credenciais de instalação.',
    },
    {
      id: 'kanban',
      label: 'Kanban',
      icon: LayoutGrid,
      descricaoCurta: 'Vincule o Project v2 usado no board da organização.',
    },
    {
      id: 'equipe',
      label: 'Equipe',
      icon: Users,
      descricaoCurta: 'Frase e link de ativação WhatsApp para o time.',
    },
    {
      id: 'habilitados',
      label: 'Habilitados',
      icon: UserCheck,
      descricaoCurta: 'Quem já vinculou login GitHub e recebe alertas.',
    },
    {
      id: 'regras',
      label: 'Regras',
      icon: Bell,
      descricaoCurta: 'Gatilhos, destinatários e status que disparam WhatsApp.',
    },
    {
      id: 'mensagem',
      label: 'Mensagem',
      icon: MessageSquare,
      descricaoCurta: 'Template WhatsApp e textos por tipo de evento.',
    },
    {
      id: 'eventos',
      label: 'Eventos',
      icon: ScrollText,
      descricaoCurta: 'Histórico visual de cada webhook processado e motivo da decisão.',
    },
  ];

  readonly subAbaAtivaMeta = computed(() =>
    this.subAbas.find((item) => item.id === this.githubSubAba()) ?? this.subAbas[0]);

  readonly githubConexaoPronta = computed(() => {
    const appId = this.form.get('githubAppId')?.value;
    const appOk =
      appId != null
      && Number(appId) > 0
      && (this.githubAppPrivateKeyConfigurado()
        || !!String(this.form.get('githubAppPrivateKey')?.value ?? '').trim());
    return !!this.githubIntegracao()?.featureHabilitada && appOk;
  });

  readonly githubKanbanPronto = computed(() => {
    const vinculo = this.vinculoKanban();
    const projectSalvo =
      !!vinculo?.project?.id
      || !!String(this.form.get('dsGithubProjectV2NodeId')?.value ?? '').trim();
    return projectSalvo && this.statusOpcoesKanban().length > 0;
  });

  readonly itensSaudeIntegracao = computed((): GithubIntegracaoStatusItem[] => {
    const gh = this.githubIntegracao();
    const vinculo = this.vinculoKanban();
    const appId = this.form.get('githubAppId')?.value;
    const appOk =
      appId != null
      && Number(appId) > 0
      && (this.githubAppPrivateKeyConfigurado() || !!String(this.form.get('githubAppPrivateKey')?.value ?? '').trim());
    const projectSalvo =
      !!vinculo?.project?.id
      || !!String(this.form.get('dsGithubProjectV2NodeId')?.value ?? '').trim();
    return [
      {
        id: 'feature',
        label: 'Feature GitHub',
        ok: !!gh?.featureHabilitada,
        hint: gh?.featureHabilitada ? 'Habilitada na organização' : 'Ative em Feature Flags',
      },
      {
        id: 'whatsapp',
        label: 'WhatsApp',
        ok: !!gh?.whatsappOrigemConectado,
        hint: gh?.whatsappOrigemConectado ? 'Sessão conectada' : 'Conecte em WhatsApp',
      },
      {
        id: 'app',
        label: 'GitHub App',
        ok: appOk,
        hint: appOk ? 'App ID e chave configurados' : 'Informe App ID e private key',
      },
      {
        id: 'kanban',
        label: 'Project v2',
        ok: projectSalvo,
        hint: projectSalvo ? 'Board vinculado' : 'Escolha um project na aba Kanban',
      },
      {
        id: 'token',
        label: 'Token GraphQL',
        ok: vinculo?.graphqlTokenDisponivel ?? false,
        hint: vinculo?.graphqlTokenDisponivel ? 'Token disponível' : 'Aguarde instalação ou webhook',
      },
    ];
  });

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
      || secao === 'kanban'
      || secao === 'equipe'
      || secao === 'habilitados'
      || secao === 'regras'
      || secao === 'mensagem'
      || secao === 'eventos'
    ) {
      this.githubSubAba.set(secao);
    }
    this.bloquearCamposConexaoAvancada();
    this.carregarGithubIntegracao();
    if (this.githubSubAba() === 'kanban' || this.githubSubAba() === 'regras') {
      this.carregarVinculoKanban();
    }
    if (this.githubSubAba() === 'habilitados' || this.githubSubAba() === 'regras') {
      this.carregarResponsaveisGithub();
    }
    const regrasView = this.route.snapshot.queryParamMap.get('regrasView');
    if (regrasView === 'fluxos' || regrasView === 'eventos') {
      this.githubRegrasView.set(regrasView);
    }
  }

  selecionarRegrasView(view: GithubRegrasView): void {
    this.githubRegrasView.set(view);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { githubSecao: 'regras', regrasView: view },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    if (view === 'eventos') {
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
    const queryParams: Record<string, string> = { githubSecao: id };
    if (id === 'regras') {
      queryParams['regrasView'] = this.githubRegrasView();
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    if (id === 'kanban' || id === 'regras') {
      this.carregarVinculoKanban();
    }
    if (id === 'habilitados' || id === 'regras') {
      this.carregarResponsaveisGithub();
    }
  }

  projectIdSelecionado(): string {
    return String(this.form.get('dsGithubProjectV2NodeId')?.value ?? '').trim();
  }

  carregarVinculoKanban(): void {
    this.carregandoVinculoKanban.set(true);
    this.githubIntegracaoService.obterVinculoProject().subscribe({
      next: (vinculo) => {
        this.vinculoKanban.set(vinculo);
        this.statusOpcoesKanban.set(vinculo.statusOpcoes ?? []);
        this.carregandoVinculoKanban.set(false);
      },
      error: () => {
        this.vinculoKanban.set(null);
        this.statusOpcoesKanban.set([]);
        this.carregandoVinculoKanban.set(false);
        this.toast.error('Não foi possível carregar o vínculo do Project v2');
      },
    });
  }

  carregarProjectsKanban(): void {
    const orgLogin = String(this.form.get('dsGithubOrganizationLogin')?.value ?? '').trim();
    this.carregandoProjects.set(true);
    this.listaProjects.set(null);
    this.githubIntegracaoService.listarProjects(orgLogin || null).subscribe({
      next: (resposta) => {
        this.listaProjects.set(resposta);
        this.carregandoProjects.set(false);
        if (!resposta.sucesso && resposta.mensagem) {
          this.toast.error(resposta.mensagem);
        }
      },
      error: (err) => {
        this.listaProjects.set(null);
        this.carregandoProjects.set(false);
        const msg = err?.error?.message ?? 'Falha ao listar projects no GitHub';
        this.toast.error(msg);
      },
    });
  }

  recarregarStatusOpcoesKanban(): void {
    const projectNodeId = String(this.form.get('dsGithubProjectV2NodeId')?.value ?? '').trim();
    if (!projectNodeId) {
      this.toast.error('Vincule ou selecione um Project v2 antes');
      return;
    }
    this.carregandoStatusOpcoes.set(true);
    this.githubIntegracaoService.listarStatusOpcoes(projectNodeId).subscribe({
      next: (resposta) => {
        if (resposta.sucesso) {
          this.statusOpcoesKanban.set(resposta.statusOpcoes ?? []);
        } else {
          this.statusOpcoesKanban.set([]);
          if (resposta.mensagem) {
            this.toast.error(resposta.mensagem);
          }
        }
        this.carregandoStatusOpcoes.set(false);
      },
      error: () => {
        this.statusOpcoesKanban.set([]);
        this.carregandoStatusOpcoes.set(false);
        this.toast.error('Falha ao carregar colunas de Status');
      },
    });
  }

  selecionarProjectKanban(project: GithubProjectV2Resumo): void {
    this.form.patchValue({
      dsGithubProjectV2NodeId: project.id,
      nuGithubProjectV2Number: project.number ?? null,
    });
    this.form.markAsDirty();
    this.recarregarStatusOpcoesKanban();
  }

  projectKanbanSelecionado(): boolean {
    const nodeId = String(this.form.get('dsGithubProjectV2NodeId')?.value ?? '').trim();
    return !!nodeId;
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

  desativarResponsavelGithub(item: GithubResponsavel): void {
    if (!confirm(`Desativar notificações para @${item.githubLogin}? O login deixa de receber alertas até reativar.`)) {
      return;
    }
    this.executarAcaoResponsavel(item.idGithubResponsavel, () =>
      this.githubIntegracaoService.atualizarResponsavelAtivo(item.idGithubResponsavel, false),
    );
  }

  reativarResponsavelGithub(item: GithubResponsavel): void {
    this.executarAcaoResponsavel(item.idGithubResponsavel, () =>
      this.githubIntegracaoService.atualizarResponsavelAtivo(item.idGithubResponsavel, true),
    );
  }

  excluirResponsavelGithub(item: GithubResponsavel): void {
    const ident = item.githubLogin ? `@${item.githubLogin}` : `WhatsApp ${item.whatsappMascarado}`;
    if (!confirm(`Excluir o vínculo ${ident}? Será necessário refazer o opt-in pelo WhatsApp.`)) {
      return;
    }
    this.executarAcaoResponsavel(item.idGithubResponsavel, () =>
      this.githubIntegracaoService.excluirResponsavel(item.idGithubResponsavel),
    );
  }

  responsavelEmAcao(id: number): boolean {
    return this.responsavelAcaoId() === id;
  }

  private executarAcaoResponsavel(id: number, chamada: () => Observable<unknown>): void {
    this.responsavelAcaoId.set(id);
    chamada().subscribe({
      next: () => {
        this.responsavelAcaoId.set(null);
        this.toast.success('Lista atualizada');
        this.carregarResponsaveisGithub();
      },
      error: () => {
        this.responsavelAcaoId.set(null);
        this.toast.error('Não foi possível atualizar o responsável');
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

  abrirEditorTemplateGithub(cenarioIdInicial?: string | null): void {
    this.modalTemplateGithubCenarioInicial.set(cenarioIdInicial ?? null);
    this.modalTemplateGithubAberto.set(true);
    if (!this.githubIntegracao() && !this.carregandoGithubIntegracao()) {
      this.carregarGithubIntegracao();
    }
  }

  editarMensagemDoFluxo(evento: GithubFlowEditarMensagemEvento): void {
    if (evento.modo === 'padrao') {
      this.selecionarSubAba('mensagem');
      this.abrirEditorTemplateGithub('projects_v2_edited');
      return;
    }
    this.abrirEditorTemplateGithub(evento.cenarioId);
  }

  fecharEditorTemplateGithub(): void {
    this.modalTemplateGithubAberto.set(false);
    this.modalTemplateGithubCenarioInicial.set(null);
  }

  definirTemplatesPorCenario(mapa: Record<string, GithubTemplatePorCenario> | null | undefined): void {
    this.templatesPorCenario.set(mapa ? { ...mapa } : {});
  }

  obterTemplatesPorCenarioParaSalvar(): Record<string, GithubTemplatePorCenario> {
    this.sincronizarTemplateEditorNoFormulario();
    return { ...this.templatesPorCenario() };
  }

  quantidadeTemplatesPorCenarioSalvos(): number {
    return Object.values(this.templatesPorCenario()).filter(
      (item) => (item.assunto?.trim() ?? '') || (item.mensagem?.trim() ?? ''),
    ).length;
  }

  aplicarTemplateGithub(dados: GithubWhatsappTemplateAplicado): void {
    this.publicarTemplatesPorCenario(dados.templatesPorCenario);
    this.form.markAsDirty();
    this.toast.success('Templates por tipo atualizados — salve as configurações');
  }

  /** Copia mapa do editor aberto antes do PUT. */
  sincronizarTemplateEditorNoFormulario(): void {
    if (!this.modalTemplateGithubAberto()) {
      return;
    }
    const modal = this.templateModal();
    if (!modal) {
      return;
    }
    const dados = modal.valoresAtuais();
    this.templatesPorCenario.set({ ...dados.templatesPorCenario });
    this.form.markAsDirty();
  }

  onSalvarTemplateNoServidor(dados: GithubWhatsappTemplateAplicado): void {
    this.publicarTemplatesPorCenario(dados.templatesPorCenario);
    this.form.markAsDirty();
    this.salvarSolicitado.emit();
  }

  private publicarTemplatesPorCenario(mapa: Record<string, GithubTemplatePorCenario>): void {
    const copia = { ...mapa };
    this.templatesPorCenario.set(copia);
    this.templatesPorCenarioChange.emit(copia);
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

  campoErroFormulario(campo: string): string | null {
    return this.campoErro(campo as keyof OrganizacaoConfiguracaoFormData);
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
