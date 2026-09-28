import { MENSAGEM_SAUDACAO_WHATSAPP_PADRAO } from './whatsapp-link.utils';
import { TcTokenAudienciaLinhaResponse } from '../types/dtos';

/** Texto sugerido no link wa.me (opt-in); corpo outbound de confirmação é mais explícito. */
export function textoLinkWaMeConfirmacao(): string {
  return MENSAGEM_SAUDACAO_WHATSAPP_PADRAO;
}

export function montarMensagemPedirConfirmacao(
  linha: TcTokenAudienciaLinhaResponse,
  mensagemInformada?: string | null,
): string {
  const custom = (mensagemInformada ?? '').trim();
  if (custom) {
    return custom;
  }

  let saudacao = 'Olá!';
  if (linha.origens.includes('GITHUB') && linha.nomeExibicao.startsWith('@')) {
    saudacao = `Olá ${linha.nomeExibicao}!`;
  }

  let corpo =
    `${saudacao} Para continuar recebendo avisos por WhatsApp, precisamos manter a conversa ativa.`;

  if (linha.expiraEmDias != null && linha.expiraEmDias > 0) {
    corpo += ` Seu token de conversa expira em cerca de ${Math.round(linha.expiraEmDias)} dia(s).`;
  }

  corpo += ' Responda esta mensagem confirmando que ainda deseja receber notificações.';
  return corpo;
}

export function situacaoElegivelPedirConfirmacao(situacao: TcTokenAudienciaLinhaResponse['situacao']): boolean {
  return situacao === 'PROXIMO_EXPIRAR' || situacao === 'EXPIRADO' || situacao === 'AUSENTE';
}
