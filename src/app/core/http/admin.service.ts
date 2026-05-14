import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AtualizarOrganizacaoRequest,
  CriarOrganizacaoRequest,
  CriarUsuarioOrganizacaoRequest,
  OrganizacaoAdminResponse,
  UsuarioOrganizacaoResponse,
} from '../../shared/types/dtos';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin`;

  criarOrganizacao(dados: CriarOrganizacaoRequest): Observable<OrganizacaoAdminResponse> {
    return this.http.post<OrganizacaoAdminResponse>(`${this.base}/organizacoes`, dados);
  }

  atualizarOrganizacao(
    idOrganizacao: number,
    dados: AtualizarOrganizacaoRequest
  ): Observable<OrganizacaoAdminResponse> {
    return this.http.put<OrganizacaoAdminResponse>(
      `${this.base}/organizacoes/${idOrganizacao}`,
      dados
    );
  }

  listarOrganizacoes(): Observable<OrganizacaoAdminResponse[]> {
    return this.http.get<OrganizacaoAdminResponse[]>(`${this.base}/organizacoes`);
  }

  ativarOrganizacao(idOrganizacao: number): Observable<OrganizacaoAdminResponse> {
    return this.http.patch<OrganizacaoAdminResponse>(
      `${this.base}/organizacoes/${idOrganizacao}/ativar`,
      {}
    );
  }

  desativarOrganizacao(idOrganizacao: number): Observable<OrganizacaoAdminResponse> {
    return this.http.patch<OrganizacaoAdminResponse>(
      `${this.base}/organizacoes/${idOrganizacao}/desativar`,
      {}
    );
  }

  criarUsuarioOrganizacao(
    idOrganizacao: number,
    dados: CriarUsuarioOrganizacaoRequest
  ): Observable<UsuarioOrganizacaoResponse> {
    return this.http.post<UsuarioOrganizacaoResponse>(
      `${this.base}/organizacoes/${idOrganizacao}/usuarios`,
      dados
    );
  }

  listarUsuariosOrganizacao(idOrganizacao: number): Observable<UsuarioOrganizacaoResponse[]> {
    return this.http.get<UsuarioOrganizacaoResponse[]>(
      `${this.base}/organizacoes/${idOrganizacao}/usuarios`
    );
  }
}
