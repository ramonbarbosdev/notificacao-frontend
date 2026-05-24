import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

import {
  ApiResponseDTO,
  ContatoRequestDTO,
  ContatoResponseDTO,
  PageResult,
} from '../../shared/types/dtos';

@Injectable({ providedIn: 'root' })
export class ContatoService {
  private readonly http = inject(HttpClient);

  private readonly base = `${environment.apiUrl}/app/contatos`;

  registrarConsentimento(
    dados: ContatoRequestDTO
  ): Observable<ContatoResponseDTO> {
    return this.http.post<ContatoResponseDTO>(
      `${this.base}/consentimento`,
      dados
    );
  }

  bloquearContato(
    dados: ContatoRequestDTO
  ): Observable<ContatoResponseDTO> {
    return this.http.post<ContatoResponseDTO>(
      `${this.base}/bloquear`,
      dados
    );
  }

  listar(params: {
    page: number;
    size: number;
    sort?: string;
    canal?: string;
    nmContato?: string;
    destinatario?: string;
    consentimento?: boolean;
    bloqueado?: boolean;
  }): Observable<PageResult<ContatoResponseDTO>> {
    return this.http
      .get<ApiResponseDTO<ContatoResponseDTO[]>>(this.base, {
        params: {
          page: params.page,
          size: params.size,
          sort: params.sort ?? 'dtCriacao,desc',
          ...(params.canal ? { canal: params.canal } : {}),
          ...(params.destinatario ? { destinatario: params.destinatario } : {}),
          ...(params.consentimento !== undefined ? { consentimento: params.consentimento } : {}),
          ...(params.bloqueado !== undefined ? { bloqueado: params.bloqueado } : {}),
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

  buscarPorId(idContato: number): Observable<ContatoResponseDTO> {
    return this.http.get<ContatoResponseDTO>(
      `${this.base}/${idContato}`
    );
  }

  sincronizarWhatsapp(): Observable<void> {
    return this.http.post<void>(`${this.base}/sincronizar-whatsapp`, {});
  }

  removerBloqueio(idContato: number): Observable<ContatoResponseDTO> {
    return this.http.patch<ContatoResponseDTO>(
      `${this.base}/${idContato}/remover-bloqueio`,
      {}
    );
  }

  revogarConsentimento(idContato: number): Observable<ContatoResponseDTO> {
    return this.http.patch<ContatoResponseDTO>(
      `${this.base}/${idContato}/revogar-consentimento`,
      {}
    );
  }
}