import { FormGroup } from '@angular/forms';

import { GithubProjectV2StatusOpcao } from '../../../shared/types/dtos';
import { OrganizacaoConfiguracaoFormData } from '../../integracoes/github/schemas/github-integracao-form.schema';

export interface GithubRegraColunaAoEntrar {
  fluxoGeral: boolean;
  prAvaliadores: boolean;
  issueAvaliadores: boolean;
}

export interface GithubRegraColunaDestinatarios {
  modo: 'INHERIT' | 'RESPONSAVEIS' | 'RESPONSAVEIS_E_MOVIMENTADOR' | 'LOGINS_CONFIGURADOS';
  extras: string | null;
}

export type GithubRegraMensagemModo = 'padrao' | 'cenario' | 'coluna';

export interface GithubRegraColunaMensagem {
  usarTemplatePadrao: boolean;
  cenarioId: string | null;
  textoProprioColuna?: boolean;
  assuntoColuna?: string | null;
  mensagemColuna?: string | null;
}

export function modoMensagemColuna(mensagem: GithubRegraColunaMensagem): GithubRegraMensagemModo {
  if (mensagem.usarTemplatePadrao) {
    return 'padrao';
  }
  if (mensagem.textoProprioColuna) {
    return 'coluna';
  }
  return 'cenario';
}

/** Códigos de gatilho (mesmos nomes da API Java). */
export type GithubGatilhoColunaCodigo =
  | 'STATUS_ALTERADO'
  | 'REORDENADO'
  | 'TAREFA_CRIADA'
  | 'RESPONSAVEL_ALTERADO'
  | 'TAREFA_ATRIBUIDA'
  | 'ISSUE_FECHADA_REABERTA'
  | 'ISSUE_LABEL';

export const GATILHOS_PADRAO_COLUNA: GithubGatilhoColunaCodigo[] = ['STATUS_ALTERADO'];

export interface GithubRegraColuna {
  nome: string;
  aoEntrar: GithubRegraColunaAoEntrar;
  /** Vazio na persistência = só STATUS_ALTERADO na API. */
  gatilhos?: GithubGatilhoColunaCodigo[];
  destinatarios: GithubRegraColunaDestinatarios;
  mensagem: GithubRegraColunaMensagem;
}

export interface GithubRegrasPorStatusDocumento {
  versao: number;
  colunas: Record<string, GithubRegraColuna>;
}

export const VERSAO_REGRAS_POR_STATUS = 1;

export function gatilhosEfetivosColuna(col: GithubRegraColuna): GithubGatilhoColunaCodigo[] {
  const lista = col.gatilhos?.filter(Boolean) ?? [];
  return lista.length > 0 ? lista : GATILHOS_PADRAO_COLUNA;
}

export function colunaVazia(nome: string): GithubRegraColuna {
  return {
    nome,
    aoEntrar: { fluxoGeral: false, prAvaliadores: false, issueAvaliadores: false },
    gatilhos: [...GATILHOS_PADRAO_COLUNA],
    destinatarios: { modo: 'INHERIT', extras: null },
    mensagem: {
      usarTemplatePadrao: true,
      cenarioId: null,
      textoProprioColuna: false,
      assuntoColuna: null,
      mensagemColuna: null,
    },
  };
}

function normalizarAoEntrar(ao: GithubRegraColunaAoEntrar): GithubRegraColunaAoEntrar {
  if (ao.prAvaliadores || ao.issueAvaliadores) {
    return { fluxoGeral: true, prAvaliadores: false, issueAvaliadores: false };
  }
  return ao;
}

function normalizarColuna(coluna: GithubRegraColuna): GithubRegraColuna {
  return {
    ...coluna,
    aoEntrar: normalizarAoEntrar(coluna.aoEntrar ?? colunaVazia(coluna.nome).aoEntrar),
  };
}

export function parseRegrasPorStatus(raw: string | null | undefined): GithubRegrasPorStatusDocumento {
  if (!raw?.trim()) {
    return { versao: VERSAO_REGRAS_POR_STATUS, colunas: {} };
  }
  try {
    const parsed = JSON.parse(raw) as GithubRegrasPorStatusDocumento;
    const colunas: Record<string, GithubRegraColuna> = {};
    for (const [id, col] of Object.entries(parsed.colunas ?? {})) {
      colunas[id] = normalizarColuna(col);
    }
    return {
      versao: parsed.versao ?? VERSAO_REGRAS_POR_STATUS,
      colunas,
    };
  } catch {
    return { versao: VERSAO_REGRAS_POR_STATUS, colunas: {} };
  }
}

export function serializeRegrasPorStatus(doc: GithubRegrasPorStatusDocumento): string {
  return JSON.stringify({ versao: VERSAO_REGRAS_POR_STATUS, colunas: doc.colunas });
}

function nomesLista(raw: string | null | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(/[,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function listaContemNome(lista: string, nome: string): boolean {
  return nomesLista(lista).some((n) => n.toLowerCase() === nome.toLowerCase());
}

/** Deriva documento a partir do form quando ainda não há JSON salvo. */
export function derivarRegrasDoFormLegacy(
  form: FormGroup,
  opcoes: GithubProjectV2StatusOpcao[],
): GithubRegrasPorStatusDocumento {
  const v = form.value as Partial<OrganizacaoConfiguracaoFormData>;
  const doc: GithubRegrasPorStatusDocumento = {
    versao: VERSAO_REGRAS_POR_STATUS,
    colunas: {},
  };
  for (const opcao of opcoes) {
    const nome = opcao.name;
    doc.colunas[opcao.optionId] = {
      nome,
      aoEntrar: normalizarAoEntrar({
        fluxoGeral:
          listaContemNome(v.dsGithubStatusDisparo ?? '', nome) ||
          listaContemNome(v.dsGithubPrStatusDisparo ?? '', nome) ||
          listaContemNome(v.dsGithubIssueStatusDisparo ?? '', nome),
        prAvaliadores: false,
        issueAvaliadores: false,
      }),
      destinatarios: { modo: 'INHERIT', extras: null },
      mensagem: {
      usarTemplatePadrao: true,
      cenarioId: null,
      textoProprioColuna: false,
      assuntoColuna: null,
      mensagemColuna: null,
    },
    };
  }
  return doc;
}

export function mesclarOpcoesKanban(
  doc: GithubRegrasPorStatusDocumento,
  opcoes: GithubProjectV2StatusOpcao[],
): GithubRegrasPorStatusDocumento {
  const colunas: Record<string, GithubRegraColuna> = { ...doc.colunas };
  for (const opcao of opcoes) {
    const existente = colunas[opcao.optionId];
    if (existente) {
      colunas[opcao.optionId] = { ...existente, nome: opcao.name };
    } else {
      colunas[opcao.optionId] = colunaVazia(opcao.name);
    }
  }
  return { versao: VERSAO_REGRAS_POR_STATUS, colunas };
}

export function colunaAtiva(coluna: GithubRegraColuna): boolean {
  return coluna.aoEntrar.fluxoGeral;
}

export const CENARIO_TEMPLATE_PR_AVALIADORES_LEGADO = 'projects_v2_pr_status';

export function cenariosTemplateEditor(
  cenarios: { id: string; label: string }[],
): { id: string; label: string }[] {
  return cenarios.filter((c) => c.id !== CENARIO_TEMPLATE_PR_AVALIADORES_LEGADO);
}

export function persistirRegrasNoForm(form: FormGroup, doc: GithubRegrasPorStatusDocumento): void {
  const control = form.get('dsGithubRegrasPorStatus');
  if (!control) {
    return;
  }
  control.setValue(serializeRegrasPorStatus(doc));
  control.markAsDirty();
}
