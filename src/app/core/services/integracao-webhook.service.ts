import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { WebhookGenericoIntegracaoResponse } from '../../shared/types/dtos';
import { montarUrlWebhookAbsoluta } from '../../shared/helper/webhook-url.util';

@Injectable({ providedIn: 'root' })
export class IntegracaoWebhookService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/app/integracao`;

  buscarInstrucoesWebhookGenerico(): Observable<WebhookGenericoIntegracaoResponse> {
    return this.http.get<WebhookGenericoIntegracaoResponse>(`${this.base}/webhook/generico`);
  }

  montarUrlWebhookAbsoluta(webhookUrlTemplate: string): string {
    return montarUrlWebhookAbsoluta(webhookUrlTemplate);
  }
}
