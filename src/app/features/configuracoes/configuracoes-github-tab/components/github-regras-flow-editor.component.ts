import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  computed,
  output,
  signal,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ArrowRight, Check, LayoutGrid, Link2, PencilLine } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';

import {
  GithubProjectV2StatusOpcao,
  GithubWebhookTemplateCenario,
} from '../../../../shared/types/dtos';
import { GithubLoginSugerido } from '../github-logins-lista.util';
import { GithubLoginsConfiguradosPickerComponent } from './github-logins-configurados-picker.component';
import { corStatusGithubProject } from '../github-status-color.util';
import {
  labelDestinatarios,
  labelMensagem,
  labelResumoColuna,
  mapaCenariosPorId,
  resumoColuna,
  filtrarOpcoesColuna,
} from '../github-regras-flow.util';
import {
  GithubGatilhoColunaCodigo,
  GithubRegraColuna,
  GithubRegraMensagemModo,
  GithubRegrasPorStatusDocumento,
  GATILHOS_PADRAO_COLUNA,
  derivarRegrasDoFormLegacy,
  gatilhosEfetivosColuna,
  mesclarOpcoesKanban,
  modoMensagemColuna,
  parseRegrasPorStatus,
  persistirRegrasNoForm,
  cenariosTemplateEditor,
} from '../github-regras-por-status.util';
import {
  GITHUB_GATILHOS_FILTRO_STATUS_GERAL,
  GithubGatilhoFiltroOpcao,
  parseGatilhosComFiltroStatusGeral,
} from './github-status-disparo-gatilhos.component';

export type GithubFlowNoEdicao = 'tipos' | 'destinatarios' | 'mensagem' | null;

export type GithubFlowEditarMensagemEvento =
  | { modo: 'padrao' }
  | { modo: 'cenario'; cenarioId: string };

@Component({
  selector: 'app-github-regras-flow-editor',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, GithubLoginsConfiguradosPickerComponent],
  templateUrl: './github-regras-flow-editor.component.html',
})
export class GithubRegrasFlowEditorComponent implements OnChanges {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) statusOpcoes: GithubProjectV2StatusOpcao[] = [];
  @Input() conexaoOk = false;
  @Input() kanbanOk = false;
  @Input() cenariosPreview: GithubWebhookTemplateCenario[] = [];
  @Input() loginsGithubSugeridos: GithubLoginSugerido[] = [];
  @Input() carregandoLoginsGithub = false;

  readonly irParaSecao = output<'conexao' | 'kanban' | 'mensagem'>();
  readonly abrirEventosGerais = output<void>();
  readonly editarMensagem = output<GithubFlowEditarMensagemEvento>();

  protected readonly linkIcon = Link2;
  protected readonly gridIcon = LayoutGrid;
  protected readonly checkIcon = Check;
  protected readonly arrowIcon = ArrowRight;
  protected readonly editIcon = PencilLine;
  protected readonly corStatus = corStatusGithubProject;

  protected readonly gatilhosColunaOpcoes = GITHUB_GATILHOS_FILTRO_STATUS_GERAL;

  readonly documento = signal<GithubRegrasPorStatusDocumento>({ versao: 1, colunas: {} });
  readonly colunaSelecionadaId = signal<string | null>(null);
  readonly noEdicao = signal<GithubFlowNoEdicao>(null);
  readonly buscaColuna = signal('');
  readonly somenteAtivas = signal(false);

  readonly cenariosEditor = computed(() => cenariosTemplateEditor(this.cenariosPreview));

  readonly cenariosMap = computed(() => mapaCenariosPorId(this.cenariosEditor()));

  readonly opcoesFiltradas = computed(() =>
    filtrarOpcoesColuna(
      this.statusOpcoes,
      this.buscaColuna(),
      this.somenteAtivas(),
      this.documento(),
    ),
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['statusOpcoes'] || changes['form']) {
      this.recarregarDocumento();
    }
    if (changes['statusOpcoes'] && this.statusOpcoes.length > 0 && !this.colunaSelecionadaId()) {
      const ordenadas = [...this.statusOpcoes].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      this.colunaSelecionadaId.set(ordenadas[0]?.optionId ?? null);
    }
  }

  /** Garante que o JSON do fluxograma está no form antes do PATCH. */
  persistirDocumentoAtualNoForm(): void {
    persistirRegrasNoForm(this.form, this.documento());
  }

  recarregarDocumento(): void {
    const raw = String(this.form.get('dsGithubRegrasPorStatus')?.value ?? '');
    let doc = parseRegrasPorStatus(raw);
    const temJson = raw.trim().length > 0;
    if (!temJson && this.statusOpcoes.length > 0) {
      doc = derivarRegrasDoFormLegacy(this.form, this.statusOpcoes);
    }
    doc = mesclarOpcoesKanban(doc, this.statusOpcoes);
    this.documento.set(doc);
    const devePersistir =
      temJson ||
      this.form.get('dsGithubRegrasPorStatus')?.dirty ||
      (!temJson && this.statusOpcoes.length > 0);
    if (devePersistir) {
      persistirRegrasNoForm(this.form, doc);
    }
  }

  selecionarColuna(optionId: string): void {
    this.colunaSelecionadaId.set(optionId);
    this.noEdicao.set(null);
  }

  abrirNo(no: GithubFlowNoEdicao): void {
    this.noEdicao.set(this.noEdicao() === no ? null : no);
  }

  regra(optionId: string): GithubRegraColuna | null {
    return this.documento().colunas[optionId] ?? null;
  }

  regraSelecionada(): GithubRegraColuna | null {
    const id = this.colunaSelecionadaId();
    return id ? this.regra(id) : null;
  }

  opcaoSelecionada(): GithubProjectV2StatusOpcao | null {
    const id = this.colunaSelecionadaId();
    if (!id) {
      return null;
    }
    return this.statusOpcoes.find((o) => o.optionId === id) ?? null;
  }

  resumo(optionId: string): string {
    return labelResumoColuna(resumoColuna(this.regra(optionId)));
  }

  patchColuna(optionId: string, patch: Partial<GithubRegraColuna>): void {
    const doc = { ...this.documento(), colunas: { ...this.documento().colunas } };
    const atual = doc.colunas[optionId];
    if (!atual) {
      return;
    }
    doc.colunas[optionId] = {
      ...atual,
      ...patch,
      aoEntrar: { ...atual.aoEntrar, ...(patch.aoEntrar ?? {}) },
      destinatarios: { ...atual.destinatarios, ...(patch.destinatarios ?? {}) },
      mensagem: { ...atual.mensagem, ...(patch.mensagem ?? {}) },
    };
    this.documento.set(doc);
    persistirRegrasNoForm(this.form, doc);
  }

  toggleNotificarAoEntrar(optionId: string, valor: boolean): void {
    const regra = this.regra(optionId);
    if (!regra) {
      return;
    }
    const gatilhos =
      valor && (regra.gatilhos?.length ?? 0) === 0
        ? [...GATILHOS_PADRAO_COLUNA]
        : regra.gatilhos;
    this.patchColuna(optionId, {
      aoEntrar: { fluxoGeral: valor, prAvaliadores: false, issueAvaliadores: false },
      ...(gatilhos ? { gatilhos } : {}),
    });
  }

  gatilhoColunaMarcado(regra: GithubRegraColuna, codigo: string): boolean {
    return gatilhosEfetivosColuna(regra).includes(codigo as GithubGatilhoColunaCodigo);
  }

  gatilhoConfiguravelNaColuna(op: GithubGatilhoFiltroOpcao): boolean {
    const noFiltroGlobal = parseGatilhosComFiltroStatusGeral(
      this.form.get('dsGithubStatusDisparoGatilhos')?.value,
    ).has(op.codigo);
    if (!noFiltroGlobal) {
      return false;
    }
    if (!op.requerGatilho) {
      return true;
    }
    return !!this.form.get(op.requerGatilho)?.value;
  }

  alternarGatilhoColuna(optionId: string, codigo: GithubGatilhoColunaCodigo, marcado: boolean): void {
    const regra = this.regra(optionId);
    if (!regra) {
      return;
    }
    const set = new Set(gatilhosEfetivosColuna(regra));
    if (marcado) {
      set.add(codigo);
    } else {
      set.delete(codigo);
    }
    const ordenados = [...set].sort() as GithubGatilhoColunaCodigo[];
    this.patchColuna(optionId, {
      gatilhos: ordenados.length > 0 ? ordenados : [...GATILHOS_PADRAO_COLUNA],
    });
  }

  alterarDestinatariosModo(optionId: string, modo: GithubRegraColuna['destinatarios']['modo']): void {
    const regra = this.regra(optionId);
    if (!regra) {
      return;
    }
    this.patchColuna(optionId, { destinatarios: { ...regra.destinatarios, modo } });
  }

  alterarDestinatariosExtras(optionId: string, extras: string | null): void {
    const regra = this.regra(optionId);
    if (!regra) {
      return;
    }
    const valor = extras?.trim() || null;
    this.patchColuna(optionId, {
      destinatarios: { ...regra.destinatarios, extras: valor },
    });
  }

  modoMensagem(regra: GithubRegraColuna): GithubRegraMensagemModo {
    return modoMensagemColuna(regra.mensagem);
  }

  alterarModoMensagem(optionId: string, modo: GithubRegraMensagemModo): void {
    const regra = this.regra(optionId);
    if (!regra) {
      return;
    }
    const base = { ...regra.mensagem };
    if (modo === 'padrao') {
      this.patchColuna(optionId, {
        mensagem: {
          ...base,
          usarTemplatePadrao: true,
          textoProprioColuna: false,
          cenarioId: null,
          assuntoColuna: null,
          mensagemColuna: null,
        },
      });
      return;
    }
    if (modo === 'cenario') {
      this.patchColuna(optionId, {
        mensagem: {
          ...base,
          usarTemplatePadrao: false,
          textoProprioColuna: false,
          assuntoColuna: null,
          mensagemColuna: null,
        },
      });
      return;
    }
    this.patchColuna(optionId, {
      mensagem: {
        ...base,
        usarTemplatePadrao: false,
        textoProprioColuna: true,
        cenarioId: null,
      },
    });
  }

  alterarMensagemCenario(optionId: string, cenarioId: string): void {
    const regra = this.regra(optionId);
    if (!regra) {
      return;
    }
    this.patchColuna(optionId, {
      mensagem: {
        ...regra.mensagem,
        usarTemplatePadrao: false,
        textoProprioColuna: false,
        cenarioId: cenarioId.trim() || null,
        assuntoColuna: null,
        mensagemColuna: null,
      },
    });
  }

  alterarMensagemColunaAssunto(optionId: string, assunto: string): void {
    const regra = this.regra(optionId);
    if (!regra) {
      return;
    }
    this.patchColuna(optionId, {
      mensagem: { ...regra.mensagem, assuntoColuna: assunto.trim() || null },
    });
  }

  alterarMensagemColunaCorpo(optionId: string, corpo: string): void {
    const regra = this.regra(optionId);
    if (!regra) {
      return;
    }
    this.patchColuna(optionId, {
      mensagem: { ...regra.mensagem, mensagemColuna: corpo.trim() ? corpo : null },
    });
  }

  destinatariosLabel(regra: GithubRegraColuna): string {
    return labelDestinatarios(regra);
  }

  mensagemLabel(regra: GithubRegraColuna): string {
    return labelMensagem(regra, this.cenariosMap());
  }

  podeEditarTextoMensagem(regra: GithubRegraColuna): boolean {
    const modo = this.modoMensagem(regra);
    if (modo === 'coluna') {
      return false;
    }
    if (modo === 'padrao') {
      return true;
    }
    return !!regra.mensagem.cenarioId?.trim();
  }

  solicitarEditarTextoMensagem(regra: GithubRegraColuna): void {
    const modo = this.modoMensagem(regra);
    if (modo === 'padrao') {
      this.editarMensagem.emit({ modo: 'padrao' });
      return;
    }
    if (modo === 'cenario') {
      const cenarioId = regra.mensagem.cenarioId?.trim();
      if (cenarioId) {
        this.editarMensagem.emit({ modo: 'cenario', cenarioId });
      }
    }
  }
}
