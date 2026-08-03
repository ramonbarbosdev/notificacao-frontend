import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenService } from '../auth/token.service';
import { WhatsappEvento } from '../../shared/types/dtos';
import { criarConexaoStomp } from './stomp-websocket.client';
import { hostStompDaApi, montarUrlsStompWebSocket } from './stomp-websocket.util';

@Injectable({ providedIn: 'root' })
export class WhatsappEventsService {
  private readonly tokenService = inject(TokenService);

  conectar(idOrganizacao: number): Observable<WhatsappEvento> {
    return criarConexaoStomp({
      urls: montarUrlsStompWebSocket(environment.apiUrl, this.tokenService.obter()),
      stompHost: hostStompDaApi(environment.apiUrl),
      token: this.tokenService.obter(),
      subscriptionId: `whatsapp-org-${idOrganizacao}`,
      destination: `/topic/whatsapp/organizacao/${idOrganizacao}`,
      parseMensagem: (body) => JSON.parse(body) as WhatsappEvento,
    });
  }
}
