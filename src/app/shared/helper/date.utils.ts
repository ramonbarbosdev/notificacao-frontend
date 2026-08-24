/** Fuso usado pela API ao serializar LocalDateTime (sem offset no JSON). */
const API_TIMEZONE_OFFSET = '-03:00';

const NAIVE_ISO_DATETIME =
  /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?)$/;

function hasExplicitTimezone(value: string): boolean {
  return /[Zz]$|[+-]\d{2}:?\d{2}$/.test(value);
}

export function parseApiDateTime(value: string | Date | null | undefined): Date {
  if (value == null) {
    return new Date(NaN);
  }

  if (value instanceof Date) {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return new Date(NaN);
  }

  if (hasExplicitTimezone(trimmed)) {
    return new Date(trimmed);
  }

  const normalized = trimmed.replace(' ', 'T');
  const match = normalized.match(NAIVE_ISO_DATETIME);
  if (match) {
    return new Date(`${match[1]}T${match[2]}${API_TIMEZONE_OFFSET}`);
  }

  return new Date(trimmed);
}

export function formatDateTimePtBr(value: string | Date | null | undefined): string {
  if (value == null) return '-';

  const data = parseApiDateTime(value);

  if (Number.isNaN(data.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Bahia',
  }).format(data);
}

export function formatDatePtBr(value: string | Date | null | undefined): string {
  if (value == null) return '-';

  const data = parseApiDateTime(value);

  if (Number.isNaN(data.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'America/Bahia',
  }).format(data);
}

export function formatRelativeTimePtBr(value: string | Date | null | undefined): string {
  if (value == null) return '-';

  const data = parseApiDateTime(value);

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

  return formatDateTimePtBr(data);
}
