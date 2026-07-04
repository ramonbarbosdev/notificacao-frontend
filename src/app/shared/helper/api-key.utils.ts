export function maskApiKeyPrefix(prefixo: string): string {
  if (!prefixo) return '••••••••';

  return `${prefixo}••••••••`;
}

export function maskApiKeyFull(chave: string): string {
  if (!chave || chave.length <= 12) return chave;

  const inicio = chave.slice(0, 8);
  const fim = chave.slice(-4);

  return `${inicio}••••••••${fim}`;
}

export function formatScopes(
  scopes: string[],
  labels: Record<string, string>
): string {
  if (!scopes.length) return '-';

  return scopes.map((scope) => labels[scope] ?? scope).join(', ');
}
