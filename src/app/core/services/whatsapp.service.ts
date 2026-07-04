import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  WhatsappStatusResponse,
  EnviarMensagemRequest,
  EnviarMensagemResponse,
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

  cancelarConexao(): Observable<WhatsappStatusResponse> {
    return this.http.post<WhatsappStatusResponse>(`${this.base}/cancelar-conexao`, {});
  }

  desconectar(): Observable<WhatsappStatusResponse> {
    return this.http.post<WhatsappStatusResponse>(`${this.base}/desconectar`, {});
  }

  reativarOperacao(): Observable<WhatsappStatusResponse> {
    return this.http.post<WhatsappStatusResponse>(`${this.base}/reativar-operacao`, {});
  }

  enviarMensagem(dados: EnviarMensagemRequest): Observable<EnviarMensagemResponse> {
    return this.http.post<EnviarMensagemResponse>(`${this.base}/enviar-mensagem`, dados);
  }
}
