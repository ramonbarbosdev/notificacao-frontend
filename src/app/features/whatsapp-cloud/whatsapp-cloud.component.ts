import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Check, Cloud, LoaderCircle, LucideAngularModule, Settings2, Unplug } from 'lucide-angular';

import { AuthService } from '../../core/auth/auth.service';
import { CommandDialogService } from '../../core/services/command-dialog.service';
import { WhatsappCloudConfigService } from '../../core/services/whatsapp-cloud-config.service';
import { ToastService } from '../../core/services/toast.service';
import { FormFieldComponent } from '../../shared/components/forms/form-field/app-form-field';
import { formatDateTimePtBr } from '../../shared/helper/date.utils';
import { extrairMensagemErroHttp } from '../../shared/labels/notificacao.labels';
import {
  WhatsappCloudConfigResponse,
  WhatsappEmbeddedSignupConfigResponse,
} from '../../shared/types/dtos';

interface EmbeddedSignupSessionInfo {
  phoneNumberId?: string;
  wabaId?: string;
}

@Component({
  selector: 'app-whatsapp-cloud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, FormFieldComponent],
  templateUrl: './whatsapp-cloud.component.html',
})
export class WhatsappCloudComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly cloudService = inject(WhatsappCloudConfigService);
  private readonly authService = inject(AuthService);
  private readonly commandDialog = inject(CommandDialogService);
  private readonly toast = inject(ToastService);

  private messageListener?: (event: MessageEvent) => void;
  private pendingSignupCode: string | null = null;
  private sessionInfo: EmbeddedSignupSessionInfo = {};

  protected readonly cloudIcon = Cloud;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly checkIcon = Check;
  protected readonly settingsIcon = Settings2;
  protected readonly disconnectIcon = Unplug;

  readonly carregando = signal(true);
  readonly conectando = signal(false);
  readonly salvandoManual = signal(false);
  readonly testando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly sucesso = signal<string | null>(null);
  readonly config = signal<WhatsappCloudConfigResponse | null>(null);
  readonly configExiste = signal(false);
  readonly embeddedSignup = signal<WhatsappEmbeddedSignupConfigResponse | null>(null);
  readonly mostrarConfigManual = signal(false);

  readonly manualForm = this.fb.group({
    phoneNumberId: [''],
    wabaId: [''],
    apiVersion: ['v21.0'],
    accessToken: [''],
    active: [true],
  });

  readonly formatarData = formatDateTimePtBr;

  ngOnInit(): void {
    this.registrarListenerEmbeddedSignup();
    this.carregarTudo();
  }

  ngOnDestroy(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
    }
  }

  isAdmin(): boolean {
    return this.authService.role() === 'ADMIN';
  }

  webhookUrlCompleta(): string {
    return this.cloudService.webhookUrl();
  }

  copiarWebhook(): void {
    navigator.clipboard.writeText(this.webhookUrlCompleta()).then(
      () => this.toast.success('URL do webhook copiada'),
      () => this.toast.error('Nao foi possivel copiar a URL'),
    );
  }

  conectarWhatsApp(): void {
    if (!this.isAdmin()) {
      this.erro.set('Apenas administradores podem conectar o WhatsApp Cloud.');
      return;
    }

    const embedded = this.embeddedSignup();
    if (!embedded?.habilitado || !embedded.appId || !embedded.configId || !embedded.oauthRedirectUri) {
      this.erro.set(
        'Embedded Signup nao configurado no servidor (META_APP_ID / META_EMBEDDED_SIGNUP_CONFIG_ID / META_OAUTH_REDIRECT_URI).',
      );
      this.mostrarConfigManual.set(true);
      return;
    }

    this.erro.set(null);
    this.sucesso.set(null);
    this.conectando.set(true);
    this.pendingSignupCode = null;
    this.sessionInfo = {};

    if (!this.abrirPopupEmbeddedSignup(embedded)) {
      this.conectando.set(false);
      this.erro.set('Nao foi possivel abrir o popup da Meta. Verifique o bloqueador de popups.');
    }
  }

  salvarManual(): void {
    if (!this.isAdmin()) return;

    const raw = this.manualForm.getRawValue();
    const payload = {
      phoneNumberId: raw.phoneNumberId?.trim() ?? '',
      wabaId: raw.wabaId?.trim() || null,
      apiVersion: raw.apiVersion?.trim() || 'v21.0',
      accessToken: raw.accessToken?.trim(),
      active: raw.active ?? true,
    };

    if (!payload.phoneNumberId) {
      this.erro.set('Phone Number ID e obrigatorio.');
      return;
    }

    if (!this.configExiste() && !payload.accessToken) {
      this.erro.set('Informe o access token para criar a configuracao.');
      return;
    }

    this.salvandoManual.set(true);
    this.erro.set(null);

    const chamada = this.configExiste()
      ? this.cloudService.atualizar(payload)
      : this.cloudService.criar(payload as Required<typeof payload> & { accessToken: string });

    chamada.subscribe({
      next: (config) => {
        this.aplicarConfig(config);
        this.manualForm.patchValue({ accessToken: '' });
        this.sucesso.set('Configuracao WhatsApp Cloud salva.');
        this.salvandoManual.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(extrairMensagemErroHttp(err, 'Erro ao salvar WhatsApp Cloud.'));
        this.salvandoManual.set(false);
      },
    });
  }

  testar(): void {
    if (!this.isAdmin() || !this.configExiste()) return;
    this.testando.set(true);
    this.cloudService.testar().subscribe({
      next: (res) => {
        this.testando.set(false);
        if (res.success) {
          this.toast.success(res.message);
        } else {
          this.toast.error(res.message);
        }
        this.carregarConfig();
      },
      error: (err: HttpErrorResponse) => {
        this.testando.set(false);
        this.toast.error(extrairMensagemErroHttp(err, 'Erro ao testar conexao.'));
      },
    });
  }

  async desconectar(): Promise<void> {
    if (!this.isAdmin() || !this.configExiste()) return;

    const confirmado = await this.commandDialog.confirm({
      title: 'Desconectar WhatsApp Cloud',
      message:
        'Isso desativa o envio pela Meta nesta organizacao. Voce podera conectar novamente depois. A vinculacao na Meta nao e removida automaticamente.',
      confirmLabel: 'Desconectar',
      variant: 'danger',
    });
    if (!confirmado) return;

    this.cloudService.desativar().subscribe({
      next: () => {
        this.configExiste.set(false);
        this.config.set(null);
        this.toast.success('WhatsApp Cloud desconectado');
        this.carregarConfig();
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(extrairMensagemErroHttp(err, 'Erro ao desconectar WhatsApp Cloud.'));
      },
    });
  }

  private carregarTudo(): void {
    this.carregando.set(true);
    this.cloudService.embeddedSignupConfig().subscribe({
      next: (embedded) => this.embeddedSignup.set(embedded),
      error: () => this.embeddedSignup.set(null),
    });
    this.carregarConfig();
  }

  private carregarConfig(): void {
    this.cloudService.buscar().subscribe({
      next: (config) => {
        this.aplicarConfig(config);
        this.carregando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.configExiste.set(false);
          this.config.set(null);
        } else {
          this.erro.set(extrairMensagemErroHttp(err, 'Erro ao carregar WhatsApp Cloud.'));
        }
        this.carregando.set(false);
      },
    });
  }

  private aplicarConfig(config: WhatsappCloudConfigResponse): void {
    this.configExiste.set(true);
    this.config.set(config);
    this.manualForm.patchValue({
      phoneNumberId: config.phoneNumberId,
      wabaId: config.wabaId ?? '',
      apiVersion: config.apiVersion ?? 'v21.0',
      accessToken: '',
      active: config.active,
    });
  }

  private registrarListenerEmbeddedSignup(): void {
    this.messageListener = (event: MessageEvent) => {
      if (event.origin === window.location.origin) {
        const oauth = event.data as {
          type?: string;
          code?: string | null;
          error?: string | null;
        };
        if (oauth?.type === 'WA_EMBEDDED_SIGNUP_OAUTH') {
          if (oauth.code) {
            this.pendingSignupCode = oauth.code;
            this.tentarConcluirEmbeddedSignup();
          } else {
            this.conectando.set(false);
            this.erro.set(oauth.error ?? 'Conexao cancelada ou nao autorizada na Meta.');
          }
        }
        return;
      }

      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') {
        return;
      }

      const raw = event.data;
      if (typeof raw !== 'string') {
        return;
      }

      try {
        const data = JSON.parse(raw) as {
          type?: string;
          event?: string;
          data?: { phone_number_id?: string; waba_id?: string };
        };

        if (data.type !== 'WA_EMBEDDED_SIGNUP') {
          return;
        }

        if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA') {
          this.sessionInfo = {
            phoneNumberId: data.data?.phone_number_id,
            wabaId: data.data?.waba_id,
          };
          this.tentarConcluirEmbeddedSignup();
        }

        if (data.event === 'CANCEL') {
          this.conectando.set(false);
          this.erro.set('Cadastro cancelado na Meta.');
        }
      } catch {
        // Ignora mensagens que nao sao JSON do Embedded Signup.
      }
    };

    window.addEventListener('message', this.messageListener);
  }

  private tentarConcluirEmbeddedSignup(): void {
    const code = this.pendingSignupCode;
    const info = this.sessionInfo;

    if (!code || !info.phoneNumberId) {
      return;
    }

    this.conectando.set(true);
    this.cloudService
      .concluirEmbeddedSignup({
        code,
        phoneNumberId: info.phoneNumberId,
        wabaId: info.wabaId ?? null,
        apiVersion: 'v21.0',
      })
      .subscribe({
        next: (config) => {
          this.aplicarConfig(config);
          this.conectando.set(false);
          this.sucesso.set('WhatsApp Cloud conectado com sucesso via Meta.');
          this.toast.success('WhatsApp Cloud conectado');
        },
        error: (err: HttpErrorResponse) => {
          this.conectando.set(false);
          this.erro.set(extrairMensagemErroHttp(err, 'Nao foi possivel concluir o Embedded Signup.'));
        },
      });
  }

  private abrirPopupEmbeddedSignup(embedded: WhatsappEmbeddedSignupConfigResponse): boolean {
    const params = new URLSearchParams({
      client_id: embedded.appId!,
      redirect_uri: embedded.oauthRedirectUri!,
      response_type: 'code',
      config_id: embedded.configId!,
    });

    const url = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
    const width = 620;
    const height = 760;
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
    const popup = window.open(
      url,
      'metaEmbeddedSignup',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );

    return popup != null;
  }
}
