import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Check, LoaderCircle, LucideAngularModule, PackagePlus } from 'lucide-angular';

import { PlanoService } from '../../../core/services/plano.service';
import { SidePanelComponent } from '../../../shared/components/side-panel/side-panel.component';
import { FormInputComponent } from '../../../shared/components/forms/text-input/app-text-input';
import { FormTextareaComponent } from '../../../shared/components/forms/textarea-input/form-textarea.component';
import { useSidePanel } from '../../../shared/helper/side-panel.state';
import { formatNumberPtBr } from '../../../shared/helper/number.utils';
import { getZodFieldErrors } from '../../../shared/helper/zod-form.helper';
import { Plano } from '../../../shared/types/dtos';
import {
  planoFormSchema,
  PlanoFormData,
  PlanoFormErrors,
} from '../schemas/plano-form.schema';

@Component({
  selector: 'app-planos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    SidePanelComponent,
    FormInputComponent,
    FormTextareaComponent,
  ],
  templateUrl: './planos.component.html',
})
export class PlanosComponent implements OnInit {
  private readonly service = inject(PlanoService);
  private readonly fb = inject(FormBuilder);

  protected readonly planIcon = PackagePlus;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly checkIcon = Check;

  readonly panel = useSidePanel<Plano>();
  readonly formatarNumero = formatNumberPtBr;
  readonly planos = signal<Plano[]>([]);
  readonly termo = signal('');
  readonly status = signal('');
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly sucesso = signal<string | null>(null);
  readonly errosFormulario = signal<PlanoFormErrors>({});

  readonly planosFiltrados = computed(() => {
    const termo = this.termo().toLowerCase();
    const status = this.status();
    return this.planos().filter((plano) => {
      return (
        (!termo || plano.nmPlano.toLowerCase().includes(termo)) &&
        (!status || String(plano.flAtivo) === status)
      );
    });
  });

  readonly toggles = [
    { control: 'flWhatsappHabilitado', label: 'WhatsApp' },
    { control: 'flEmailHabilitado', label: 'Email' },
    { control: 'flTelegramHabilitado', label: 'Telegram' },
    { control: 'flWebhookHabilitado', label: 'Webhook' },
    { control: 'flApiPublicaHabilitada', label: 'API publica' },
    { control: 'flAtivo', label: 'Ativo' },
  ] as const;

  readonly form = this.fb.nonNullable.group({
    nmPlano: '',
    dsPlano: '',
    nuLimiteMensagensMensal: 10000,
    nuLimiteUsuarios: 10,
    nuLimiteTemplates: 100,
    nuLimiteContatos: 10000,
    flWhatsappHabilitado: true,
    flEmailHabilitado: true,
    flTelegramHabilitado: true,
    flWebhookHabilitado: true,
    flApiPublicaHabilitada: false,
    flAtivo: true,
  });

  ngOnInit(): void {
    this.carregar();
  }

  getControl(name: keyof PlanoFormData): FormControl {
    return this.form.get(name) as FormControl;
  }

  campoErro(campo: keyof PlanoFormData): string | null {
    return this.errosFormulario()[campo] ?? null;
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.service.listar().subscribe({
      next: (planos) => {
        this.planos.set(planos);
        this.carregando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(this.mensagemErro(err, 'Nao foi possivel listar planos.'));
        this.carregando.set(false);
      },
    });
  }

  abrirNovo(): void {
    this.form.reset({
      nmPlano: '',
      dsPlano: '',
      nuLimiteMensagensMensal: 10000,
      nuLimiteUsuarios: 10,
      nuLimiteTemplates: 100,
      nuLimiteContatos: 10000,
      flWhatsappHabilitado: true,
      flEmailHabilitado: true,
      flTelegramHabilitado: true,
      flWebhookHabilitado: true,
      flApiPublicaHabilitada: false,
      flAtivo: true,
    });
    this.errosFormulario.set({});
    this.erro.set(null);
    this.panel.abrir();
  }

  editar(plano: Plano): void {
    this.form.patchValue({
      nmPlano: plano.nmPlano,
      dsPlano: plano.dsPlano ?? '',
      nuLimiteMensagensMensal: plano.nuLimiteMensagensMensal ?? 0,
      nuLimiteUsuarios: plano.nuLimiteUsuarios ?? 0,
      nuLimiteTemplates: plano.nuLimiteTemplates ?? 0,
      nuLimiteContatos: plano.nuLimiteContatos ?? 0,
      flWhatsappHabilitado: plano.flWhatsappHabilitado,
      flEmailHabilitado: plano.flEmailHabilitado,
      flTelegramHabilitado: plano.flTelegramHabilitado,
      flWebhookHabilitado: plano.flWebhookHabilitado,
      flApiPublicaHabilitada: plano.flApiPublicaHabilitada,
      flAtivo: plano.flAtivo,
    });
    this.errosFormulario.set({});
    this.erro.set(null);
    this.panel.abrir(plano);
  }

  fecharPainel(): void {
    this.panel.fechar();
    this.errosFormulario.set({});
  }

  salvar(): void {
    this.form.markAllAsTouched();

    const resultado = planoFormSchema.safeParse(this.form.getRawValue());

    if (!resultado.success) {
      this.errosFormulario.set(getZodFieldErrors(resultado.error));
      return;
    }

    this.errosFormulario.set({});
    const dados = resultado.data;
    const request = {
      nmPlano: dados.nmPlano,
      dsPlano: dados.dsPlano || null,
      nuLimiteMensagensMensal: dados.nuLimiteMensagensMensal,
      nuLimiteUsuarios: dados.nuLimiteUsuarios,
      nuLimiteTemplates: dados.nuLimiteTemplates,
      nuLimiteContatos: dados.nuLimiteContatos,
      flWhatsappHabilitado: dados.flWhatsappHabilitado,
      flEmailHabilitado: dados.flEmailHabilitado,
      flTelegramHabilitado: dados.flTelegramHabilitado,
      flWebhookHabilitado: dados.flWebhookHabilitado,
      flApiPublicaHabilitada: dados.flApiPublicaHabilitada,
      flAtivo: dados.flAtivo,
    };
    const atual = this.panel.item();

    this.salvando.set(true);
    this.erro.set(null);
    this.sucesso.set(null);

    const chamada = atual ? this.service.atualizar(atual.idPlano, request) : this.service.criar(request);
    chamada.subscribe({
      next: () => {
        this.sucesso.set('Plano salvo.');
        this.salvando.set(false);
        this.panel.fechar();
        this.carregar();
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(this.mensagemErro(err, 'Nao foi possivel salvar o plano.'));
        this.salvando.set(false);
      },
    });
  }

  alternar(plano: Plano): void {
    const chamada = plano.flAtivo ? this.service.inativar(plano.idPlano) : this.service.ativar(plano.idPlano);
    chamada.subscribe({
      next: () => this.carregar(),
      error: (err: HttpErrorResponse) => this.erro.set(this.mensagemErro(err, 'Nao foi possivel alterar o status.')),
    });
  }

  atualizarFiltroTermo(event: Event): void {
    this.termo.set((event.target as HTMLInputElement).value);
  }

  atualizarFiltroStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value);
  }

  private mensagemErro(err: HttpErrorResponse, fallback: string): string {
    if (err.status === 403) return 'Voce nao tem permissao para executar esta acao.';
    return err.error?.mensagem ?? err.error?.erro ?? err.error?.message ?? fallback;
  }
}
