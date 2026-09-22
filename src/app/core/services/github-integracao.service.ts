import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  GithubGraphqlConsultaRequest,
  GithubGraphqlConsultaResponse,
  GithubProjectV2ListaResponse,
  GithubProjectV2StatusOpcoesResponse,
  GithubWebhookDecisaoListaResponse,
  GithubProjectV2VinculoResponse,
  GithubResponsavel,
  GithubWebhookIntegracaoResponse,
  GithubWebhookTemplatePreviewRequest,
  GithubWebhookTemplatePreviewResponse,
} from '../../shared/types/dtos';

@Injectable({ providedIn: 'root' })
export class GithubIntegracaoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/app/integracao/github`;

  buscarInstrucoesWebhook(): Observable<GithubWebhookIntegracaoResponse> {
    return this.http.get<GithubWebhookIntegracaoResponse>(`${this.base}/webhook`);
  }

  listarResponsaveis(): Observable<GithubResponsavel[]> {
    return this.http.get<GithubResponsavel[]>(`${this.base}/responsaveis`);
  }

  atualizarResponsavelAtivo(idGithubResponsavel: number, ativo: boolean): Observable<GithubResponsavel> {
    return this.http.patch<GithubResponsavel>(`${this.base}/responsaveis/${idGithubResponsavel}`, { ativo });
  }

  excluirResponsavel(idGithubResponsavel: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/responsaveis/${idGithubResponsavel}`);
  }

  consultarGraphql(body: GithubGraphqlConsultaRequest): Observable<GithubGraphqlConsultaResponse> {
    return this.http.post<GithubGraphqlConsultaResponse>(`${this.base}/graphql/consulta`, body);
  }

  previewTemplate(
    body: GithubWebhookTemplatePreviewRequest,
  ): Observable<GithubWebhookTemplatePreviewResponse> {
    return this.http.post<GithubWebhookTemplatePreviewResponse>(
      `${this.base}/webhook/template/preview`,
      body,
    );
  }

  obterVinculoProject(): Observable<GithubProjectV2VinculoResponse> {
    return this.http.get<GithubProjectV2VinculoResponse>(`${this.base}/project/vinculo`);
  }

  listarWebhookDecisoes(pagina = 0, tamanho = 20): Observable<GithubWebhookDecisaoListaResponse> {
    return this.http.get<GithubWebhookDecisaoListaResponse>(`${this.base}/webhook/decisoes`, {
      params: { pagina: String(pagina), tamanho: String(tamanho) },
    });
  }

  listarProjects(orgLogin?: string | null): Observable<GithubProjectV2ListaResponse> {
    const login = orgLogin?.trim();
    if (login) {
      return this.http.get<GithubProjectV2ListaResponse>(`${this.base}/projects`, {
        params: { orgLogin: login },
      });
    }
    return this.http.get<GithubProjectV2ListaResponse>(`${this.base}/projects`);
  }

  listarStatusOpcoes(projectNodeId?: string | null): Observable<GithubProjectV2StatusOpcoesResponse> {
    const nodeId = projectNodeId?.trim();
    if (nodeId) {
      return this.http.get<GithubProjectV2StatusOpcoesResponse>(`${this.base}/project/status-opcoes`, {
        params: { projectNodeId: nodeId },
      });
    }
    return this.http.get<GithubProjectV2StatusOpcoesResponse>(`${this.base}/project/status-opcoes`);
  }

  /** Monta URL absoluta a partir do template retornado pela API (ex.: /api/webhooks/github?key=...). */
  montarUrlWebhookAbsoluta(webhookUrlTemplate: string): string {
    const template = webhookUrlTemplate.startsWith('/') ? webhookUrlTemplate : `/${webhookUrlTemplate}`;
    const api = environment.apiUrl.replace(/\/$/, '');
    if (template.startsWith('/api')) {
      const origin = api.replace(/\/api$/, '');
      return `${origin}${template}`;
    }
    return `${api}${template}`;
  }
}
