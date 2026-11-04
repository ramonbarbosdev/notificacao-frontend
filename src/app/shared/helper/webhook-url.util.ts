import { environment } from '../../../environments/environment';

/** Monta URL absoluta a partir do template da API (ex.: /api/webhooks/generico?key=...). */
export function montarUrlWebhookAbsoluta(webhookUrlTemplate: string): string {
  const template = webhookUrlTemplate.startsWith('/') ? webhookUrlTemplate : `/${webhookUrlTemplate}`;
  const api = environment.apiUrl.replace(/\/$/, '');
  if (template.startsWith('/api')) {
    const origin = api.replace(/\/api$/, '');
    return `${origin}${template}`;
  }
  return `${api}${template}`;
}
