export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (digits.length === 13) {
    return digits.replace(
      /^(\d{2})(\d{2})(\d{5})(\d{4})$/,
      '+$1 ($2) $3-$4'
    );
  }

  if (digits.length === 11) {
    return digits.replace(
      /^(\d{2})(\d{5})(\d{4})$/,
      '($1) $2-$3'
    );
  }

  return value;
}