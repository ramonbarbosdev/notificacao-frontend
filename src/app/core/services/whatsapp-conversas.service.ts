import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponseDTO,
  PageResult,
  WhatsappConversaResponse,
  WhatsappConversaStatus,
} from '../../shared/types/dtos';

export interface WhatsappConversasListarParams {
  page: number;
  size: number;
  busca?: string;
  prontoParaEnvioWhatsapp?: boolean;
  status?: WhatsappConversaStatus;
  naoLida?: boolean;
}

@Injectable({ providedIn: 'root' })
export class WhatsappConversasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/app/whatsapp/conversas`;

  listar(params: WhatsappConversasListarParams): Observable<PageResult<WhatsappConversaResponse>> {
    return this.http
      .get<ApiResponseDTO<WhatsappConversaResponse[]>>(this.base, {
        params: {
          page: params.page,
          size: params.size,
          ...(params.busca?.trim() ? { busca: params.busca.trim() } : {}),
          ...(params.prontoParaEnvioWhatsapp !== undefined
            ? { prontoParaEnvioWhatsapp: params.prontoParaEnvioWhatsapp }
            : {}),
          ...(params.status ? { status: params.status } : {}),
          ...(params.naoLida !== undefined ? { naoLida: params.naoLida } : {}),
        },
        observe: 'response',
      })
      .pipe(
        map((response) => ({
          data: response.body?.data ?? [],
          totalElements: Number(response.headers.get('X-Total-Count') ?? 0),
          page: Number(response.headers.get('X-Page') ?? 0),
          pageSize: Number(response.headers.get('X-Page-Size') ?? params.size),
          totalPages: Number(response.headers.get('X-Total-Pages') ?? 0),
        })),
      );
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
