import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenService } from '../auth/token.service';
import { NotificacaoFilaEvento } from '../../shared/types/dtos';
import {
  frameStomp,
  hostStompDaApi,
  montarUrlsStompWebSocket,
  parseFrameStomp,
} from './stomp-websocket.util';

@Injectable({ providedIn: 'root' })
export class NotificacaoFilaEventsService {
  private readonly tokenService = inject(TokenService);

  conectar(idOrganizacao: number): Observable<NotificacaoFilaEvento> {
    return new Observable<NotificacaoFilaEvento>((subscriber) => {
      const urls = montarUrlsStompWebSocket(environment.apiUrl, this.tokenService.obter());
      const stompHost = hostStompDaApi(environment.apiUrl);
      const subscriptionId = `notificacao-fila-org-${idOrganizacao}`;
      const tentativas: string[] = [];
      let socket: WebSocket | null = null;
      let conectado = false;
      let encerrado = false;

      const tentarConectar = (index: number) => {
        if (encerrado) return;

        const url = urls[index];
        if (!url) {
          subscriber.error(
            new Error(`Falha na conexao WebSocket. URLs testadas: ${tentativas.join(', ')}`)
          );
          return;
        }

        tentativas.push(url);
        socket = new WebSocket(url, ['v12.stomp', 'v11.stomp']);

        socket.onopen = () => {
          socket?.send(
            frameStomp('CONNECT', {
              'accept-version': '1.2,1.1',
              host: stompHost,
              Authorization: `Bearer ${this.tokenService.obter() ?? ''}`,
            })
          );
        };

        socket.onmessage = (message) => {
          for (const rawFrame of String(message.data).split('\0')) {
            if (!rawFrame.trim()) continue;

            const parsed = parseFrameStomp(rawFrame);
            if (!parsed) continue;

            if (parsed.command === 'CONNECTED' && !conectado) {
              conectado = true;
              socket?.send(
                frameStomp('SUBSCRIBE', {
                  id: subscriptionId,
                  destination: `/topic/notificacoes/organizacao/${idOrganizacao}`,
                  ack: 'auto',
                })
              );
              continue;
            }

            if (parsed.command === 'MESSAGE' && parsed.body) {
              subscriber.next(JSON.parse(parsed.body) as NotificacaoFilaEvento);
              continue;
            }

            if (parsed.command === 'ERROR') {
              subscriber.error(new Error(parsed.body || 'Erro STOMP no WebSocket.'));
            }
          }
        };

        socket.onerror = () => {
          if (!conectado) {
            socket?.close();
            tentarConectar(index + 1);
          }
        };

        socket.onclose = () => {
          if (!conectado && !encerrado) {
            tentarConectar(index + 1);
            return;
          }
          if (!encerrado) subscriber.complete();
        };
      };

      tentarConectar(0);

      return () => {
        encerrado = true;
        if (socket?.readyState === WebSocket.OPEN && conectado) {
          socket.send(frameStomp('UNSUBSCRIBE', { id: subscriptionId }));
          socket.send(frameStomp('DISCONNECT', {}));
        }
        socket?.close();
      };
    });
  }
}
