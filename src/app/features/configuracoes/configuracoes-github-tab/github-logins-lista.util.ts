export interface GithubLoginSugerido {
  login: string;
  habilitado: boolean;
}

export function parseLoginsLista(raw: string | null | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  const vistos = new Set<string>();
  const ordem: string[] = [];
  for (const parte of raw.split(/[,;]+/)) {
    const login = parte.trim();
    if (!login) {
      continue;
    }
    const chave = login.toLowerCase();
    if (!vistos.has(chave)) {
      vistos.add(chave);
      ordem.push(login);
    }
  }
  return ordem;
}

export function serializarLoginsLista(logins: string[]): string | null {
  const limpos = logins.map((l) => l.trim()).filter(Boolean);
  return limpos.length ? limpos.join(', ') : null;
}

export function loginJaNaLista(lista: string[], login: string): boolean {
  const chave = login.trim().toLowerCase();
  return lista.some((l) => l.toLowerCase() === chave);
}
