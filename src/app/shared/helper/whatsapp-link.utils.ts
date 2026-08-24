import { normalizePhone } from './phone.utils';

export const MENSAGEM_SAUDACAO_WHATSAPP_PADRAO = 'Quero receber notificação!';

export function buildWhatsappMeLink(telefone: string, mensagem: string): string {
  const digits = normalizePhone(telefone);

  if (!digits) {
    return '';
  }

  const texto = mensagem.trim();

  if (!texto) {
    return `https://wa.me/${digits}`;
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(texto)}`;
}

export function chaveMensagemLinkWhatsapp(idOrganizacao: number): string {
  return `whatsapp-link-mensagem:${idOrganizacao}`;
}
