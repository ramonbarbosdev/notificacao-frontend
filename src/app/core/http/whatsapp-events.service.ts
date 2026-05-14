import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenService } from '../auth/token.service';
import { WhatsappEvento } from '../../shared/types/dtos';

@Injectable({ providedIn: 'root' })
export class WhatsappEventsService {
  private readonly tokenService = inject(TokenService);

  conectar(idOrganizacao: number): Observable<WhatsappEvento> {
    return new Observable<WhatsappEvento>((subscriber) => {
      const urls = this.websocketUrls();
      const subscriptionId = `whatsapp-org-${idOrganizacao}`;
      const tentativas: string[] = [];
      let socket: WebSocket | null = null;
      let conectado = false;
      let encerrado = false;

      const tentarConectar = (index: number) => {
        if (encerrado) return;

        const url = urls[index];
        if (!url) {
          subscriber.error(
            new Error(
              `Falha na conexao WebSocket. URLs testadas: ${tentativas.join(', ')}`
            )
          );
          return;
        }

        tentativas.push(url);
        socket = new WebSocket(url);

        socket.onopen = () => {
          socket?.send(this.frame('CONNECT', {
            'accept-version': '1.2',
            host: window.location.host,
            Authorization: `Bearer ${this.tokenService.obter() ?? ''}`,
          }));
        };

        socket.onmessage = (message) => {
          for (const rawFrame of String(message.data).split('\0')) {
            if (!rawFrame.trim()) continue;

            const parsed = this.parseFrame(rawFrame);
            if (!parsed) continue;

            if (parsed.command === 'CONNECTED' && !conectado) {
              conectado = true;
              socket?.send(this.frame('SUBSCRIBE', {
                id: subscriptionId,
                destination: `/topic/whatsapp/organizacao/${idOrganizacao}`,
                ack: 'auto',
              }));
              continue;
            }

            if (parsed.command === 'MESSAGE' && parsed.body) {
              subscriber.next(JSON.parse(parsed.body) as WhatsappEvento);
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
          socket.send(this.frame('UNSUBSCRIBE', { id: subscriptionId }));
          socket.send(this.frame('DISCONNECT', {}));
        }
        socket?.close();
      };
    });
  }

  private websocketUrls(): string[] {
    const apiUrl = environment.apiUrl.replace(/\/$/, '');
    const wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws';
    const token = encodeURIComponent(this.tokenService.obter() ?? '');
    const sessionId = Math.random().toString(36).slice(2);

    return [
      wsUrl,
      `${wsUrl}?access_token=${token}`,
      `${wsUrl}/websocket`,
      `${wsUrl}/websocket?access_token=${token}`,
      `${wsUrl}/000/${sessionId}/websocket`,
      `${wsUrl}/000/${sessionId}/websocket?access_token=${token}`,
    ];
  }

  private frame(command: string, headers: Record<string, string>, body = ''): string {
    const headerLines = Object.entries(headers).map(([key, value]) => `${key}:${value}`);
    return [command, ...headerLines, '', body].join('\n') + '\0';
  }

  private parseFrame(frame: string): { command: string; body: string } | null {
    const [head, ...bodyParts] = frame.split('\n\n');
    const command = head.split('\n')[0]?.trim();
    if (!command) return null;
    return { command, body: bodyParts.join('\n\n').trim() };
  }
}
