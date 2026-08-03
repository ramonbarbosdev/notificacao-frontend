export function montarUrlsStompWebSocket(apiUrl: string, token?: string | null): string[] {
  const wsBase = apiUrl.replace(/\/$/, '').replace(/^http/, 'ws') + '/ws';
  const urls = [wsBase];

  if (token) {
    urls.push(`${wsBase}?access_token=${encodeURIComponent(token)}`);
  }

  return urls;
}

export function hostStompDaApi(apiUrl: string): string {
  try {
    return new URL(apiUrl).host;
  } catch {
    return window.location.host;
  }
}

export function frameStomp(
  command: string,
  headers: Record<string, string>,
  body = ''
): string {
  const headerLines = Object.entries(headers).map(([key, value]) => `${key}:${value}`);
  return [command, ...headerLines, '', body].join('\n') + '\0';
}

export function parseFrameStomp(frame: string): { command: string; body: string } | null {
  const [head, ...bodyParts] = frame.split('\n\n');
  const command = head.split('\n')[0]?.trim();
  if (!command) return null;
  return { command, body: bodyParts.join('\n\n').trim() };
}
