import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  GithubWebhookIntegracaoResponse,
  GithubWebhookTemplatePreviewRequest,
  GithubWebhookTemplatePreviewResponse,
} from '../../shared/types/dtos';

@Injectable({ providedIn: 'root' })
export class GithubIntegracaoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/app/integracao/github`;

  buscarInstrucoesWebhook(): Observable<GithubWebhookIntegracaoResponse> {
    return this.http.get<GithubWebhookIntegracaoResponse>(`${this.base}/webhook`);
  }

  previewTemplate(
    body: GithubWebhookTemplatePreviewRequest,
  ): Observable<GithubWebhookTemplatePreviewResponse> {
    return this.http.post<GithubWebhookTemplatePreviewResponse>(
      `${this.base}/webhook/template/preview`,
      body,
    );
  }

  /** Monta URL absoluta a partir do template retornado pela API (ex.: /api/webhooks/github?key=...). */
  montarUrlWebhookAbsoluta(webhookUrlTemplate: string): string {
    const template = webhookUrlTemplate.startsWith('/') ? webhookUrlTemplate : `/${webhookUrlTemplate}`;
    const api = environment.apiUrl.replace(/\/$/, '');
    if (template.startsWith('/api')) {
      const origin = api.replace(/\/api$/, '');
      return `${origin}${template}`;
    }
    return `${api}${template}`;
  }
}
