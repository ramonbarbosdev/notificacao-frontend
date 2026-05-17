import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Webhook, WebhookRequest } from '../../shared/types/dtos';

@Injectable({ providedIn: 'root' })
export class WebhookService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/app/configuracoes/webhooks`;

  listar(): Observable<Webhook[]> {
    return this.http.get<Webhook[]>(this.base);
  }

  criar(dados: WebhookRequest): Observable<Webhook> {
    return this.http.post<Webhook>(this.base, dados);
  }

  atualizar(idWebhook: number, dados: WebhookRequest): Observable<Webhook> {
    return this.http.put<Webhook>(`${this.base}/${idWebhook}`, dados);
  }

  ativar(idWebhook: number): Observable<Webhook> {
    return this.http.patch<Webhook>(`${this.base}/${idWebhook}/ativar`, {});
  }

  inativar(idWebhook: number): Observable<Webhook> {
    return this.http.patch<Webhook>(`${this.base}/${idWebhook}/inativar`, {});
  }

  remover(idWebhook: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${idWebhook}`);
  }
}
