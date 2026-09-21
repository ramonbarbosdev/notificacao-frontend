import { GithubProjectV2StatusOpcao } from '../../../shared/types/dtos';
import {
  GithubRegraColuna,
  GithubRegrasPorStatusDocumento,
  colunaAtiva,
} from './github-regras-por-status.util';

export type GithubRegrasColunaResumo = 'silenciosa' | 'geral' | 'pr' | 'issue' | 'misto';

export interface GithubRegrasValidacao {
  ok: boolean;
  colunasInvalidas: { optionId: string; nome: string }[];
}

export function resumoColuna(regra: GithubRegraColuna | null): GithubRegrasColunaResumo {
  if (!regra || !colunaAtiva(regra)) {
    return 'silenciosa';
  }
  const { fluxoGeral, prAvaliadores, issueAvaliadores } = regra.aoEntrar;
  const count = [fluxoGeral, prAvaliadores, issueAvaliadores].filter(Boolean).length;
  if (count > 1) {
    return 'misto';
  }
  if (fluxoGeral) {
    return 'geral';
  }
  if (prAvaliadores) {
    return 'pr';
  }
  return 'issue';
}

export function labelResumoColuna(resumo: GithubRegrasColunaResumo): string {
  switch (resumo) {
    case 'silenciosa':
      return 'Silenciosa';
    case 'geral':
      return 'Geral';
    case 'pr':
      return 'PR';
    case 'issue':
      return 'Issue';
    case 'misto':
      return 'Misto';
  }
}

export function labelDestinatarios(regra: GithubRegraColuna): string {
  switch (regra.destinatarios.modo) {
    case 'INHERIT':
      return 'Herdar padrão';
    case 'RESPONSAVEIS':
      return 'Responsáveis';
    case 'RESPONSAVEIS_E_MOVIMENTADOR':
      return 'Resp. + movimentador';
    case 'LOGINS_CONFIGURADOS':
      return 'Logins fixos';
  }
}

export function labelMensagem(regra: GithubRegraColuna, cenarios: Map<string, string>): string {
  if (regra.mensagem.usarTemplatePadrao) {
    return 'Template padrão';
  }
  const id = regra.mensagem.cenarioId;
  if (!id) {
    return 'Cenário não escolhido';
  }
  return cenarios.get(id) ?? id;
}

export function validarDocumentoRegras(doc: GithubRegrasPorStatusDocumento): GithubRegrasValidacao {
  const colunasInvalidas: { optionId: string; nome: string }[] = [];
  for (const [optionId, coluna] of Object.entries(doc.colunas)) {
    if (!coluna?.aoEntrar.fluxoGeral) {
      continue;
    }
    if (!coluna.mensagem.usarTemplatePadrao && !coluna.mensagem.cenarioId?.trim()) {
      colunasInvalidas.push({ optionId, nome: coluna.nome });
    }
  }
  return { ok: colunasInvalidas.length === 0, colunasInvalidas };
}

export function mapaCenariosPorId(
  cenarios: { id: string; label: string }[],
): Map<string, string> {
  return new Map(cenarios.map((c) => [c.id, c.label]));
}

export function filtrarOpcoesColuna(
  opcoes: GithubProjectV2StatusOpcao[],
  busca: string,
  somenteAtivas: boolean,
  doc: GithubRegrasPorStatusDocumento,
): GithubProjectV2StatusOpcao[] {
  const q = busca.trim().toLowerCase();
  return [...opcoes]
    .filter((o) => {
      if (somenteAtivas) {
        const regra = doc.colunas[o.optionId];
        if (!regra || !colunaAtiva(regra)) {
          return false;
        }
      }
      if (!q) {
        return true;
      }
      return o.name.toLowerCase().includes(q);
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
