import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Plano, PlanoRequest } from '../../shared/types/dtos';

@Injectable({ providedIn: 'root' })
export class PlanoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/planos`;

  listar(): Observable<Plano[]> {
    return this.http.get<Plano[]>(this.base);
  }

  buscar(idPlano: number): Observable<Plano> {
    return this.http.get<Plano>(`${this.base}/${idPlano}`);
  }

  criar(dados: PlanoRequest): Observable<Plano> {
    return this.http.post<Plano>(this.base, dados);
  }

  atualizar(idPlano: number, dados: PlanoRequest): Observable<Plano> {
    return this.http.put<Plano>(`${this.base}/${idPlano}`, dados);
  }

  ativar(idPlano: number): Observable<Plano> {
    return this.http.patch<Plano>(`${this.base}/${idPlano}/ativar`, {});
  }

  inativar(idPlano: number): Observable<Plano> {
    return this.http.patch<Plano>(`${this.base}/${idPlano}/inativar`, {});
  }
}
