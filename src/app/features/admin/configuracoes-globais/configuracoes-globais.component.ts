import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Check, LoaderCircle, LucideAngularModule, Settings } from 'lucide-angular';

import { AdminConfiguracaoService } from '../../../core/services/admin-configuracao.service';

@Component({
  selector: 'app-configuracoes-globais',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './configuracoes-globais.component.html',
})
export class ConfiguracoesGlobaisComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdminConfiguracaoService);

  protected readonly settingsIcon = Settings;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly checkIcon = Check;

  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly sucesso = signal<string | null>(null);

  readonly form = this.fb.group({
    nmPlataforma: ['', [Validators.required]],
    nmDominioPrincipal: ['', [Validators.required]],
    nmEmailSuporte: ['', [Validators.required, Validators.email]],
    nmEmailAlertas: ['', [Validators.email]],
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

  ngOnInit(): void {
    this.carregar();
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
        this.erro.set(this.mensagemErro(err, 'Nao foi possivel carregar as configuracoes.'));
        this.carregando.set(false);
      },
    });
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
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
          this.sucesso.set('Configuracoes globais salvas.');
          this.salvando.set(false);
          this.form.patchValue({ dsSmtpSenha: '' });
        },
        error: (err: HttpErrorResponse) => {
          this.erro.set(this.mensagemErro(err, 'Nao foi possivel salvar as configuracoes.'));
          this.salvando.set(false);
        },
      });
  }

  restaurarPadrao(): void {
    this.form.patchValue({
      nmPlataforma: 'Notificacao SaaS',
      nmDominioPrincipal: 'localhost',
      nmEmailSuporte: 'suporte@exemplo.com',
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
  }

  private mensagemErro(err: HttpErrorResponse, fallback: string): string {
    if (err.status === 403) return 'Voce nao tem permissao para executar esta acao.';
    return err.error?.mensagem ?? err.error?.erro ?? err.error?.message ?? fallback;
  }
}
