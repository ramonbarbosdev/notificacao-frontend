export function formatDateTimePtBr(value: string | null | undefined): string {
  if (!value) return '-';

  const data = new Date(value);

  if (Number.isNaN(data.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data);
}

export function formatDatePtBr(value: string | null | undefined): string {
  if (!value) return '-';

  const data = new Date(value);

  if (Number.isNaN(data.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(data);
}
