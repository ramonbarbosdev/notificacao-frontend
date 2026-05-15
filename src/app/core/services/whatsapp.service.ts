import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EnviarNotificacaoRequest,
  EnviarNotificacaoResponse,
  FilaNotificacaoResponseDTO,
} from '../../shared/types/dtos';


@Injectable({ providedIn: 'root' })
export class NotificacaoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/app/notificacoes`;

  enviar(dados: EnviarNotificacaoRequest): Observable<EnviarNotificacaoResponse> {
    return this.http.post<EnviarNotificacaoResponse>(`${this.base}/enviar`, dados);
  }

  listarFila(): Observable<FilaNotificacaoResponseDTO> {
    return this.http.get<FilaNotificacaoResponseDTO>(`${this.base}/fila`);
  }
}
