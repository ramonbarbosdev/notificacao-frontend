import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Check, ChevronDown, ChevronUp, CircleHelp, ExternalLink, LoaderCircle, LucideAngularModule, Settings } from 'lucide-angular';

import { AdminConfiguracaoService } from '../../../core/services/admin-configuracao.service';
import { FormFieldComponent } from '../../../shared/components/forms/form-field/app-form-field';
import {
  ABAS_CONFIG_GLOBAL,
  AbaConfiguracaoGlobal,
  CAMPOS_POR_ABA,
  INSTRUCOES_CONFIG_GLOBAL,
  ROTULO_ABA,
} from './configuracoes-globais.data';

const STORAGE_ORIENTACOES = 'notificacao.config-global.mostrar-orientacoes';

function emailOpcional(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  if (valor == null || String(valor).trim() === '') {
    return null;
  }
  return Validators.email(control);
}

@Component({
  selector: 'app-configuracoes-globais',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, FormFieldComponent],
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

  readonly aba = signal<AbaConfiguracaoGlobal>('plataforma');
  readonly mostrarOrientacoes = signal(this.lerPreferenciaOrientacoes());
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly sucesso = signal<string | null>(null);

  readonly form = this.fb.group({
    nmPlataforma: ['', [Validators.required]],
    nmDominioPrincipal: ['', [Validators.required]],
    nmEmailSuporte: ['', [Validators.required, Validators.email]],
    nmEmailAlertas: ['', [emailOpcional]],
    nuTimezonePadrao: [0],
    dsSmtpHost: [''],
    nuSmtpPorta: [587],
    nmSmtpUsuario: [''],
    dsSmtpSenha: [''],
    flWhatsappProviderPadrao: [true],
    flEmailHabilitado: [true],
    flTelegramHabilitado: [true],
    flWebhooksHabilitado: [true],
    flApiPublicaHabilitada: [false],
    flTemplatesHabilitado: [true],
  });

  readonly provedores = [
    { control: 'flWhatsappProviderPadrao', label: 'WhatsApp padrão', helper: 'Canal principal sugerido nas integrações' },
    { control: 'flEmailHabilitado', label: 'E-mail habilitado', helper: 'Requer SMTP configurado na aba E-mail e alertas' },
    { control: 'flTelegramHabilitado', label: 'Telegram habilitado', helper: 'Permite envio pelo canal Telegram' },
    { control: 'flWebhooksHabilitado', label: 'Webhooks habilitados', helper: 'Callbacks de eventos para sistemas externos' },
    { control: 'flApiPublicaHabilitada', label: 'API pública habilitada', helper: 'Endpoints sem escopo de organização (cuidado em produção)' },
    { control: 'flTemplatesHabilitado', label: 'Templates habilitados', helper: 'Mensagens padronizadas com variáveis' },
  ] as const;

  ngOnInit(): void {
    this.carregar();
  }

  selecionarAba(id: AbaConfiguracaoGlobal): void {
    this.aba.set(id);
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
    return this.instrucoes[this.aba()];
  }

  rotuloAbaAtiva(): string {
    return ROTULO_ABA[this.aba()];
  }

  abaAtualInvalida(): boolean {
    return this.camposDaAbaAtual().some((nome) => this.form.get(nome)?.invalid);
  }

  private camposDaAbaAtual(): readonly string[] {
    return CAMPOS_POR_ABA[this.aba()];
  }

  private validarAbaAtual(): boolean {
    let invalido = false;
    for (const nome of this.camposDaAbaAtual()) {
      const control = this.form.get(nome);
      control?.markAsTouched();
      control?.updateValueAndValidity();
      if (control?.invalid) {
        invalido = true;
      }
    }
    if (invalido) {
      this.erro.set(`Corrija os campos da aba ${this.rotuloAbaAtiva()} antes de salvar.`);
      this.sucesso.set(null);
    }
    return !invalido;
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.service.buscar().subscribe({
      next: (config) => {
        this.form.patchValue({
          ...config,
          dsSmtpSenha: '',
        });
        this.carregando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(this.mensagemErro(err, 'Não foi possível carregar as configurações.'));
        this.carregando.set(false);
      },
    });
  }

  salvar(): void {
    if (!this.validarAbaAtual()) {
      return;
    }

    const dados = this.form.getRawValue();

    this.salvando.set(true);
    this.erro.set(null);
    this.sucesso.set(null);

    this.service
      .atualizar({
        nmPlataforma: dados.nmPlataforma!,
        nmDominioPrincipal: dados.nmDominioPrincipal!,
        nmEmailSuporte: dados.nmEmailSuporte!,
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
          this.sucesso.set(`${this.rotuloAbaAtiva()} salva com sucesso.`);
          this.erro.set(null);
          this.salvando.set(false);
          this.form.patchValue({ dsSmtpSenha: '' });
        },
        error: (err: HttpErrorResponse) => {
          this.erro.set(this.mensagemErro(err, 'Não foi possível salvar as configurações.'));
          this.salvando.set(false);
        },
      });
  }

  restaurarPadrao(): void {
    switch (this.aba()) {
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
    this.sucesso.set(null);
  }

  private mensagemErro(err: HttpErrorResponse, fallback: string): string {
    if (err.status === 403) return 'Você não tem permissão para executar esta ação.';
    return err.error?.mensagem ?? err.error?.erro ?? err.error?.message ?? fallback;
  }
}
