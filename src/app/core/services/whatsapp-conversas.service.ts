import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WhatsappConversaResponse } from '../../shared/types/dtos';

@Injectable({ providedIn: 'root' })
export class WhatsappConversasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/app/whatsapp/conversas`;

  listar(): Observable<WhatsappConversaResponse[]> {
    return this.http.get<WhatsappConversaResponse[]>(this.base);
  }

  liberar(telefone: string): Observable<WhatsappConversaResponse> {
    return this.http.post<WhatsappConversaResponse>(`${this.base}/${encodeURIComponent(telefone)}/liberar`, {});
  }

  marcarComoLida(telefone: string): Observable<WhatsappConversaResponse> {
    return this.http.patch<WhatsappConversaResponse>(`${this.base}/${encodeURIComponent(telefone)}/marcar-lida`, {});
  }

  excluir(telefone: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(telefone)}`);
  }
}
