export function formatNumberPtBr(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';

  return new Intl.NumberFormat('pt-BR').format(value);
}
