import { FormGroup } from '@angular/forms';

import { GithubProjectV2StatusOpcao } from '../../../shared/types/dtos';
import { OrganizacaoConfiguracaoFormData } from '../schemas/organizacao-configuracao-form.schema';

export interface GithubRegraColunaAoEntrar {
  fluxoGeral: boolean;
  prAvaliadores: boolean;
  issueAvaliadores: boolean;
}

export interface GithubRegraColunaDestinatarios {
  modo: 'INHERIT' | 'RESPONSAVEIS' | 'RESPONSAVEIS_E_MOVIMENTADOR' | 'LOGINS_CONFIGURADOS';
  extras: string | null;
}

export interface GithubRegraColunaMensagem {
  usarTemplatePadrao: boolean;
  cenarioId: string | null;
}

export interface GithubRegraColuna {
  nome: string;
  aoEntrar: GithubRegraColunaAoEntrar;
  destinatarios: GithubRegraColunaDestinatarios;
  mensagem: GithubRegraColunaMensagem;
}

export interface GithubRegrasPorStatusDocumento {
  versao: number;
  colunas: Record<string, GithubRegraColuna>;
}

export const VERSAO_REGRAS_POR_STATUS = 1;

export function colunaVazia(nome: string): GithubRegraColuna {
  return {
    nome,
    aoEntrar: { fluxoGeral: false, prAvaliadores: false, issueAvaliadores: false },
    destinatarios: { modo: 'INHERIT', extras: null },
    mensagem: { usarTemplatePadrao: true, cenarioId: null },
  };
}

export function parseRegrasPorStatus(raw: string | null | undefined): GithubRegrasPorStatusDocumento {
  if (!raw?.trim()) {
    return { versao: VERSAO_REGRAS_POR_STATUS, colunas: {} };
  }
  try {
    const parsed = JSON.parse(raw) as GithubRegrasPorStatusDocumento;
    return {
      versao: parsed.versao ?? VERSAO_REGRAS_POR_STATUS,
      colunas: parsed.colunas ?? {},
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
      aoEntrar: {
        fluxoGeral: listaContemNome(v.dsGithubStatusDisparo ?? '', nome),
        prAvaliadores: listaContemNome(v.dsGithubPrStatusDisparo ?? '', nome),
        issueAvaliadores: listaContemNome(v.dsGithubIssueStatusDisparo ?? '', nome),
      },
      destinatarios: { modo: 'INHERIT', extras: null },
      mensagem: { usarTemplatePadrao: true, cenarioId: null },
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
  return coluna.aoEntrar.fluxoGeral || coluna.aoEntrar.prAvaliadores || coluna.aoEntrar.issueAvaliadores;
}

export function persistirRegrasNoForm(form: FormGroup, doc: GithubRegrasPorStatusDocumento): void {
  const control = form.get('dsGithubRegrasPorStatus');
  if (!control) {
    return;
  }
  control.setValue(serializeRegrasPorStatus(doc));
  control.markAsDirty();
}
