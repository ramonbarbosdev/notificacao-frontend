import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Check,
  Eye,
  LoaderCircle,
  LucideAngularModule,
  MessageSquareText,
  Play,
  Power,
  PowerOff,
  RefreshCcw,
  Send,
} from 'lucide-angular';
import { Subscription, switchMap } from 'rxjs';

import { TemplateService } from '../../core/services/template.service';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { DataTableColumn } from '../../shared/components/data-table/data-table.types';
import { SidePanelComponent } from '../../shared/components/side-panel/side-panel.component';
import { usePaginatedTable } from '../../shared/helper/paginated-table.state';
import { useSidePanel } from '../../shared/helper/side-panel.state';
import { maskBrlInput } from '../../shared/helper/currency.utils';
import { formatDateTimePtBr } from '../../shared/helper/date.utils';
import { maskPhoneInput, normalizePhone } from '../../shared/helper/phone.utils';
import { STATUS_LABELS } from '../whatsapp/whatsapp.constants';
import {
  CanalNotificacao,
  EnviarNotificacaoResponse,
  TemplateMensagemResponseDTO,
  TemplateVariavelDTO,
  TestarTemplateResponseDTO,
  TipoVariavelTemplate,
  ValidarTemplateResponseDTO,
} from '../../shared/types/dtos';

type AcaoTemplate = 'salvar' | 'status' | 'extrair' | 'validar' | 'teste' | 'envio' | null;
const TEMPLATE_VARIABLE_REGEX = /\{\{\s*([A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_.-]*)\s*\}\}/g;

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    DataTableComponent,
    SidePanelComponent,
  ],
  templateUrl: './templates.component.html',
})
export class TemplatesComponent implements OnInit, OnDestroy {
  private readonly templateService = inject(TemplateService);
  private readonly fb = inject(FormBuilder);
  private readonly subscriptions = new Subscription();

  protected readonly templateIcon = MessageSquareText;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly checkIcon = Check;
  protected readonly previewIcon = Eye;
  protected readonly testIcon = Play;
  protected readonly sendIcon = Send;
  protected readonly activeIcon = Power;
  protected readonly inactiveIcon = PowerOff;
  protected readonly refreshIcon = RefreshCcw;

  readonly table = usePaginatedTable(10);
  readonly templates = signal<TemplateMensagemResponseDTO[]>([]);
  readonly filtros = signal<Record<string, any>>({});
  readonly erro = signal<string | null>(null);
  readonly sucesso = signal<string | null>(null);
  readonly acaoAtual = signal<AcaoTemplate>(null);

  readonly formPanel = useSidePanel<TemplateMensagemResponseDTO>();
  readonly testPanel = useSidePanel<TemplateMensagemResponseDTO>();
  readonly sendPanel = useSidePanel<TemplateMensagemResponseDTO>();

  readonly variaveisEncontradas = signal<string[]>([]);
  readonly variaveis = signal<TemplateVariavelDTO[]>([]);
  readonly resultadoValidacao = signal<ValidarTemplateResponseDTO | null>(null);
  readonly valoresTeste = signal<Record<string, string>>({});
  readonly valoresEnvio = signal<Record<string, string>>({});
  readonly respostaTeste = signal<TestarTemplateResponseDTO | null>(null);
  readonly respostaEnvio = signal<EnviarNotificacaoResponse | null>(null);

  readonly canais: CanalNotificacao[] = ['WHATSAPP', 'EMAIL', 'TELEGRAM', 'WEBHOOK'];
  readonly tiposVariavel: TipoVariavelTemplate[] = [
    'TEXTO',
    'NUMERO',
    'MOEDA',
    'DATA',
    'TELEFONE',
    'EMAIL',
    'URL',
    'BOOLEANO',
  ];

  readonly form = this.fb.group({
    nome: ['', [Validators.required]],
    chave: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    canal: this.fb.control<CanalNotificacao>('WHATSAPP', { nonNullable: true }),
    assunto: [''],
    conteudo: ['', [Validators.required]],
    ativo: this.fb.control(true, { nonNullable: true }),
  });

  readonly sendForm = this.fb.group({
    destinatario: ['', [Validators.required]],
  });

  readonly previewEditor = computed(() =>
    this.renderizarPreview(this.form.controls.conteudo.value ?? '', this.valoresExemplo())
  );

  readonly totalAtivosPagina = computed(
    () => this.templates().filter((template) => template.ativo).length
  );

  readonly columns: DataTableColumn<TemplateMensagemResponseDTO>[] = [
    {
      key: 'nome',
      label: 'Nome',
      filter: {
        type: 'text',
        placeholder: 'Buscar nome/chave',
      },
    },
    {
      key: 'chave',
      label: 'Chave',
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
      key: 'ativo',
      label: 'Status',
      type: 'badge',
      filter: {
        type: 'select',
        options: [
          { label: 'Todos', value: '' },
          { label: 'Ativos', value: 'true' },
          { label: 'Inativos', value: 'false' },
        ],
      },
      badge: (value) =>
        value
          ? {
              label: 'Ativo',
              className:
                'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]',
            }
          : {
              label: 'Inativo',
              className:
                'bg-[var(--color-bg-base)] text-[var(--color-text-muted)] border-[var(--color-border)]',
            },
    },
    {
      key: 'versao',
      label: 'Versao',
      align: 'center',
      formatter: (value) => `v${value ?? 1}`,
    },
    {
      key: 'dtAtualizacao',
      label: 'Atualizado em',
      formatter: (value) => formatDateTimePtBr(value),
    },
    {
      key: 'actions',
      label: 'Acoes',
      type: 'actions',
      align: 'right',
      actions: [
        {
          label: 'Editar',
          action: (row) => this.abrirEdicao(row),
        },
        {
          label: 'Testar',
          action: (row) => this.abrirTeste(row),
        },
        {
          label: 'Enviar',
          action: (row) => this.abrirEnvio(row),
        },
        {
          label: 'Ativar/Inativar',
          action: (row) => this.alternarStatus(row),
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.subscriptions.add(
      this.form.controls.conteudo.valueChanges.subscribe((conteudo) =>
        this.sincronizarVariaveisDoConteudo(conteudo ?? '')
      )
    );

    this.subscriptions.add(
      this.form.controls.nome.valueChanges.subscribe((nome) => {
        if (this.formPanel.item()) return;

        this.form.controls.chave.setValue(this.gerarChave(nome ?? ''), { emitEvent: false });
      })
    );

    this.listarTemplates();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  listarTemplates(): void {
    this.table.loading.set(true);
    this.erro.set(null);

    const filtros = this.filtros();

    this.templateService
      .listar({
        page: this.table.paginaAtual(),
        size: this.table.tamanhoPagina(),
        sort: 'dtAtualizacao,desc',
        termo: filtros['nome'] || undefined,
        canal: filtros['canal'] || undefined,
        ativo: this.toBooleanOrUndefined(filtros['ativo']),
      })
      .subscribe({
        next: (page) => {
          this.templates.set(page.data);
          this.table.atualizarPaginacao(page);
          this.table.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.erro.set(this.mensagemErro(err, 'Nao foi possivel listar os templates.'));
          this.table.loading.set(false);
        },
      });
  }

  aplicarFiltros(filtros: Record<string, any>): void {
    this.filtros.set(filtros);
    this.table.aplicarFiltros(() => this.listarTemplates());
  }

  proximaPagina(): void {
    this.table.proximaPagina(() => this.listarTemplates());
  }

  paginaAnterior(): void {
    this.table.paginaAnterior(() => this.listarTemplates());
  }

  alterarTamanhoPagina(size: number): void {
    this.table.alterarTamanhoPagina(size, () => this.listarTemplates());
  }

  abrirNovo(): void {
    this.form.reset({
      nome: '',
      chave: '',
      canal: 'WHATSAPP',
      assunto: '',
      conteudo: '',
      ativo: true,
    });
    this.variaveisEncontradas.set([]);
    this.variaveis.set([]);
    this.resultadoValidacao.set(null);
    this.limparMensagens();
    this.formPanel.abrir();
  }

  abrirEdicao(template: TemplateMensagemResponseDTO): void {
    this.form.reset({
      nome: template.nome,
      chave: template.chave,
      canal: template.canal,
      assunto: template.assunto ?? '',
      conteudo: template.conteudo,
      ativo: template.ativo,
    });
    this.variaveis.set(this.normalizarVariaveisTemplate(template));
    this.sincronizarVariaveisDoConteudo(template.conteudo);
    this.resultadoValidacao.set(null);
    this.limparMensagens();
    this.formPanel.abrir(template);
  }

  fecharFormulario(): void {
    this.formPanel.fechar();
    this.resultadoValidacao.set(null);
  }

  extrairVariaveisDaApi(): void {
    const conteudo = this.form.controls.conteudo.value?.trim() ?? '';

    if (!conteudo || this.acaoAtual()) return;

    this.acaoAtual.set('extrair');
    this.limparMensagens();

    this.templateService.extrairVariaveis({ conteudo }).subscribe({
      next: (resposta) => {
        this.aplicarVariaveisEncontradas(resposta.variaveis);
        this.sucesso.set('Variaveis extraidas do conteudo.');
        this.acaoAtual.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(this.mensagemErro(err, 'Nao foi possivel extrair variaveis.'));
        this.acaoAtual.set(null);
      },
    });
  }

  salvarTemplate(): void {
    if (this.form.invalid || this.acaoAtual()) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.montarRequest();
    const template = this.formPanel.item();

    this.acaoAtual.set('validar');
    this.limparMensagens();

    this.templateService
      .validar({
        conteudo: request.conteudo,
        variaveis: request.variaveis,
      })
      .pipe(
        switchMap((validacao) => {
          this.resultadoValidacao.set(validacao);

          if (!validacao.valido || validacao.erros.length) {
            throw new Error('VALIDACAO_TEMPLATE');
          }

          this.acaoAtual.set('salvar');
          return template
            ? this.templateService.atualizar(template.idModelo, request)
            : this.templateService.criar(request);
        })
      )
      .subscribe({
        next: () => {
          this.sucesso.set('Template salvo com sucesso.');
          this.acaoAtual.set(null);
          this.formPanel.fechar();
          this.listarTemplates();
        },
        error: (err: HttpErrorResponse | Error) => {
          if (err instanceof Error && err.message === 'VALIDACAO_TEMPLATE') {
            this.erro.set('Corrija os erros de validacao antes de salvar.');
          } else {
            this.erro.set(this.mensagemErro(err as HttpErrorResponse, 'Nao foi possivel salvar o template.'));
          }
          this.acaoAtual.set(null);
        },
      });
  }

  atualizarVariavel(
    index: number,
    campo: keyof TemplateVariavelDTO,
    event: Event
  ): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const rawValue = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;

    this.variaveis.update((variaveis) =>
      variaveis.map((variavel, currentIndex) =>
        currentIndex === index
          ? {
              ...variavel,
              [campo]: campo === 'exemplo' && rawValue === '' ? null : rawValue,
            }
          : variavel
      )
    );
    this.resultadoValidacao.set(null);
  }

  adicionarVariavelManual(): void {
    const base = 'novaVariavel';
    let chave = base;
    let contador = 2;

    while (this.variaveis().some((variavel) => variavel.chave === chave)) {
      chave = `${base}${contador}`;
      contador += 1;
    }

    this.variaveis.update((variaveis) => [...variaveis, this.criarVariavel(chave)]);
  }

  removerVariavel(chave: string): void {
    this.variaveis.update((variaveis) => variaveis.filter((variavel) => variavel.chave !== chave));
    this.resultadoValidacao.set(null);
  }

  variavelUsadaNoConteudo(chave: string): boolean {
    return this.variaveisEncontradas().includes(chave);
  }

  abrirTeste(template: TemplateMensagemResponseDTO): void {
    this.respostaTeste.set(null);
    this.valoresTeste.set(this.criarValoresIniciais(template));
    this.limparMensagens();
    this.testPanel.abrir(template);
  }

  fecharTeste(): void {
    this.testPanel.fechar();
    this.respostaTeste.set(null);
  }

  atualizarValorTeste(variavel: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    this.valoresTeste.update((valores) => ({ ...valores, [variavel]: value }));
  }

  testarTemplate(): void {
    const template = this.testPanel.item();

    if (!template || this.acaoAtual()) return;

    this.acaoAtual.set('teste');
    this.limparMensagens();
    this.respostaTeste.set(null);

    this.templateService
      .testar(template.chave, {
        variaveis: this.valoresTeste(),
      })
      .subscribe({
        next: (resposta) => {
          this.respostaTeste.set(resposta);
          this.acaoAtual.set(null);
        },
        error: (err: HttpErrorResponse) => {
          this.erro.set(this.mensagemErro(err, 'Nao foi possivel testar o template.'));
          this.acaoAtual.set(null);
        },
      });
  }

  abrirEnvio(template: TemplateMensagemResponseDTO): void {
    this.sendForm.reset({ destinatario: '' });
    this.respostaEnvio.set(null);
    this.valoresEnvio.set(this.criarValoresIniciais(template));
    this.limparMensagens();
    this.sendPanel.abrir(template);
  }

  fecharEnvio(): void {
    this.sendPanel.fechar();
    this.respostaEnvio.set(null);
  }

  atualizarDestinatarioEnvio(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valorFormatado = maskPhoneInput(input.value);

    this.sendForm.controls.destinatario.setValue(valorFormatado, { emitEvent: false });
    input.value = valorFormatado;
  }

  atualizarValorEnvio(variavel: string, tipo: TipoVariavelTemplate, event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    if (tipo === 'TELEFONE') {
      value = maskPhoneInput(value);
      input.value = value;
    } else if (tipo === 'MOEDA') {
      value = maskBrlInput(value);
      input.value = value;
    }

    this.valoresEnvio.update((valores) => ({ ...valores, [variavel]: value }));
  }

  labelStatus(status: string): string {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status;
  }

  enviarTemplate(): void {
    const template = this.sendPanel.item();

    if (!template || this.sendForm.invalid || this.acaoAtual()) {
      this.sendForm.markAllAsTouched();
      return;
    }

    const destinatarioBruto = this.sendForm.controls.destinatario.value!.trim();
    const destinatario =
      template.canal === 'WHATSAPP' ? normalizePhone(destinatarioBruto) : destinatarioBruto;

    const variaveis = { ...this.valoresEnvio() };

    for (const variavel of this.variaveisDoTemplate(template)) {
      const valor = variaveis[variavel.chave];

      if (!valor) continue;

      if (variavel.tipo === 'TELEFONE') {
        variaveis[variavel.chave] = normalizePhone(valor);
      } else if (variavel.tipo === 'MOEDA') {
        variaveis[variavel.chave] = valor;
      }
    }

    this.acaoAtual.set('envio');
    this.limparMensagens();
    this.respostaEnvio.set(null);

    this.templateService
      .enviar({
        templateKey: template.chave,
        destinatario,
        variaveis,
      })
      .subscribe({
        next: (resposta) => {
          this.respostaEnvio.set(resposta);
          this.sucesso.set('Notificacao criada na fila com sucesso.');
          this.acaoAtual.set(null);
        },
        error: (err: HttpErrorResponse) => {
          this.erro.set(this.mensagemErro(err, 'Nao foi possivel enviar usando o template.'));
          this.acaoAtual.set(null);
        },
      });
  }

  alternarStatus(template: TemplateMensagemResponseDTO): void {
    if (this.acaoAtual()) return;

    this.acaoAtual.set('status');
    this.limparMensagens();

    const chamada = template.ativo
      ? this.templateService.inativar(template.idModelo)
      : this.templateService.ativar(template.idModelo);

    chamada.subscribe({
      next: () => {
        this.sucesso.set(template.ativo ? 'Template inativado.' : 'Template ativado.');
        this.acaoAtual.set(null);
        this.listarTemplates();
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(this.mensagemErro(err, 'Nao foi possivel alterar o status do template.'));
        this.acaoAtual.set(null);
      },
    });
  }

  variaveisDoTemplate(template: TemplateMensagemResponseDTO | null): TemplateVariavelDTO[] {
    return template ? this.normalizarVariaveisTemplate(template) : [];
  }

  inputType(tipo: TipoVariavelTemplate): string {
    const map: Record<TipoVariavelTemplate, string> = {
      TEXTO: 'text',
      NUMERO: 'number',
      MOEDA: 'text',
      DATA: 'date',
      TELEFONE: 'tel',
      EMAIL: 'email',
      URL: 'url',
      BOOLEANO: 'text',
    };

    return map[tipo];
  }

  previewTemplate(template: TemplateMensagemResponseDTO | null, valores: Record<string, string>): string {
    return template ? this.renderizarPreview(template.conteudo, valores) : '';
  }

  private montarRequest() {
    const dados = this.form.getRawValue();
    const variaveis = this.variaveis().map((variavel) => ({
      ...variavel,
      chave: variavel.chave.trim(),
      label: variavel.label.trim() || this.humanizarVariavel(variavel.chave),
      exemplo: variavel.exemplo?.trim() || null,
    }));

    return {
      nome: dados.nome!.trim(),
      chave: this.gerarChave(dados.chave!),
      canal: dados.canal,
      assunto: dados.assunto?.trim() || null,
      conteudo: dados.conteudo!.trim(),
      ativo: dados.ativo,
      variaveis,
      variaveisObrigatorias: variaveis
        .filter((variavel) => variavel.obrigatoria)
        .map((variavel) => variavel.chave),
    };
  }

  private sincronizarVariaveisDoConteudo(conteudo: string): void {
    this.aplicarVariaveisEncontradas(this.extrairVariaveisLocal(conteudo));
  }

  private aplicarVariaveisEncontradas(chaves: string[]): void {
    const unicas = Array.from(new Set(chaves));

    this.variaveisEncontradas.set(unicas);
    this.variaveis.update((atuais) => {
      const existentes = atuais.map((variavel) => variavel.chave);
      const novas = unicas
        .filter((chave) => !existentes.includes(chave))
        .map((chave) => this.criarVariavel(chave));

      return [...atuais, ...novas];
    });
    this.resultadoValidacao.set(null);
  }

  private criarVariavel(chave: string): TemplateVariavelDTO {
    return {
      chave,
      label: this.humanizarVariavel(chave),
      tipo: 'TEXTO',
      obrigatoria: true,
      exemplo: this.valorExemplo(chave),
    };
  }

  private normalizarVariaveisTemplate(template: TemplateMensagemResponseDTO): TemplateVariavelDTO[] {
    if (template.variaveis?.length) {
      return template.variaveis.map((variavel) => ({
        chave: variavel.chave,
        label: variavel.label || this.humanizarVariavel(variavel.chave),
        tipo: variavel.tipo || 'TEXTO',
        obrigatoria: variavel.obrigatoria,
        exemplo: variavel.exemplo ?? this.valorExemplo(variavel.chave),
      }));
    }

    const obrigatorias = template.variaveisObrigatorias?.length
      ? template.variaveisObrigatorias
      : this.extrairVariaveisLocal(template.conteudo);

    return obrigatorias.map((chave) => this.criarVariavel(chave));
  }

  private extrairVariaveisLocal(conteudo: string): string[] {
    const matches = conteudo.matchAll(TEMPLATE_VARIABLE_REGEX);

    return Array.from(new Set(Array.from(matches, (match) => match[1])));
  }

  private valoresExemplo(): Record<string, string> {
    return this.variaveis().reduce((acc, variavel) => {
      acc[variavel.chave] = variavel.exemplo || this.valorExemplo(variavel.chave);
      return acc;
    }, {} as Record<string, string>);
  }

  private criarValoresIniciais(template: TemplateMensagemResponseDTO): Record<string, string> {
    return this.variaveisDoTemplate(template).reduce((acc, variavel) => {
      acc[variavel.chave] = variavel.exemplo || this.valorExemplo(variavel.chave);
      return acc;
    }, {} as Record<string, string>);
  }

  private valorExemplo(variavel: string): string {
    const exemplos: Record<string, string> = {
      nome: 'Ramon',
      numeroPedido: '12345',
      valor: 'R$ 150,00',
      codigo: 'ABC123',
      data: '2026-05-17',
      cliente: 'Ramon',
    };

    return exemplos[variavel] ?? this.humanizarVariavel(variavel);
  }

  private humanizarVariavel(variavel: string): string {
    const texto = variavel
      .replace(/[_.-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();

    if (!texto) return 'Exemplo';

    return texto
      .split(' ')
      .filter(Boolean)
      .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
      .join(' ');
  }

  private renderizarPreview(conteudo: string, valores: Record<string, string>): string {
    return conteudo.replace(TEMPLATE_VARIABLE_REGEX, (_, variavel: string) => {
      return valores[variavel] || `{{${variavel}}}`;
    });
  }

  private gerarChave(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private mensagemErro(err: HttpErrorResponse, fallback: string): string {
    const mensagemApi = err.error?.mensagem ?? err.error?.erro ?? err.error?.message;

    if (mensagemApi) return mensagemApi;

    if (err.status === 400) {
      return 'Verifique os dados do template ou as variaveis obrigatorias.';
    }

    if (err.status === 403) {
      return 'O contato nao possui consentimento ativo ou esta bloqueado para este canal.';
    }

    if (err.status === 404) {
      return 'Template nao encontrado.';
    }

    if (err.status === 409) {
      return 'Este template esta inativo, ja existe ou nao pode ser usado nesta operacao.';
    }

    return fallback;
  }

  private limparMensagens(): void {
    this.erro.set(null);
    this.sucesso.set(null);
  }

  private toBooleanOrUndefined(value: unknown): boolean | undefined {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }

    return value === true || value === 'true';
  }
}
