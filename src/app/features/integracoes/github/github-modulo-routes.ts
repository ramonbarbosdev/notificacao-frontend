/** Slug de rota por codigo retornado na API (`PROJECTS_V2`, etc.). */
export const GITHUB_MODULO_ROUTE_SLUG: Record<string, string> = {
  PROJECTS_V2: 'projects-v2',
  ISSUE_COMMENT: 'issue-comment',
};

export function slugModuloGithub(codigo: string): string | null {
  return GITHUB_MODULO_ROUTE_SLUG[codigo] ?? null;
}
