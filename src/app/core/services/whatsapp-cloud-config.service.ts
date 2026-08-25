import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  WhatsappCloudConfigRequest,
  WhatsappCloudConfigResponse,
  WhatsappCloudConfigTestResponse,
  WhatsappEmbeddedSignupCallbackRequest,
  WhatsappEmbeddedSignupConfigResponse,
} from '../../shared/types/dtos';

@Injectable({ providedIn: 'root' })
export class WhatsappCloudConfigService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/app/whatsapp/config`;

  buscar(): Observable<WhatsappCloudConfigResponse> {
    return this.http.get<WhatsappCloudConfigResponse>(this.base);
  }

  criar(payload: WhatsappCloudConfigRequest): Observable<WhatsappCloudConfigResponse> {
    return this.http.post<WhatsappCloudConfigResponse>(this.base, payload);
  }

  atualizar(payload: Partial<WhatsappCloudConfigRequest>): Observable<WhatsappCloudConfigResponse> {
    return this.http.put<WhatsappCloudConfigResponse>(this.base, payload);
  }

  desativar(): Observable<void> {
    return this.http.delete<void>(this.base);
  }

  testar(): Observable<WhatsappCloudConfigTestResponse> {
    return this.http.post<WhatsappCloudConfigTestResponse>(`${this.base}/test`, {});
  }

  webhookUrl(): string {
    return `${environment.apiUrl}/webhooks/whatsapp/meta`;
  }

  embeddedSignupConfig(): Observable<WhatsappEmbeddedSignupConfigResponse> {
    return this.http.get<WhatsappEmbeddedSignupConfigResponse>(
      `${environment.apiUrl}/app/whatsapp-cloud/embedded-signup/config`,
    );
  }

  concluirEmbeddedSignup(
    payload: WhatsappEmbeddedSignupCallbackRequest,
  ): Observable<WhatsappCloudConfigResponse> {
    return this.http.post<WhatsappCloudConfigResponse>(
      `${environment.apiUrl}/app/whatsapp-cloud/embedded-signup/callback`,
      payload,
    );
  }
}
