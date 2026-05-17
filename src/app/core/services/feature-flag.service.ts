import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { FeatureFlag, FeatureFlagRequest } from '../../shared/types/dtos';

@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  private readonly http = inject(HttpClient);

  listarAdmin(idOrganizacao: number): Observable<FeatureFlag[]> {
    return this.http.get<FeatureFlag[]>(
      `${environment.apiUrl}/admin/organizacoes/${idOrganizacao}/features`
    );
  }

  atualizarAdmin(idOrganizacao: number, dados: FeatureFlagRequest): Observable<FeatureFlag[]> {
    return this.http.put<FeatureFlag[]>(
      `${environment.apiUrl}/admin/organizacoes/${idOrganizacao}/features`,
      dados
    );
  }

  listarOrganizacaoAtual(): Observable<FeatureFlag[]> {
    return this.http.get<FeatureFlag[]>(`${environment.apiUrl}/app/configuracoes/features`);
  }
}
