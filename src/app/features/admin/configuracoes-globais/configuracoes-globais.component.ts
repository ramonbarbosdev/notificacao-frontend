import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Check, ChevronDown, ChevronUp, CircleHelp, ExternalLink, LoaderCircle, LucideAngularModule, Settings } from 'lucide-angular';
import { z } from 'zod';

import { AdminConfiguracaoService } from '../../../core/services/admin-configuracao.service';
import { SidePanelComponent } from '../../../shared/components/side-panel/side-panel.component';
import { FormInputComponent } from '../../../shared/components/forms/text-input/app-text-input';
import { useSidePanel } from '../../../shared/helper/side-panel.state';
import { getZodFieldErrors } from '../../../shared/helper/zod-form.helper';
import { ConfiguracaoGlobal } from '../../../shared/types/dtos';
import {
  ConfigGlobalFormData,
  ConfigGlobalFormErrors,
  schemaConfigGlobalPorAba,
} from '../schemas/config-global-form.schema';
import {
  ABAS_CONFIG_GLOBAL,
  AbaConfiguracaoGlobal,
  CAMPOS_POR_ABA,
  INSTRUCOES_CONFIG_GLOBAL,
  ROTULO_ABA,
} from './configuracoes-globais.data';

const STORAGE_ORIENTACOES = 'notificacao.config-global.mostrar-orientacoes';

@Component({
  selector: 'app-configuracoes-globais',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    SidePanelComponent,
    FormInputComponent,
  ],
  templateUrl: './configuracoes-globais.component.html',
  styleUrl: './configuracoes-globais.component.scss',
})
export class ConfiguracoesGlobaisComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdminConfiguracaoService);

  protected readonly settingsIcon = Settings;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly checkIcon = Check;
  protected readonly helpIcon = CircleHelp;
  protected readonly externalLinkIcon = ExternalLink;
  protected readonly chevronDownIcon = ChevronDown;
  protected readonly chevronUpIcon = ChevronUp;

  readonly abas = ABAS_CONFIG_GLOBAL;
  readonly instrucoes = INSTRUCOES_CONFIG_GLOBAL;
  readonly panel = useSidePanel<AbaConfiguracaoGlobal>();

  readonly aba = signal<AbaConfiguracaoGlobal>('plataforma');
  readonly mostrarOrientacoes = signal(this.lerPreferenciaOrientacoes());
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly sucesso = signal<string | null>(null);
  readonly errosFormulario = signal<ConfigGlobalFormErrors>({});
  readonly configAtual = signal<Partial<ConfigGlobalFormData>>({});

  readonly provedores = [
    { control: 'flWhatsappProviderPadrao', label: 'WhatsApp padrão', helper: 'Canal principal sugerido nas integrações' },
    { control: 'flEmailHabilitado', label: 'E-mail habilitado', helper: 'Requer SMTP configurado na aba E-mail e alertas' },
    { control: 'flTelegramHabilitado', label: 'Telegram habilitado', helper: 'Permite envio pelo canal Telegram' },
    { control: 'flWebhooksHabilitado', label: 'Webhooks habilitados', helper: 'Callbacks de eventos para sistemas externos' },
    { control: 'flApiPublicaHabilitada', label: 'API pública habilitada', helper: 'Endpoints sem escopo de organização (cuidado em produção)' },
    { control: 'flTemplatesHabilitado', label: 'Templates habilitados', helper: 'Mensagens padronizadas com variáveis' },
  ] as const;

  readonly form = this.fb.nonNullable.group({
    nmPlataforma: '',
    nmDominioPrincipal: '',
    nmEmailSuporte: '',
    nmEmailAlertas: '',
    nuTimezonePadrao: 0,
    dsSmtpHost: '',
    nuSmtpPorta: 587,
    nmSmtpUsuario: '',
    dsSmtpSenha: '',
    flWhatsappProviderPadrao: true,
    flEmailHabilitado: true,
    flTelegramHabilitado: true,
    flWebhooksHabilitado: true,
    flApiPublicaHabilitada: false,
    flTemplatesHabilitado: true,
  });

  readonly abaPainel = computed(() => this.panel.item() ?? 'plataforma');

  ngOnInit(): void {
    this.carregar();
  }

  getControl(name: keyof ConfigGlobalFormData): FormControl {
    return this.form.get(name) as FormControl;
  }

  campoErro(campo: keyof ConfigGlobalFormData): string | null {
    return this.errosFormulario()[campo] ?? null;
  }

  selecionarAba(id: AbaConfiguracaoGlobal): void {
    this.aba.set(id);
  }

  abrirEdicao(id: AbaConfiguracaoGlobal): void {
    this.erro.set(null);
    this.errosFormulario.set({});
    this.form.patchValue(this.configAtual() as ConfigGlobalFormData);
    this.panel.abrir(id);
  }

  fecharPainel(): void {
    this.panel.fechar();
    this.errosFormulario.set({});
  }

  alternarOrientacoes(): void {
    const proximo = !this.mostrarOrientacoes();
    this.mostrarOrientacoes.set(proximo);
    try {
      localStorage.setItem(STORAGE_ORIENTACOES, proximo ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }

  private lerPreferenciaOrientacoes(): boolean {
    try {
      const salvo = localStorage.getItem(STORAGE_ORIENTACOES);
      if (salvo === '0') return false;
      if (salvo === '1') return true;
    } catch {
      // ignore storage errors
    }
    return true;
  }

  instrucaoAtiva() {
    return this.instrucoes[this.abaPainel()];
  }

  rotuloAbaAtiva(): string {
    return ROTULO_ABA[this.abaPainel()];
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.service.buscar().subscribe({
      next: (config) => {
        const dados = this.normalizarConfig(config);
        this.configAtual.set(dados);
        this.form.patchValue(dados);
        this.carregando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(this.mensagemErro(err, 'Nao foi possivel carregar as configuracoes.'));
        this.carregando.set(false);
      },
    });
  }

  salvar(): void {
    const aba = this.abaPainel();
    this.form.markAllAsTouched();

    const schema = schemaConfigGlobalPorAba(aba);
    const campos = CAMPOS_POR_ABA[aba];
    const valoresParciais = campos.reduce((acc, campo) => {
      acc[campo as keyof ConfigGlobalFormData] = this.form.get(campo)?.value;
      return acc;
    }, {} as Record<string, unknown>);

    const resultado = schema.safeParse(valoresParciais);

    if (!resultado.success) {
      this.errosFormulario.set(getZodFieldErrors(resultado.error as z.ZodError<ConfigGlobalFormData>));
      this.erro.set(`Corrija os campos da aba ${this.rotuloAbaAtiva()} antes de salvar.`);
      return;
    }

    this.errosFormulario.set({});
    const dados = this.form.getRawValue();

    this.salvando.set(true);
    this.erro.set(null);
    this.sucesso.set(null);

    this.service
      .atualizar({
        nmPlataforma: dados.nmPlataforma,
        nmDominioPrincipal: dados.nmDominioPrincipal,
        nmEmailSuporte: dados.nmEmailSuporte,
        nmEmailAlertas: dados.nmEmailAlertas || null,
        nuTimezonePadrao: Number(dados.nuTimezonePadrao ?? 0),
        dsSmtpHost: dados.dsSmtpHost || null,
        nuSmtpPorta: Number(dados.nuSmtpPorta ?? 587),
        nmSmtpUsuario: dados.nmSmtpUsuario || null,
        dsSmtpSenha: dados.dsSmtpSenha || null,
        flWhatsappProviderPadrao: !!dados.flWhatsappProviderPadrao,
        flEmailHabilitado: !!dados.flEmailHabilitado,
        flTelegramHabilitado: !!dados.flTelegramHabilitado,
        flWebhooksHabilitado: !!dados.flWebhooksHabilitado,
        flApiPublicaHabilitada: !!dados.flApiPublicaHabilitada,
        flTemplatesHabilitado: !!dados.flTemplatesHabilitado,
      })
      .subscribe({
        next: () => {
          this.configAtual.set({ ...dados, dsSmtpSenha: '' });
          this.sucesso.set(`${this.rotuloAbaAtiva()} salva com sucesso.`);
          this.erro.set(null);
          this.salvando.set(false);
          this.form.patchValue({ dsSmtpSenha: '' });
          this.panel.fechar();
        },
        error: (err: HttpErrorResponse) => {
          this.erro.set(this.mensagemErro(err, 'Nao foi possivel salvar as configuracoes.'));
          this.salvando.set(false);
        },
      });
  }

  restaurarPadrao(): void {
    switch (this.abaPainel()) {
      case 'plataforma':
        this.form.patchValue({
          nmPlataforma: 'Notificacao SaaS',
          nmDominioPrincipal: 'localhost',
          nmEmailSuporte: 'suporte@exemplo.com',
          nuTimezonePadrao: 0,
        });
        break;
      case 'email-alertas':
        this.form.patchValue({
          nmEmailAlertas: '',
          dsSmtpHost: '',
          nuSmtpPorta: 587,
          nmSmtpUsuario: '',
          dsSmtpSenha: '',
        });
        break;
      case 'canais':
        this.form.patchValue({
          flWhatsappProviderPadrao: true,
          flEmailHabilitado: true,
          flTelegramHabilitado: true,
          flWebhooksHabilitado: true,
          flApiPublicaHabilitada: false,
          flTemplatesHabilitado: true,
        });
        break;
    }
    this.erro.set(null);
    this.errosFormulario.set({});
  }

  valorResumo(campo: keyof ConfigGlobalFormData): string {
    const valor = this.configAtual()[campo];
    if (typeof valor === 'boolean') return valor ? 'Sim' : 'Nao';
    if (valor === null || valor === undefined || valor === '') return '—';
    return String(valor);
  }

  private normalizarConfig(config: ConfiguracaoGlobal): Partial<ConfigGlobalFormData> {
    return {
      nmPlataforma: config.nmPlataforma ?? '',
      nmDominioPrincipal: config.nmDominioPrincipal ?? '',
      nmEmailSuporte: config.nmEmailSuporte ?? '',
      nmEmailAlertas: config.nmEmailAlertas ?? '',
      nuTimezonePadrao: config.nuTimezonePadrao ?? 0,
      dsSmtpHost: config.dsSmtpHost ?? '',
      nuSmtpPorta: config.nuSmtpPorta ?? 587,
      nmSmtpUsuario: config.nmSmtpUsuario ?? '',
      dsSmtpSenha: '',
      flWhatsappProviderPadrao: !!config.flWhatsappProviderPadrao,
      flEmailHabilitado: !!config.flEmailHabilitado,
      flTelegramHabilitado: !!config.flTelegramHabilitado,
      flWebhooksHabilitado: !!config.flWebhooksHabilitado,
      flApiPublicaHabilitada: !!config.flApiPublicaHabilitada,
      flTemplatesHabilitado: !!config.flTemplatesHabilitado,
    };
  }

  private mensagemErro(err: HttpErrorResponse, fallback: string): string {
    if (err.status === 403) return 'Voce nao tem permissao para executar esta acao.';
    return err.error?.mensagem ?? err.error?.erro ?? err.error?.message ?? fallback;
  }
}
