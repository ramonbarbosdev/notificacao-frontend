import { Injectable, inject } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

import {

  ApiResponseDTO,

  PageResult,

  WhatsappConversaResponse,

  WhatsappConversaStatus,

  WhatsappConversaOrigem,
  WhatsappConversaAba,
  WhatsappMensagemDirecao,
  WhatsappMensagemResponse,

} from '../../shared/types/dtos';



export interface WhatsappConversasListarParams {

  page: number;

  size: number;

  busca?: string;

  prontoParaEnvioWhatsapp?: boolean;

  status?: WhatsappConversaStatus;

  naoLida?: boolean;

  ultimaDirecaoMensagem?: WhatsappMensagemDirecao;

  origem?: WhatsappConversaOrigem;

  aba?: WhatsappConversaAba;

}



@Injectable({ providedIn: 'root' })

export class WhatsappConversasService {

  private readonly http = inject(HttpClient);

  private readonly base = `${environment.apiUrl}/app/whatsapp/conversas`;



  listar(params: WhatsappConversasListarParams): Observable<PageResult<WhatsappConversaResponse>> {

    return this.http

      .get<ApiResponseDTO<WhatsappConversaResponse[]>>(this.base, {

        params: {

          page: params.page,

          size: params.size,

          ...(params.busca?.trim() ? { busca: params.busca.trim() } : {}),

          ...(params.prontoParaEnvioWhatsapp !== undefined

            ? { prontoParaEnvioWhatsapp: params.prontoParaEnvioWhatsapp }

            : {}),

          ...(params.status ? { status: params.status } : {}),

          ...(params.naoLida !== undefined ? { naoLida: params.naoLida } : {}),

          ...(params.ultimaDirecaoMensagem
            ? { ultimaDirecaoMensagem: params.ultimaDirecaoMensagem }
            : {}),

          ...(params.origem ? { origem: params.origem } : {}),

          ...(params.aba ? { aba: params.aba } : {}),

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

        })),

      );

  }



  liberar(telefone: string): Observable<WhatsappConversaResponse> {

    return this.http.post<WhatsappConversaResponse>(`${this.base}/${encodeURIComponent(telefone)}/liberar`, {});

  }



  marcarComoLida(telefone: string): Observable<WhatsappConversaResponse> {

    return this.http.patch<WhatsappConversaResponse>(`${this.base}/${encodeURIComponent(telefone)}/marcar-lida`, {});

  }



  sincronizarInbox(telefone: string): Observable<WhatsappConversaResponse> {

    return this.http.post<WhatsappConversaResponse>(

      `${this.base}/${encodeURIComponent(telefone)}/sincronizar-inbox`,

      {},

    );

  }



  excluir(telefone: string): Observable<void> {

    return this.http.delete<void>(`${this.base}/${encodeURIComponent(telefone)}`);

  }



  listarMensagens(telefone: string, page = 0, size = 100): Observable<PageResult<WhatsappMensagemResponse>> {

    return this.http

      .get<ApiResponseDTO<WhatsappMensagemResponse[]>>(

        `${this.base}/${encodeURIComponent(telefone)}/mensagens`,

        {

          params: { page, size },

          observe: 'response',

        },

      )

      .pipe(

        map((response) => ({

          data: response.body?.data ?? [],

          totalElements: Number(response.headers.get('X-Total-Count') ?? 0),

          page: Number(response.headers.get('X-Page') ?? 0),

          pageSize: Number(response.headers.get('X-Page-Size') ?? size),

          totalPages: Number(response.headers.get('X-Total-Pages') ?? 0),

        })),

      );

  }



  sincronizarHistorico(telefone: string): Observable<WhatsappConversaResponse> {

    return this.http.post<WhatsappConversaResponse>(

      `${this.base}/${encodeURIComponent(telefone)}/sincronizar-historico`,

      {},

    );

  }

}


