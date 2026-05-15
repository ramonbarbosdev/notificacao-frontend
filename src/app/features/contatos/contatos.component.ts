import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Ban,
  Check,
  LoaderCircle,
  LucideAngularModule,
  MessageCircle,
  RefreshCcw,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-angular';
import { z } from 'zod';

import { SidePanelComponent } from '../../shared/components/side-panel/side-panel.component';
import { HeaderComponent } from '../../core/layout/header/header.component';
import { SidebarComponent } from '../../core/layout/layout.components';
import { ContatoService } from '../../core/services/contato.service';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { DataTableColumn } from '../../shared/components/data-table/data-table.types';
import { usePaginatedTable } from '../../shared/helper/paginated-table.state';
import { CanalNotificacao, ContatoResponseDTO } from '../../shared/types/dtos';
import { formatPhone, normalizePhone } from '../../shared/helper/phone.utils';
import { useSidePanel } from '../../shared/helper/side-panel.state';

type AcaoContato = 'consentimento' | 'bloqueio' | 'sync' | null;

const contatoFormSchema = z
  .object({
    canal: z.enum(['WHATSAPP', 'EMAIL', 'TELEGRAM', 'WEBHOOK']),
    destinatario: z.string().trim().min(1, 'Informe o contato.'),
    motivo: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.canal === 'WHATSAPP') {
      const telefone = normalizePhone(value.destinatario);

      if (telefone.length < 10 || telefone.length > 15) {
        ctx.addIssue({
          code: 'custom',
          path: ['destinatario'],
          message: 'Informe um telefone valido para WhatsApp.',
        });
      }
    }

    if (value.canal === 'EMAIL') {
      const emailValido = z.string().email().safeParse(value.destinatario);

      if (!emailValido.success) {
        ctx.addIssue({
          code: 'custom',
          path: ['destinatario'],
          message: 'Informe um e-mail valido.',
        });
      }
    }
  });

type ContatoFormData = z.infer<typeof contatoFormSchema>;

@Component({
  selector: 'app-contatos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    SidebarComponent,
    HeaderComponent,
    DataTableComponent,
    SidePanelComponent
  ],
  templateUrl: './contatos.component.html',
})
export class ContatosComponent implements OnInit {
  private readonly contatoService = inject(ContatoService);
  private readonly fb = inject(FormBuilder);

  readonly table = usePaginatedTable(10);

  protected readonly contatoIcon = UserCheck;
  protected readonly usersIcon = Users;
  protected readonly shieldIcon = ShieldCheck;
  protected readonly banIcon = Ban;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly checkIcon = Check;
  protected readonly whatsappIcon = MessageCircle;
  protected readonly syncIcon = RefreshCcw;

  readonly filtros = signal<Record<string, any>>({});
  readonly acaoAtual = signal<AcaoContato>(null);
  readonly contatos = signal<ContatoResponseDTO[]>([]);
  readonly resposta = signal<ContatoResponseDTO | null>(null);
  readonly erro = signal<string | null>(null);
  readonly errosFormulario = signal<Partial<Record<keyof ContatoFormData, string>>>({});
  readonly canais: CanalNotificacao[] = ['WHATSAPP', 'EMAIL', 'TELEGRAM', 'WEBHOOK'];

  readonly contatoPanel = useSidePanel<ContatoResponseDTO>();
  readonly form = this.fb.group({
    canal: this.fb.control<CanalNotificacao>('WHATSAPP', { nonNullable: true }),
    destinatario: ['', [Validators.required]],
    motivo: [''],
  });

  readonly totalContatos = computed(() => this.table.totalElementos());

  readonly totalConsentidos = computed(() =>
    this.contatos().filter((contato) => contato.consentimento && !contato.bloqueado).length
  );

  readonly totalBloqueados = computed(() =>
    this.contatos().filter((contato) => contato.bloqueado).length
  );

  readonly totalSemConsentimento = computed(() =>
    this.contatos().filter((contato) => !contato.consentimento && !contato.bloqueado).length
  );

  readonly columns: DataTableColumn<ContatoResponseDTO>[] = [
    {
      key: 'destinatario',
      label: 'Contato',
      formatter: (value, row) => formatPhone(value),
      filter: {
        type: 'text',
        placeholder: 'Buscar contato',
      },
    },
    {
      key: 'canal',
      label: 'Canal',
      filter: {
        type: 'select',
        options: [
          { label: 'Todos', value: '' },
          { label: 'WhatsApp', value: 'WHATSAPP' },
          { label: 'Email', value: 'EMAIL' },
          { label: 'Telegram', value: 'TELEGRAM' },
          { label: 'Webhook', value: 'WEBHOOK' },
        ],
      },
    },
    {
      key: 'consentimento',
      label: 'Consentimento',
      type: 'badge',
      // filter: {
      //   type: 'boolean',
      // },
      badge: (value, row) => {
        if (row.bloqueado) {
          return {
            label: 'Bloqueado',
            className:
              'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger-border)]',
          };
        }

        if (value) {
          return {
            label: 'Consentido',
            className:
              'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]',
          };
        }
        return {
          label: 'Sem consentimento',
          className:
            'bg-[var(--color-bg-base)] text-[var(--color-text-muted)] border-[var(--color-border)]',
        };
      },
    },
    {
      key: 'bloqueado',
      label: 'Bloqueado',
      formatter: (value) => (value ? 'Sim' : 'Nao'),
      // filter: {
      //   type: 'boolean',
      // },
    },
    {
      key: 'actions',
      label: 'Acoes',
      type: 'actions',
      align: 'right',
      actions: [
        {
          label: 'Selecionar',
          action: (row) => this.preencherFormulario(row),
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.listarContatos();
  }

  abrirNovoContato(): void {
    this.form.reset({
      canal: 'WHATSAPP',
      destinatario: '',
      motivo: '',
    });

    this.resposta.set(null);
    this.erro.set(null);
    this.errosFormulario.set({});
    this.contatoPanel.abrir();
  }



  listarContatos(): void {
    this.table.loading.set(true);
    this.erro.set(null);

    const filtros = this.filtros();

    this.contatoService
      .listar({
        page: this.table.paginaAtual(),
        size: this.table.tamanhoPagina(),
        sort: 'dtCriacao,desc',
        destinatario: filtros['destinatario'] || undefined,
        canal: filtros['canal'] || undefined,
        consentimento: this.toBooleanOrUndefined(filtros['consentimento']),
        bloqueado: this.toBooleanOrUndefined(filtros['bloqueado']),
      })
      .subscribe({
        next: (page) => {
          this.contatos.set(page.data);
          this.table.atualizarPaginacao(page);
          this.table.loading.set(false);
        },
        error: (err) => {
          this.erro.set(
            err.error?.mensagem ?? err.error?.erro ?? 'Nao foi possivel listar os contatos.'
          );
          this.table.loading.set(false);
        },
      });
  }

  aplicarFiltros(filtros: Record<string, any>): void {
    this.filtros.set(filtros);
    this.table.aplicarFiltros(() => this.listarContatos());
  }

  proximaPagina(): void {
    this.table.proximaPagina(() => this.listarContatos());
  }

  paginaAnterior(): void {
    this.table.paginaAnterior(() => this.listarContatos());
  }

  alterarTamanhoPagina(size: number): void {
    this.table.alterarTamanhoPagina(size, () => this.listarContatos());
  }

  registrarConsentimento(): void {
    if (!this.validarFormulario()) return;

    this.executar('consentimento');
  }

  bloquearContato(): void {
    if (!this.validarFormulario()) return;

    const motivo = this.form.controls.motivo.value?.trim();

    if (!motivo) {
      this.erro.set('Informe o motivo para bloquear o contato.');
      this.errosFormulario.update((erros) => ({
        ...erros,
        motivo: 'Informe o motivo para bloquear o contato.',
      }));
      this.form.controls.motivo.markAsTouched();
      return;
    }

    this.executar('bloqueio');
  }

  preencherFormulario(contato: ContatoResponseDTO): void {
    this.form.patchValue({
      canal: contato.canal,
      destinatario: contato.destinatario,
      motivo: contato.motivoBloqueio ?? '',
    });

    this.resposta.set(null);
    this.erro.set(null);
    this.errosFormulario.set({});
    this.contatoPanel.abrir(contato);
  }

  fecharPainelContato(): void {
    this.contatoPanel.fechar();
    this.errosFormulario.set({});
  }

  aoAlterarCanal(): void {
    const destinatario = this.form.controls.destinatario.value ?? '';

    this.errosFormulario.set({});
    this.resposta.set(null);
    this.erro.set(null);

    if (!destinatario) return;

    this.form.controls.destinatario.setValue(this.formatarDestinatario(destinatario), {
      emitEvent: false,
    });
  }

  atualizarDestinatario(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valorFormatado = this.formatarDestinatario(input.value);

    this.form.controls.destinatario.setValue(valorFormatado, {
      emitEvent: false,
    });
    input.value = valorFormatado;

    this.errosFormulario.update((erros) => ({
      ...erros,
      destinatario: undefined,
    }));
  }

  placeholderDestinatario(): string {
    switch (this.form.controls.canal.value) {
      case 'WHATSAPP':
        return '+55 (71) 99118-0200';
      case 'EMAIL':
        return 'destinatario@email.com';
      case 'TELEGRAM':
        return '@usuario ou chat_id';
      case 'WEBHOOK':
        return 'https://seu-webhook.com/endpoint';
      default:
        return '';
    }
  }

  tipoInputDestinatario(): string {
    return this.form.controls.canal.value === 'EMAIL' ? 'email' : 'text';
  }
  
  sincronizarContatosWhatsapp(): void {
    if (this.acaoAtual()) return;

    this.acaoAtual.set('sync');
    this.erro.set(null);
    this.resposta.set(null);

    this.contatoService.sincronizarWhatsapp().subscribe({
      next: () => {
        this.acaoAtual.set(null);
        this.listarContatos();
      },
      error: (err) => {
        this.erro.set(
          err.error?.mensagem ?? err.error?.erro ?? 'Nao foi possivel sincronizar contatos.'
        );
        this.acaoAtual.set(null);
      },
    });
  }

  private executar(operacao: 'consentimento' | 'bloqueio'): void {
    if (this.acaoAtual()) return;

    this.acaoAtual.set(operacao);
    this.resposta.set(null);
    this.erro.set(null);

    const dados = contatoFormSchema.parse(this.form.getRawValue());

    const request = {
      canal: dados.canal,
      destinatario: this.normalizarDestinatarioParaApi(dados),
      motivo: dados.motivo?.trim() || null,
    };

    const chamada =
      operacao === 'consentimento'
        ? this.contatoService.registrarConsentimento(request)
        : this.contatoService.bloquearContato(request);

    chamada.subscribe({
      next: (resposta) => {
        this.resposta.set(resposta);
        this.acaoAtual.set(null);
        this.listarContatos();
      },
      error: (err) => {
        this.erro.set(
          err.error?.mensagem ?? err.error?.erro ?? 'Nao foi possivel atualizar o contato.'
        );
        this.acaoAtual.set(null);
      },
    });
  }

  private validarFormulario(): boolean {
    this.form.markAllAsTouched();

    const resultado = contatoFormSchema.safeParse(this.form.getRawValue());

    if (resultado.success) {
      this.errosFormulario.set({});
      return true;
    }

    const erros = resultado.error.issues.reduce((acc, issue) => {
      const campo = issue.path[0] as keyof ContatoFormData | undefined;

      if (campo && !acc[campo]) {
        acc[campo] = issue.message;
      }

      return acc;
    }, {} as Partial<Record<keyof ContatoFormData, string>>);

    this.errosFormulario.set(erros);
    return false;
  }

  private formatarDestinatario(value: string): string {
    if (this.form.controls.canal.value === 'WHATSAPP') {
      return this.aplicarMascaraWhatsapp(value);
    }

    if (this.form.controls.canal.value === 'EMAIL') {
      return value.replace(/\s/g, '').toLowerCase();
    }

    return value.trimStart();
  }

  private aplicarMascaraWhatsapp(value: string): string {
    const digits = normalizePhone(value).slice(0, 13);

    if (!digits) return '';

    if (digits.startsWith('55')) {
      const ddi = digits.slice(0, 2);
      const ddd = digits.slice(2, 4);
      const prefixo = digits.length > 12 ? digits.slice(4, 9) : digits.slice(4, 8);
      const sufixo = digits.length > 12 ? digits.slice(9, 13) : digits.slice(8, 12);

      return [
        `+${ddi}`,
        ddd ? ` (${ddd}` : '',
        ddd.length === 2 ? ')' : '',
        prefixo ? ` ${prefixo}` : '',
        sufixo ? `-${sufixo}` : '',
      ].join('');
    }

    const ddd = digits.slice(0, 2);
    const prefixo = digits.length > 10 ? digits.slice(2, 7) : digits.slice(2, 6);
    const sufixo = digits.length > 10 ? digits.slice(7, 11) : digits.slice(6, 10);

    return [
      ddd ? `(${ddd}` : '',
      ddd.length === 2 ? ')' : '',
      prefixo ? ` ${prefixo}` : '',
      sufixo ? `-${sufixo}` : '',
    ].join('');
  }

  private normalizarDestinatarioParaApi(dados: ContatoFormData): string {
    if (dados.canal === 'WHATSAPP') {
      return normalizePhone(dados.destinatario);
    }

    if (dados.canal === 'EMAIL') {
      return dados.destinatario.trim().toLowerCase();
    }

    return dados.destinatario.trim();
  }

  private toBooleanOrUndefined(value: unknown): boolean | undefined {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }

    return value === true || value === 'true';
  }
}
