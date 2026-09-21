import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  TemplateRef,
  output,
  signal,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Check, LayoutGrid, Link2, X } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';

import {
  GithubProjectV2StatusOpcao,
  GithubWebhookTemplateCenario,
} from '../../../../shared/types/dtos';
import { corStatusGithubProject } from '../github-status-color.util';
import {
  GithubRegraColuna,
  GithubRegrasPorStatusDocumento,
  colunaAtiva,
  derivarRegrasDoFormLegacy,
  mesclarOpcoesKanban,
  parseRegrasPorStatus,
  persistirRegrasNoForm,
} from '../github-regras-por-status.util';
import { GithubRegrasGlobalPanelComponent } from './github-regras-global-panel.component';

@Component({
  selector: 'app-github-regras-board',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, GithubRegrasGlobalPanelComponent],
  templateUrl: './github-regras-board.component.html',
})
export class GithubRegrasBoardComponent implements OnChanges {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) statusOpcoes: GithubProjectV2StatusOpcao[] = [];
  @Input({ required: true }) campoErro!: (campo: string) => string | null;
  @Input() conexaoOk = false;
  @Input() kanbanOk = false;
  @Input() cenariosPreview: GithubWebhookTemplateCenario[] = [];
  @Input() sugestoesLoginsExtras: TemplateRef<unknown> | null = null;
  @Input() sugestoesLoginsPr: TemplateRef<unknown> | null = null;

  readonly irParaSecao = output<'conexao' | 'kanban' | 'eventos'>();

  protected readonly linkIcon = Link2;
  protected readonly gridIcon = LayoutGrid;
  protected readonly checkIcon = Check;
  protected readonly closeIcon = X;
  protected readonly corStatus = corStatusGithubProject;

  readonly documento = signal<GithubRegrasPorStatusDocumento>({ versao: 1, colunas: {} });
  readonly colunaSelecionadaId = signal<string | null>(null);
  readonly modoMatriz = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['statusOpcoes'] || changes['form']) {
      this.recarregarDocumento();
    }
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
    if (temJson || this.form.get('dsGithubRegrasPorStatus')?.dirty) {
      persistirRegrasNoForm(this.form, doc);
    }
  }

  colunasOrdenadas(): GithubProjectV2StatusOpcao[] {
    return [...this.statusOpcoes].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  regra(optionId: string): GithubRegraColuna | null {
    return this.documento().colunas[optionId] ?? null;
  }

  selecionarColuna(optionId: string): void {
    this.colunaSelecionadaId.set(optionId);
  }

  fecharDrawer(): void {
    this.colunaSelecionadaId.set(null);
  }

  alternarModoMatriz(): void {
    this.modoMatriz.update((v) => !v);
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

  toggleAoEntrar(
    optionId: string,
    campo: 'fluxoGeral' | 'prAvaliadores' | 'issueAvaliadores',
    valor?: boolean,
  ): void {
    const regra = this.regra(optionId);
    if (!regra) {
      return;
    }
    const novo = valor ?? !regra.aoEntrar[campo];
    this.patchColuna(optionId, {
      aoEntrar: { ...regra.aoEntrar, [campo]: novo },
    });
  }

  alterarDestinatariosModo(optionId: string, modo: GithubRegraColuna['destinatarios']['modo']): void {
    const regra = this.regra(optionId);
    if (!regra) {
      return;
    }
    this.patchColuna(optionId, {
      destinatarios: { ...regra.destinatarios, modo },
    });
  }

  alterarDestinatariosExtras(optionId: string, extras: string): void {
    const regra = this.regra(optionId);
    if (!regra) {
      return;
    }
    this.patchColuna(optionId, {
      destinatarios: { ...regra.destinatarios, extras: extras.trim() || null },
    });
  }

  alterarMensagemTemplatePadrao(optionId: string, usarTemplatePadrao: boolean): void {
    const regra = this.regra(optionId);
    if (!regra) {
      return;
    }
    this.patchColuna(optionId, {
      mensagem: { ...regra.mensagem, usarTemplatePadrao },
    });
  }

  alterarMensagemCenario(optionId: string, cenarioId: string): void {
    const regra = this.regra(optionId);
    if (!regra) {
      return;
    }
    this.patchColuna(optionId, {
      mensagem: { ...regra.mensagem, cenarioId: cenarioId.trim() || null },
    });
  }

  colunaAtiva(optionId: string): boolean {
    const regra = this.regra(optionId);
    return regra ? colunaAtiva(regra) : false;
  }

  badgesColuna(optionId: string): string[] {
    const regra = this.regra(optionId);
    if (!regra) {
      return [];
    }
    const b: string[] = [];
    if (regra.aoEntrar.fluxoGeral) {
      b.push('Geral');
    }
    if (regra.aoEntrar.prAvaliadores) {
      b.push('PR');
    }
    if (regra.aoEntrar.issueAvaliadores) {
      b.push('Issue');
    }
    if (regra.destinatarios.modo !== 'INHERIT') {
      b.push('Dest.');
    }
    if (!regra.mensagem.usarTemplatePadrao && regra.mensagem.cenarioId) {
      b.push('Msg');
    }
    return b;
  }
}
