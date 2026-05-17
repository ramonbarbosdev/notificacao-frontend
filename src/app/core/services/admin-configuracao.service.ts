import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AuditoriaEvento,
  ConfiguracaoGlobal,
  ConfiguracaoGlobalRequest,
  PageResult,
} from '../../shared/types/dtos';

@Injectable({ providedIn: 'root' })
export class AdminConfiguracaoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin`;

  buscar(): Observable<ConfiguracaoGlobal> {
    return this.http.get<ConfiguracaoGlobal>(`${this.base}/configuracoes`);
  }

  atualizar(dados: ConfiguracaoGlobalRequest): Observable<ConfiguracaoGlobal> {
    return this.http.put<ConfiguracaoGlobal>(`${this.base}/configuracoes`, dados);
  }

  listarAuditoria(params: {
    page: number;
    size: number;
    sort?: string;
  }): Observable<PageResult<AuditoriaEvento>> {
    return this.http
      .get<any>(`${this.base}/auditoria`, {
        params: {
          page: params.page,
          size: params.size,
          sort: params.sort ?? 'dtCriacao,desc',
        },
      })
      .pipe(map((page) => this.mapSpringPage(page, params)));
  }

  private mapSpringPage<T>(page: any, params: { page: number; size: number }): PageResult<T> {
    return {
      data: page?.content ?? [],
      totalElements: page?.totalElements ?? 0,
      page: page?.number ?? params.page,
      pageSize: page?.size ?? params.size,
      totalPages: page?.totalPages ?? 0,
    };
  }
}
