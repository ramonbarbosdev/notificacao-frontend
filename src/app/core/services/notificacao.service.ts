import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponseDTO,
  EnviarNotificacaoRequest,
  EnviarNotificacaoResponse,
  FilaNotificacaoResponseDTO,
  PageResult,
} from '../../shared/types/dtos';


@Injectable({ providedIn: 'root' })
export class NotificacaoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/app/notificacoes`;

  enviar(dados: EnviarNotificacaoRequest): Observable<EnviarNotificacaoResponse> {
    return this.http.post<EnviarNotificacaoResponse>(`${this.base}/enviar`, dados);
  }

  listar(params: {
    page: number;
    size: number;
    sort?: string;
  }): Observable<PageResult<FilaNotificacaoResponseDTO>> {
    return this.http
      .get<ApiResponseDTO<FilaNotificacaoResponseDTO[]>>(`${this.base}/fila`, {
        params: {
          page: params.page,
          size: params.size,
          sort: params.sort ?? 'dtCriacao,desc',
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
        }))
      );
  }
}
