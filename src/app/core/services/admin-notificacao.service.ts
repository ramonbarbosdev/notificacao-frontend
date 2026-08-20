import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminNotificacaoDetalhe,
  AdminNotificacaoFilaItem,
  AdminResumoOperacional,
  ApiResponseDTO,
  CancelarNotificacaoLoteResponse,
  PageResult,
  WhatsappStatusResponse,
} from '../../shared/types/dtos';

@Injectable({ providedIn: 'root' })
export class AdminNotificacaoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/notificacoes`;

  listarFila(params: {
    page: number;
    size: number;
    idOrganizacao?: number | null;
    destinatario?: string;
    canal?: string;
    status?: string;
  }): Observable<PageResult<AdminNotificacaoFilaItem>> {
    const query: Record<string, string | number> = {
      page: params.page,
      size: params.size,
      sort: 'dtCriacao,desc',
    };

    if (params.idOrganizacao) query['idOrganizacao'] = params.idOrganizacao;
    if (params.destinatario?.trim()) query['destinatario'] = params.destinatario.trim();
    if (params.canal) query['canal'] = params.canal;
    if (params.status) query['status'] = params.status;

    return this.http
      .get<ApiResponseDTO<AdminNotificacaoFilaItem[]>>(`${this.base}/fila`, {
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

  obterDetalhe(idNotificacao: number): Observable<AdminNotificacaoDetalhe> {
    return this.http.get<AdminNotificacaoDetalhe>(`${this.base}/${idNotificacao}`);
  }

  reenviar(idNotificacao: number): Observable<AdminNotificacaoDetalhe> {
    return this.http.post<AdminNotificacaoDetalhe>(`${this.base}/${idNotificacao}/reenviar`, {});
  }

  cancelar(idNotificacao: number, motivo?: string): Observable<AdminNotificacaoDetalhe> {
    return this.http.post<AdminNotificacaoDetalhe>(`${this.base}/${idNotificacao}/cancelar`, {
      motivo: motivo ?? null,
    });
  }

  reativarWhatsappOrganizacao(idOrganizacao: number): Observable<WhatsappStatusResponse> {
    return this.http.post<WhatsappStatusResponse>(
      `${this.base}/organizacoes/${idOrganizacao}/whatsapp/reativar-operacao`,
      {}
    );
  }

  resumoOperacional(): Observable<AdminResumoOperacional> {
    return this.http.get<AdminResumoOperacional>(`${this.base}/resumo-operacional`);
  }

  cancelarLote(payload: {
    ids?: number[];
    idOrganizacao?: number;
    somenteCancelaveis?: boolean;
    motivo?: string;
  }): Observable<CancelarNotificacaoLoteResponse> {
    return this.http.post<CancelarNotificacaoLoteResponse>(`${this.base}/cancelar-lote`, payload);
  }
}
