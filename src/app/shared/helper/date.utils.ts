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

export function formatRelativeTimePtBr(value: string | null | undefined): string {
  if (!value) return '-';

  const data = new Date(value);

  if (Number.isNaN(data.getTime())) return '-';

  const diffMs = Date.now() - data.getTime();
  const minutos = Math.floor(diffMs / 60_000);

  if (minutos < 1) {
    return 'agora';
  }

  if (minutos < 60) {
    return `ha ${minutos} min`;
  }

  const horas = Math.floor(minutos / 60);

  if (horas < 24) {
    return `ha ${horas}h`;
  }

  const dias = Math.floor(horas / 24);

  if (dias === 1) {
    return 'ontem';
  }

  if (dias < 7) {
    return `ha ${dias} dias`;
  }

  return formatDateTimePtBr(value);
}
