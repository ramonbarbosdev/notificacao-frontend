import type { CanalNotificacao } from '../types/dtos';

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

/** Remove sufixos de JID do WhatsApp (ex: @s.whatsapp.net, :device). */
export function stripWhatsappJid(value: string): string {
  return value.split('@')[0].split(':')[0];
}

function prepararDigitosBrutos(value: string): string {
  let digits = normalizePhone(stripWhatsappJid(value));

  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits;
}

/**
 * Digitos usados apenas para mascara de input (sem corrigir dados ja gravados errados).
 */
function digitsParaMascaraWhatsapp(value: string): string {
  let digits = prepararDigitosBrutos(value);

  if (!digits) {
    return digits;
  }

  if (digits.startsWith('55')) {
    return digits.slice(0, 13);
  }

  digits = digits.slice(0, 11);

  // Nacional com 9 apos DDD (ex: 71981180200)
  if (digits.length >= 3 && digits.charAt(2) === '9') {
    return ('55' + digits).slice(0, 13);
  }

  // Antigo sem 9 apos DDD (ex: 7181180200)
  if (digits.length === 10 && ['7', '8'].includes(digits.charAt(2))) {
    return ('55' + digits.slice(0, 2) + '9' + digits.slice(2)).slice(0, 13);
  }

  return digits;
}

function aplicarRegraAntigaNonoDeslocado(digits: string): string | null {
  if (
    digits.startsWith('55')
    && digits.length === 12
    && digits.charAt(4) === '9'
    && digits.slice(4).length === 8
    && !['7', '8', '9'].includes(digits.charAt(5))
  ) {
    return digits.slice(0, 4) + '98' + digits.slice(5);
  }

  return null;
}

function corrigirOitavoInseridoIndevidamente(digits: string): string {
  if (!digits.startsWith('55') || digits.length !== 13 || digits.charAt(4) !== '9' || digits.charAt(5) !== '8') {
    return digits;
  }

  if (digits.charAt(6) === '9') {
    return digits.slice(0, 5) + digits.slice(6);
  }

  const candidatoDozeDigitos = digits.slice(0, 5) + digits.slice(6);
  if (
    candidatoDozeDigitos.length === 12
    && candidatoDozeDigitos.charAt(4) === '9'
    && candidatoDozeDigitos.charAt(5) === '2'
    && digits.charAt(6) !== '8'
  ) {
    const reproduzido = aplicarRegraAntigaNonoDeslocado(candidatoDozeDigitos);
    if (reproduzido === digits) {
      return digits.slice(0, 5) + '9' + digits.slice(6);
    }
  }

  return digits;
}

/**
 * Normaliza celular BR para E.164 sem + (ex: 5571981180200).
 * Aceita: 10/11 digitos nacionais ou 12/13 com DDI 55.
 */
export function normalizeBrazilWhatsappMobile(value: string): string {
  let digits = prepararDigitosBrutos(value);

  if (!digits) {
    return digits;
  }

  // 11 digitos: DDD + celular com 9 (ex: 71981180200)
  if (digits.length === 11 && digits.charAt(2) === '9') {
    return corrigirOitavoInseridoIndevidamente('55' + digits);
  }

  // 10 digitos: DDD + celular antigo sem 9 (ex: 7181180200)
  if (digits.length === 10 && ['7', '8'].includes(digits.charAt(2))) {
    return corrigirOitavoInseridoIndevidamente('55' + digits.slice(0, 2) + '9' + digits.slice(2));
  }

  // 10 digitos com 9 apos DDD: digitacao incompleta, apenas adiciona DDI
  if (digits.length === 10 && digits.charAt(2) === '9') {
    return corrigirOitavoInseridoIndevidamente('55' + digits);
  }

  // 13 digitos com DDI: ja completo
  if (digits.startsWith('55') && digits.length === 13) {
    if (digits.charAt(4) === '9') {
      return corrigirOitavoInseridoIndevidamente(digits);
    }

    const reprocessado = normalizeBrazilWhatsappMobile(digits.slice(2));
    if (reprocessado.length === 13 && reprocessado.startsWith('55') && reprocessado.charAt(4) === '9') {
      return corrigirOitavoInseridoIndevidamente(reprocessado);
    }
  }

  // 12 digitos com DDI: falta o 9 apos o DDD (ex: 557181180200)
  if (
    digits.startsWith('55')
    && digits.length === 12
    && ['7', '8'].includes(digits.charAt(4))
  ) {
    return corrigirOitavoInseridoIndevidamente(digits.slice(0, 4) + '9' + digits.slice(4));
  }

  // 12 digitos com 9 deslocado (ex: 557191180200 -> 5571981180200)
  if (
    digits.startsWith('55')
    && digits.length === 12
    && digits.charAt(4) === '9'
    && digits.slice(4).length === 8
    && !['7', '8', '9'].includes(digits.charAt(5))
  ) {
    if (digits.charAt(5) === '2') {
      return corrigirOitavoInseridoIndevidamente(digits.slice(0, 4) + '9' + digits.slice(4));
    }

    return corrigirOitavoInseridoIndevidamente(digits.slice(0, 4) + '98' + digits.slice(5));
  }

  return corrigirOitavoInseridoIndevidamente(digits);
}

/** Digitos nacionais sem DDI 55 (ex: 71992864312). */
export function formatPhoneNationalDigits(value: string | null | undefined): string {
  if (!value?.trim()) {
    return '';
  }

  const digits = normalizeBrazilWhatsappMobile(value);

  if (digits.startsWith('55') && digits.length === 13) {
    return digits.slice(2);
  }

  if (digits.length === 11) {
    return digits;
  }

  return digits;
}

/** Mascara progressiva para WhatsApp: +55 (71) 98118-0200 */
export function maskPhoneInput(value: string): string {
  const digits = digitsParaMascaraWhatsapp(value);

  if (!digits) return '';

  if (digits.startsWith('55') && digits.length >= 4) {
    const ddi = digits.slice(0, 2);
    const ddd = digits.slice(2, 4);
    const prefixo = digits.slice(4, 9);
    const sufixo = digits.slice(9, 13);

    return [
      `+${ddi}`,
      ddd ? ` (${ddd}` : '',
      ddd.length === 2 ? ')' : '',
      prefixo ? ` ${prefixo}` : '',
      sufixo ? `-${sufixo}` : '',
    ].join('');
  }

  const ddd = digits.slice(0, 2);
  const prefixo = digits.length > 6 ? digits.slice(2, 7) : digits.slice(2);
  const sufixo = digits.length > 7 ? digits.slice(7, 11) : '';

  return [
    ddd ? `(${ddd}` : '',
    ddd.length === 2 ? ')' : '',
    prefixo ? ` ${prefixo}` : '',
    sufixo ? `-${sufixo}` : '',
  ].join('');
}

export function formatPhone(value: string | null | undefined): string {
  if (!value?.trim()) return '-';

  const digits = normalizeBrazilWhatsappMobile(value);

  if (digits.length === 13 && digits.startsWith('55')) {
    return digits.replace(/^(\d{2})(\d{2})(\d{5})(\d{4})$/, '+$1 ($2) $3-$4');
  }

  if (digits.length === 12 && digits.startsWith('55')) {
    return digits.replace(/^(\d{2})(\d{2})(\d{4})(\d{4})$/, '+$1 ($2) $3-$4');
  }

  if (digits.length === 11 && digits.charAt(2) === '9') {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }

  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }

  return maskPhoneInput(value) || value;
}

/** Formata destinatario conforme o canal (WhatsApp com mascara BR). */
export function formatDestinatario(
  canal: CanalNotificacao | string | null | undefined,
  value: string | null | undefined,
): string {
  if (!value?.trim()) return '-';

  if (canal === 'WHATSAPP') {
    return formatPhone(value);
  }

  return value;
}

/** Compara filtro de busca com destinatario (inclui normalizacao para WhatsApp). */
export function destinatarioMatchesFilter(
  canal: CanalNotificacao | string,
  destinatario: string,
  filtro: string,
): boolean {
  const filtroNormalizado = filtro.trim().toLowerCase();
  if (!filtroNormalizado) return true;

  if (destinatario.toLowerCase().includes(filtroNormalizado)) {
    return true;
  }

  if (canal !== 'WHATSAPP') {
    return false;
  }

  const filtroDigitos = normalizeBrazilWhatsappMobile(filtro);
  const destinatarioDigitos = normalizeBrazilWhatsappMobile(destinatario);

  return (
    destinatarioDigitos.includes(filtroDigitos) ||
    filtroDigitos.includes(destinatarioDigitos)
  );
}
