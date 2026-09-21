const GITHUB_PROJECT_COLOR: Record<string, string> = {
  GRAY: '#6e7681',
  BLUE: '#0969da',
  GREEN: '#1a7f37',
  YELLOW: '#9a6700',
  ORANGE: '#bc4c00',
  RED: '#cf222e',
  PINK: '#bf3989',
  PURPLE: '#8250df',
};

/** Cor de bolinha para opções Status do Project v2 (nome GitHub ou hex). */
export function corStatusGithubProject(color: string | null | undefined): string {
  const raw = (color ?? '').trim();
  if (!raw) {
    return 'var(--color-text-muted)';
  }
  if (raw.startsWith('#')) {
    return raw;
  }
  const upper = raw.toUpperCase();
  return GITHUB_PROJECT_COLOR[upper] ?? 'var(--color-text-muted)';
}
