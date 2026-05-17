import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AuditoriaEvento,
  OrganizacaoConfiguracao,
  OrganizacaoConfiguracaoRequest,
  PageResult,
} from '../../shared/types/dtos';

@Injectable({ providedIn: 'root' })
export class OrganizacaoConfiguracaoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/app`;

  buscar(): Observable<OrganizacaoConfiguracao> {
    return this.http.get<OrganizacaoConfiguracao>(`${this.base}/configuracoes`);
  }

  atualizar(dados: OrganizacaoConfiguracaoRequest): Observable<OrganizacaoConfiguracao> {
    return this.http.put<OrganizacaoConfiguracao>(`${this.base}/configuracoes`, dados);
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
      .pipe(
        map((page) => ({
          data: page?.content ?? [],
          totalElements: page?.totalElements ?? 0,
          page: page?.number ?? params.page,
          pageSize: page?.size ?? params.size,
          totalPages: page?.totalPages ?? 0,
        }))
      );
  }
}
