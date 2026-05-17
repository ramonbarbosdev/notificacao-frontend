import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiKey, ApiKeyCreateRequest, ApiKeyCreatedResponse } from '../../shared/types/dtos';

@Injectable({ providedIn: 'root' })
export class ApiKeyService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/app/configuracoes/api-keys`;

  listar(): Observable<ApiKey[]> {
    return this.http.get<ApiKey[]>(this.base);
  }

  criar(dados: ApiKeyCreateRequest): Observable<ApiKeyCreatedResponse> {
    return this.http.post<ApiKeyCreatedResponse>(this.base, dados);
  }

  revogar(idApiKey: number): Observable<ApiKey> {
    return this.http.patch<ApiKey>(`${this.base}/${idApiKey}/revogar`, {});
  }
}
