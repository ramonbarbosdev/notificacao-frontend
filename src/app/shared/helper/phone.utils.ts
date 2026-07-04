export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

/** Máscara progressiva para WhatsApp: +55 (71) 99118-0200 */
export function maskPhoneInput(value: string): string {
  const digits = normalizePhone(value).slice(0, 13);

  if (!digits) return '';

  if (digits.startsWith('55')) {
    const ddi = digits.slice(0, 2);
    const ddd = digits.slice(2, 4);
    const prefixo = digits.length > 12 ? digits.slice(4, 9) : digits.slice(4, 8);
    const sufixo = digits.length > 12 ? digits.slice(9, 13) : digits.slice(8, 12);

    return [
      `+${ddi}`,
      ddd ? ` (${ddd}` : '',
      ddd.length === 2 ? ')' : '',
      prefixo ? ` ${prefixo}` : '',
      sufixo ? `-${sufixo}` : '',
    ].join('');
  }

  const ddd = digits.slice(0, 2);
  const prefixo = digits.length > 10 ? digits.slice(2, 7) : digits.slice(2, 6);
  const sufixo = digits.length > 10 ? digits.slice(7, 11) : digits.slice(6, 10);

  return [
    ddd ? `(${ddd}` : '',
    ddd.length === 2 ? ')' : '',
    prefixo ? ` ${prefixo}` : '',
    sufixo ? `-${sufixo}` : '',
  ].join('');
}

export function formatPhone(value: string | null | undefined): string {
  if (!value) return '-';

  const digits = normalizePhone(value);

  if (digits.length === 13 && digits.startsWith('55')) {
    return digits.replace(/^(\d{2})(\d{2})(\d{5})(\d{4})$/, '+$1 ($2) $3-$4');
  }

  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }

  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }

  return maskPhoneInput(value) || value;
}
