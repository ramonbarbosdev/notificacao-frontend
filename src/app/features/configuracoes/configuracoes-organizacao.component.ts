import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Check, KeyRound, LoaderCircle, LucideAngularModule, Settings, Webhook } from 'lucide-angular';

import { AuthService } from '../../core/auth/auth.service';
import { ApiKeyService } from '../../core/services/api-key.service';
import { OrganizacaoConfiguracaoService } from '../../core/services/organizacao-configuracao.service';
import { AlertaOperacionalService } from '../../core/services/alerta-operacional.service';
import { WebhookService } from '../../core/services/webhook.service';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { ToastService } from '../../core/services/toast.service';
import {
  ApiKey,
  ApiKeyCreatedResponse,
  ApiKeyScope,
  OrganizacaoConfiguracao,
  AlertaOperacional,
  Webhook as WebhookDTO,
  WebhookEvento,
  WhatsappStatusResponse,
} from '../../shared/types/dtos';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { FormFieldComponent } from '../../shared/components/forms/form-field/app-form-field';
import { formatScopes, maskApiKeyPrefix } from '../../shared/helper/api-key.utils';
import { formatDateTimePtBr } from '../../shared/helper/date.utils';
import { maskPhoneInput, normalizePhone } from '../../shared/helper/phone.utils';
import { labelWhatsappStatus as traduzirStatusWhatsapp, extrairMensagemErroHttp } from '../../shared/labels/notificacao.labels';
import {
  labelStatusOperacional,
  severidadeOperacional,
} from '../../shared/labels/whatsapp-operacional.labels';

type AbaConfiguracao =
  | 'geral'
  | 'whatsapp'
  | 'consentimento'
  | 'templates'
  | 'notificacoes'
  | 'apiKeys'
  | 'webhooks'
  | 'usuarios'
  | 'auditoria';

@Component({
  selector: 'app-configuracoes-organizacao',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule, EmptyStateComponent, FormFieldComponent],
  templateUrl: './configuracoes-organizacao.component.html',
})
export class ConfiguracoesOrganizacaoComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly configService = inject(OrganizacaoConfiguracaoService);
  private readonly alertaService = inject(AlertaOperacionalService);
  private readonly apiKeyService = inject(ApiKeyService);
  private readonly webhookService = inject(WebhookService);
  private   readonly whatsappService = inject(WhatsappService);
  private readonly toast = inject(ToastService);
  readonly authService = inject(AuthService);

  protected readonly settingsIcon = Settings;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly checkIcon = Check;
  protected readonly keyIcon = KeyRound;
  protected readonly webhookIcon = Webhook;

  readonly abas: { id: AbaConfiguracao; label: string; adminOnly?: boolean }[] = [
    { id: 'geral', label: 'Geral' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'consentimento', label: 'Consentimento' },
    { id: 'templates', label: 'Templates' },
    { id: 'notificacoes', label: 'Notificacoes' },
    { id: 'apiKeys', label: 'API Keys', adminOnly: true },
    { id: 'webhooks', label: 'Webhooks', adminOnly: true },
    { id: 'usuarios', label: 'Usuarios', adminOnly: true },
    { id: 'auditoria', label: 'Auditoria', adminOnly: true },
  ];

  readonly aba = signal<AbaConfiguracao>('geral');
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly sucesso = signal<string | null>(null);
  readonly apiKeys = signal<ApiKey[]>([]);
  readonly apiKeyCriada = signal<ApiKeyCreatedResponse | null>(null);
  readonly webhooks = signal<WebhookDTO[]>([]);
  readonly webhookEditando = signal<WebhookDTO | null>(null);
  readonly whatsappStatus = signal<WhatsappStatusResponse | null>(null);
  readonly alertasOperacionais = signal<AlertaOperacional[]>([]);
  readonly carregandoAlertas = signal(false);

  readonly scopes: { value: ApiKeyScope; label: string }[] = [
    { value: 'NOTIFICACOES_ENVIAR', label: 'Enviar notificacoes' },
    { value: 'NOTIFICACOES_CONSULTAR', label: 'Consultar notificacoes' },
    { value: 'TEMPLATES_CONSULTAR', label: 'Consultar templates' },
    { value: 'TEMPLATES_GERENCIAR', label: 'Gerenciar templates' },
    { value: 'CONTATOS_CONSULTAR', label: 'Consultar contatos' },
    { value: 'CONTATOS_GERENCIAR', label: 'Gerenciar contatos' },
  ];

  readonly eventos: { value: WebhookEvento; label: string }[] = [
    { value: 'NOTIFICACAO_CRIADA', label: 'Notificacao criada' },
    { value: 'NOTIFICACAO_ENVIADA', label: 'Notificacao enviada' },
    { value: 'NOTIFICACAO_ENTREGUE', label: 'Notificacao entregue' },
    { value: 'NOTIFICACAO_LIDA', label: 'Notificacao lida' },
    { value: 'NOTIFICACAO_FALHOU', label: 'Notificacao falhou' },
    { value: 'CONTATO_BLOQUEADO', label: 'Contato bloqueado' },
    { value: 'WHATSAPP_DESCONECTADO', label: 'WhatsApp desconectado' },
    { value: 'WHATSAPP_QR_ATUALIZADO', label: 'QR atualizado' },
  ];

  readonly form = this.fb.group({
    nmExibicao: ['', [Validators.required]],
    dsLogoUrl: [''],
    dsIdioma: ['pt-BR'],
    timezone: ['America/Bahia'],
    nuTelefoneOperacional: [''],
    dsEmailOperacional: ['', [Validators.email]],
    dsEmailAlertas: ['', [Validators.email]],
    whatsappReconexaoAutomatica: [true],
    whatsappDelayMinSegundos: [2],
    whatsappDelayMaxSegundos: [8],
    whatsappSimularDigitando: [true],
    whatsappLimitePorMinuto: [30],
    whatsappLimitePorDia: [1000],
    whatsappModoEnvio: ['SEGURO'],
    exigirConsentimento: [true],
    consentimentoExpira: [false],
    diasExpiracaoConsentimento: [365],
    bloqueioAutomatico: [true],
    limiteFalhasParaBloqueio: [3],
    templatesVersionamento: [true],
    templatesExigirAprovacao: [false],
    templatesValidarVariaveis: [true],
    retryAutomatico: [true],
    retryTentativas: [3],
    retryIntervaloSegundos: [60],
    prioridadePadrao: ['NORMAL'],
    expiracaoFilaHoras: [24],
    auditoriaHabilitada: [true],
  });

  readonly apiKeyForm = this.fb.group({
    nome: ['', [Validators.required]],
    expiraEm: [''],
    scopes: [[] as ApiKeyScope[], [Validators.required]],
  });

  readonly webhookForm = this.fb.group({
    nome: ['', [Validators.required]],
    url: ['', [Validators.required]],
    secret: [''],
    eventos: [[] as WebhookEvento[], [Validators.required]],
    ativo: [true],
  });

  readonly isAdmin = () => this.authService.role() === 'ADMIN';

  readonly formatarData = formatDateTimePtBr;
  readonly mascararPrefixo = maskApiKeyPrefix;

  labelWhatsappStatus(status: string | null | undefined): string {
    return traduzirStatusWhatsapp(status);
  }

  readonly labelStatusOperacional = labelStatusOperacional;
  readonly severidadeOperacional = severidadeOperacional;

  formatarScopes(scopes: ApiKeyScope[]): string {
    const labels = Object.fromEntries(this.scopes.map((item) => [item.value, item.label]));

    return formatScopes(scopes, labels);
  }

  atualizarTelefoneOperacional(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valorFormatado = maskPhoneInput(input.value);

    this.form.controls.nuTelefoneOperacional.setValue(valorFormatado, { emitEvent: false });
    input.value = valorFormatado;
  }

  copiarChave(chave: string): void {
    navigator.clipboard.writeText(chave).then(
      () => this.toast.success('Chave copiada'),
      () => this.toast.error('Nao foi possivel copiar a chave'),
    );
  }

  ngOnInit(): void {
    this.carregar();
    this.carregarWhatsappStatus();
  }

  selecionarAba(aba: AbaConfiguracao): void {
    if (this.abas.find((item) => item.id === aba)?.adminOnly && !this.isAdmin()) return;
    this.aba.set(aba);
    if (aba === 'apiKeys') this.carregarApiKeys();
    if (aba === 'webhooks') this.carregarWebhooks();
    if (aba === 'notificacoes') this.carregarAlertasOperacionais();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.configService.buscar().subscribe({
      next: (config) => {
        this.form.patchValue({
          ...config,
          nuTelefoneOperacional: config.nuTelefoneOperacional
            ? maskPhoneInput(config.nuTelefoneOperacional)
            : '',
        });
        if (!this.isAdmin()) this.form.disable();
        this.carregando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(this.mensagemErro(err, 'Nao foi possivel carregar configuracoes.'));
        this.carregando.set(false);
      },
    });
  }

  salvar(): void {
    if (!this.isAdmin()) {
      this.erro.set('Voce nao tem permissao para executar esta acao.');
      return;
    }
    if (this.form.invalid) return;

    const dados = this.form.getRawValue() as OrganizacaoConfiguracao;

    if (dados.nuTelefoneOperacional) {
      dados.nuTelefoneOperacional = normalizePhone(dados.nuTelefoneOperacional);
    }

    this.salvando.set(true);
    this.erro.set(null);
    this.sucesso.set(null);
    this.configService.atualizar(dados).subscribe({
      next: (config) => {
        this.form.patchValue({
          ...config,
          nuTelefoneOperacional: config.nuTelefoneOperacional
            ? maskPhoneInput(config.nuTelefoneOperacional)
            : '',
        });
        this.sucesso.set('Configurações salvas.');
        this.toast.success('Configurações salvas');
        this.salvando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(this.mensagemErro(err, 'Não foi possível salvar configurações.'));
        this.toast.error('Erro ao salvar', this.erro() ?? undefined);
        this.salvando.set(false);
      },
    });
  }

  carregarWhatsappStatus(): void {
    this.whatsappService.status().subscribe({ next: (status) => this.whatsappStatus.set(status) });
  }

  carregarAlertasOperacionais(): void {
    if (!this.isAdmin()) return;
    this.carregandoAlertas.set(true);
    this.alertaService.listar(0, 8).subscribe({
      next: (page) => {
        this.alertasOperacionais.set(page.content ?? []);
        this.carregandoAlertas.set(false);
      },
      error: () => this.carregandoAlertas.set(false),
    });
  }

  carregarApiKeys(): void {
    if (!this.isAdmin()) return;
    this.apiKeyService.listar().subscribe({
      next: (keys) => this.apiKeys.set(keys),
      error: (err: HttpErrorResponse) => this.erro.set(this.mensagemErro(err, 'Erro ao listar API Keys.')),
    });
  }

  toggleScope(scope: ApiKeyScope): void {
    const scopes = this.apiKeyForm.controls.scopes.value ?? [];
    this.apiKeyForm.controls.scopes.setValue(scopes.includes(scope) ? scopes.filter((item) => item !== scope) : [...scopes, scope]);
  }

  criarApiKey(): void {
    if (this.apiKeyForm.invalid) return;
    const dados = this.apiKeyForm.getRawValue();
    this.apiKeyService.criar({
      nome: dados.nome!,
      expiraEm: dados.expiraEm || null,
      scopes: dados.scopes ?? [],
    }).subscribe({
      next: (res) => {
        this.apiKeyCriada.set(res);
        this.apiKeyForm.reset({ nome: '', expiraEm: '', scopes: [] });
        this.carregarApiKeys();
        this.toast.success('API Key gerada', 'Copie a chave completa agora — ela não será exibida novamente.');
      },
      error: (err: HttpErrorResponse) => this.erro.set(this.mensagemErro(err, 'Erro ao criar API Key.')),
    });
  }

  revogarApiKey(idApiKey: number): void {
    this.apiKeyService.revogar(idApiKey).subscribe({
      next: () => this.carregarApiKeys(),
      error: (err: HttpErrorResponse) => this.erro.set(this.mensagemErro(err, 'Erro ao revogar API Key.')),
    });
  }

  carregarWebhooks(): void {
    if (!this.isAdmin()) return;
    this.webhookService.listar().subscribe({
      next: (webhooks) => this.webhooks.set(webhooks),
      error: (err: HttpErrorResponse) => this.erro.set(this.mensagemErro(err, 'Erro ao listar webhooks.')),
    });
  }

  toggleEvento(evento: WebhookEvento): void {
    const eventos = this.webhookForm.controls.eventos.value ?? [];
    this.webhookForm.controls.eventos.setValue(eventos.includes(evento) ? eventos.filter((item) => item !== evento) : [...eventos, evento]);
  }

  editarWebhook(webhook: WebhookDTO): void {
    this.webhookEditando.set(webhook);
    this.webhookForm.patchValue({ ...webhook, secret: '' });
  }

  novoWebhook(): void {
    this.webhookEditando.set(null);
    this.webhookForm.reset({ nome: '', url: '', secret: '', eventos: [], ativo: true });
  }

  salvarWebhook(): void {
    if (this.webhookForm.invalid) return;
    const dados = this.webhookForm.getRawValue();
    const payload = {
      nome: dados.nome!,
      url: dados.url!,
      secret: dados.secret || null,
      eventos: dados.eventos ?? [],
      ativo: !!dados.ativo,
    };
    const atual = this.webhookEditando();
    const chamada = atual ? this.webhookService.atualizar(atual.idWebhook, payload) : this.webhookService.criar(payload);
    chamada.subscribe({
      next: () => {
        this.novoWebhook();
        this.carregarWebhooks();
        this.toast.success('Webhook salvo');
      },
      error: (err: HttpErrorResponse) => this.erro.set(this.mensagemErro(err, 'Erro ao salvar webhook.')),
    });
  }

  alternarWebhook(webhook: WebhookDTO): void {
    const chamada = webhook.ativo ? this.webhookService.inativar(webhook.idWebhook) : this.webhookService.ativar(webhook.idWebhook);
    chamada.subscribe({ next: () => this.carregarWebhooks() });
  }

  removerWebhook(idWebhook: number): void {
    this.webhookService.remover(idWebhook).subscribe({ next: () => this.carregarWebhooks() });
  }

  private mensagemErro(err: HttpErrorResponse, fallback: string): string {
    if (err.status === 403) return 'Voce nao tem permissao para executar esta acao.';
    return extrairMensagemErroHttp(err, fallback);
  }
}
