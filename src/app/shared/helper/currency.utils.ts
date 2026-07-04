export function formatBrl(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  const numero = typeof value === 'string' ? parseBrl(value) : value;

  if (numero === null || Number.isNaN(numero)) return String(value);

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numero);
}

export function maskBrlInput(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (!digits) return '';

  const centavos = Number(digits);
  const reais = centavos / 100;

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(reais);
}

export function parseBrl(value: string): number | null {
  const digits = value.replace(/\D/g, '');

  if (!digits) return null;

  return Number(digits) / 100;
}
