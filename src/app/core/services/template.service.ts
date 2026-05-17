import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiResponseDTO,
  CanalNotificacao,
  EnviarNotificacaoResponse,
  EnviarTemplateRequestDTO,
  ExtrairVariaveisTemplateRequestDTO,
  ExtrairVariaveisTemplateResponseDTO,
  PageResult,
  TemplateMensagemRequestDTO,
  TemplateMensagemResponseDTO,
  TestarTemplateRequestDTO,
  TestarTemplateResponseDTO,
  ValidarTemplateRequestDTO,
  ValidarTemplateResponseDTO,
} from '../../shared/types/dtos';

@Injectable({ providedIn: 'root' })
export class TemplateService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/app/notificacoes/templates`;

  listar(params: {
    page: number;
    size: number;
    sort?: string;
    termo?: string;
    canal?: CanalNotificacao;
    ativo?: boolean;
  }): Observable<PageResult<TemplateMensagemResponseDTO>> {
    return this.http
      .get<ApiResponseDTO<TemplateMensagemResponseDTO[]>>(this.base, {
        params: {
          page: params.page,
          size: params.size,
          sort: params.sort ?? 'dtAtualizacao,desc',
          ...(params.termo ? { termo: params.termo } : {}),
          ...(params.canal ? { canal: params.canal } : {}),
          ...(params.ativo !== undefined ? { ativo: params.ativo } : {}),
        },
        observe: 'response',
      })
      .pipe(
        map((response) => ({
          data: response.body?.data ?? [],
          totalElements: Number(response.headers.get('X-Total-Count') ?? 0),
          page: Number(response.headers.get('X-Page') ?? params.page),
          pageSize: Number(response.headers.get('X-Page-Size') ?? params.size),
          totalPages: Number(response.headers.get('X-Total-Pages') ?? 0),
        }))
      );
  }

  buscarPorId(idModelo: number): Observable<TemplateMensagemResponseDTO> {
    return this.http
      .get<ApiResponseDTO<TemplateMensagemResponseDTO> | TemplateMensagemResponseDTO>(
        `${this.base}/${idModelo}`
      )
      .pipe(map((response) => this.unwrap(response)));
  }

  criar(dados: TemplateMensagemRequestDTO): Observable<TemplateMensagemResponseDTO> {
    return this.http
      .post<ApiResponseDTO<TemplateMensagemResponseDTO> | TemplateMensagemResponseDTO>(
        this.base,
        dados
      )
      .pipe(map((response) => this.unwrap(response)));
  }

  atualizar(
    idModelo: number,
    dados: TemplateMensagemRequestDTO
  ): Observable<TemplateMensagemResponseDTO> {
    return this.http
      .put<ApiResponseDTO<TemplateMensagemResponseDTO> | TemplateMensagemResponseDTO>(
        `${this.base}/${idModelo}`,
        dados
      )
      .pipe(map((response) => this.unwrap(response)));
  }

  ativar(idModelo: number): Observable<TemplateMensagemResponseDTO> {
    return this.http
      .patch<ApiResponseDTO<TemplateMensagemResponseDTO> | TemplateMensagemResponseDTO>(
        `${this.base}/${idModelo}/ativar`,
        {}
      )
      .pipe(map((response) => this.unwrap(response)));
  }

  inativar(idModelo: number): Observable<TemplateMensagemResponseDTO> {
    return this.http
      .patch<ApiResponseDTO<TemplateMensagemResponseDTO> | TemplateMensagemResponseDTO>(
        `${this.base}/${idModelo}/inativar`,
        {}
      )
      .pipe(map((response) => this.unwrap(response)));
  }

  extrairVariaveis(
    dados: ExtrairVariaveisTemplateRequestDTO
  ): Observable<ExtrairVariaveisTemplateResponseDTO> {
    return this.http
      .post<
        ApiResponseDTO<ExtrairVariaveisTemplateResponseDTO> | ExtrairVariaveisTemplateResponseDTO
      >(`${this.base}/extrair-variaveis`, dados)
      .pipe(map((response) => this.unwrap(response)));
  }

  validar(dados: ValidarTemplateRequestDTO): Observable<ValidarTemplateResponseDTO> {
    return this.http
      .post<ApiResponseDTO<ValidarTemplateResponseDTO> | ValidarTemplateResponseDTO>(
        `${this.base}/validar`,
        dados
      )
      .pipe(map((response) => this.unwrap(response)));
  }

  testar(
    chave: string,
    dados: TestarTemplateRequestDTO
  ): Observable<TestarTemplateResponseDTO> {
    return this.http
      .post<ApiResponseDTO<TestarTemplateResponseDTO> | TestarTemplateResponseDTO>(
        `${this.base}/${chave}/testar`,
        dados
      )
      .pipe(map((response) => this.unwrap(response)));
  }

  enviar(dados: EnviarTemplateRequestDTO): Observable<EnviarNotificacaoResponse> {
    return this.http
      .post<ApiResponseDTO<EnviarNotificacaoResponse> | EnviarNotificacaoResponse>(
        `${this.base}/enviar`,
        dados
      )
      .pipe(map((response) => this.unwrap(response)));
  }

  private unwrap<T>(response: ApiResponseDTO<T> | T): T {
    if (this.isApiResponse(response)) {
      return response.data;
    }

    return response;
  }

  private isApiResponse<T>(response: ApiResponseDTO<T> | T): response is ApiResponseDTO<T> {
    return typeof response === 'object' && response !== null && 'data' in response;
  }
}
