import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponseDTO,
  CanalNotificacao,
  EnviarNotificacaoLoteRequest,
  EnviarNotificacaoLoteResponse,
  EnviarNotificacaoRequest,
  EnviarNotificacaoResponse,
  FilaNotificacaoResponseDTO,
  FilaResumoResponseDTO,
  PageResult,
  StatusEnvioOrganizacaoResponse,
  StatusNotificacao,
} from '../../shared/types/dtos';


@Injectable({ providedIn: 'root' })
export class NotificacaoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/app/notificacoes`;

  enviar(dados: EnviarNotificacaoRequest): Observable<EnviarNotificacaoResponse> {
    return this.http.post<EnviarNotificacaoResponse>(`${this.base}/enviar`, dados);
  }

  enviarLote(dados: EnviarNotificacaoLoteRequest): Observable<EnviarNotificacaoLoteResponse> {
    return this.http.post<EnviarNotificacaoLoteResponse>(`${this.base}/enviar-lote`, dados);
  }

  listar(params: {
    page: number;
    size: number;
    sort?: string;
    destinatario?: string;
    canal?: CanalNotificacao;
    status?: StatusNotificacao;
  }): Observable<PageResult<FilaNotificacaoResponseDTO>> {
    const query: Record<string, string | number> = {
      page: params.page,
      size: params.size,
      sort: params.sort ?? 'dtCriacao,desc',
    };

    if (params.destinatario?.trim()) {
      query['destinatario'] = params.destinatario.trim();
    }
    if (params.canal) {
      query['canal'] = params.canal;
    }
    if (params.status) {
      query['status'] = params.status;
    }

    return this.http
      .get<ApiResponseDTO<FilaNotificacaoResponseDTO[]>>(`${this.base}/fila`, {
        params: query,
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

  resumoFila(): Observable<FilaResumoResponseDTO> {
    return this.http.get<FilaResumoResponseDTO>(`${this.base}/fila/resumo`);
  }

  consultarStatusEnvio(canal: string = 'WHATSAPP'): Observable<StatusEnvioOrganizacaoResponse> {
    return this.http.get<StatusEnvioOrganizacaoResponse>(`${this.base}/status-envio`, {
      params: { canal },
    });
  }

  reenviar(idNotificacao: number): Observable<FilaNotificacaoResponseDTO> {
    return this.http.post<FilaNotificacaoResponseDTO>(`${this.base}/${idNotificacao}/reenviar`, {});
  }
}
