// src/app/core/http/whatsapp.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  WhatsappStatusResponse,
  EnviarMensagemRequest,
  EnviarMensagemResponse,
  EnviarNotificacaoResponse,
  EnviarNotificacaoRequest,
} from '../../shared/types/dtos';

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/app/whatsapp`;

  status(): Observable<WhatsappStatusResponse> {
    return this.http.get<WhatsappStatusResponse>(`${this.base}/status`);
  }

  conectar(): Observable<WhatsappStatusResponse> {
    return this.http.post<WhatsappStatusResponse>(`${this.base}/conectar`, {});
  }

  desconectar(): Observable<WhatsappStatusResponse> {
    return this.http.post<WhatsappStatusResponse>(`${this.base}/desconectar`, {});
  }

  enviarMensagem(dados: EnviarMensagemRequest): Observable<EnviarMensagemResponse> {
    return this.http.post<EnviarMensagemResponse>(`${this.base}/enviar-mensagem`, dados);
  }
}



@Injectable({ providedIn: 'root' })
export class NotificacaoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/app/notificacoes`;

  enviar(dados: EnviarNotificacaoRequest): Observable<EnviarNotificacaoResponse> {
    return this.http.post<EnviarNotificacaoResponse>(`${this.base}/enviar`, dados);
  }
}
