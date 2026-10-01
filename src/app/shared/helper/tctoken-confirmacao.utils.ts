import { MENSAGEM_SAUDACAO_WHATSAPP_PADRAO } from './whatsapp-link.utils';
import { TcTokenAudienciaLinhaResponse } from '../types/dtos';

export const TCTOKEN_CONFIRMACAO_PLACEHOLDER_LOGIN = '{login}';
export const TCTOKEN_CONFIRMACAO_PLACEHOLDER_DIAS = '{diasRestantes}';

/** Texto sugerido no link wa.me (opt-in); corpo outbound de confirmação é mais explícito. */
export function textoLinkWaMeConfirmacao(): string {
  return MENSAGEM_SAUDACAO_WHATSAPP_PADRAO;
}

function resolverLoginPlaceholder(linha: TcTokenAudienciaLinhaResponse): string {
  if (linha.origens.includes('GITHUB') && linha.nomeExibicao.startsWith('@')) {
    return linha.nomeExibicao;
  }
  return '';
}

function resolverDiasPlaceholder(linha: TcTokenAudienciaLinhaResponse): string {
  if (linha.expiraEmDias == null) {
    return '—';
  }
  return String(Math.round(linha.expiraEmDias));
}

export function montarMensagemSistemaPedirConfirmacao(linha: TcTokenAudienciaLinhaResponse): string {
  let saudacao = 'Ola!';
  const login = resolverLoginPlaceholder(linha);
  if (login) {
    saudacao = `Ola ${login}!`;
  }

  let corpo =
    `${saudacao} Para continuar recebendo avisos por WhatsApp, precisamos manter a conversa ativa.`;

  if (linha.expiraEmDias != null && linha.expiraEmDias > 0) {
    corpo += ` Seu token de conversa expira em cerca de ${Math.round(linha.expiraEmDias)} dia(s).`;
  }

  corpo += ' Responda esta mensagem confirmando que ainda deseja receber notificacoes.';
  return corpo;
}

function aplicarTemplateOrganizacao(template: string, linha: TcTokenAudienciaLinhaResponse): string {
  return template
    .replaceAll(TCTOKEN_CONFIRMACAO_PLACEHOLDER_LOGIN, resolverLoginPlaceholder(linha))
    .replaceAll(TCTOKEN_CONFIRMACAO_PLACEHOLDER_DIAS, resolverDiasPlaceholder(linha));
}

export function montarMensagemPedirConfirmacao(
  linha: TcTokenAudienciaLinhaResponse,
  mensagemInformada?: string | null,
  templateOrganizacao?: string | null,
): string {
  const custom = (mensagemInformada ?? '').trim();
  if (custom) {
    return custom;
  }

  const template = (templateOrganizacao ?? '').trim();
  if (template) {
    return aplicarTemplateOrganizacao(template, linha);
  }

  return montarMensagemSistemaPedirConfirmacao(linha);
}

export function situacaoElegivelPedirConfirmacao(situacao: TcTokenAudienciaLinhaResponse['situacao']): boolean {
  return situacao === 'PROXIMO_EXPIRAR' || situacao === 'EXPIRADO' || situacao === 'AUSENTE';
}
