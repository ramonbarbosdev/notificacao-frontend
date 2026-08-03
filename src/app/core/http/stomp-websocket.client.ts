import { Observable } from 'rxjs';
import { frameStomp, parseFrameStomp } from './stomp-websocket.util';

type ProtocoloStomp = string[] | undefined;

const PROTOCOLOS_STOMP: ProtocoloStomp[] = [['v12.stomp', 'v11.stomp'], undefined];

export function criarConexaoStomp<T>(opcoes: {
  urls: string[];
  stompHost: string;
  token: string | null;
  subscriptionId: string;
  destination: string;
  parseMensagem: (body: string) => T;
}): Observable<T> {
  const { urls, stompHost, token, subscriptionId, destination, parseMensagem } = opcoes;

  return new Observable<T>((subscriber) => {
    let socket: WebSocket | null = null;
    let conectado = false;
    let encerrado = false;
    let urlIndex = 0;
    let protocoloIndex = 0;
    let avancando = false;
    const tentativas: string[] = [];

    const registrarTentativa = (url: string, protocolo?: string[]) => {
      const label = protocolo?.length ? `${url} [${protocolo.join(',')}]` : url;
      if (!tentativas.includes(label)) {
        tentativas.push(label);
      }
    };

    const falharTentativa = () => {
      if (encerrado || avancando) return;
      avancando = true;

      protocoloIndex += 1;
      if (protocoloIndex >= PROTOCOLOS_STOMP.length) {
        protocoloIndex = 0;
        urlIndex += 1;
      }

      if (urlIndex >= urls.length) {
        subscriber.error(
          new Error(`Falha na conexao WebSocket. Tentativas: ${tentativas.join(' | ')}`)
        );
        avancando = false;
        return;
      }

      avancando = false;
      conectar();
    };

    const conectar = () => {
      if (encerrado) return;

      const url = urls[urlIndex];
      const protocolo = PROTOCOLOS_STOMP[protocoloIndex];
      registrarTentativa(url, protocolo);

      socket = protocolo ? new WebSocket(url, protocolo) : new WebSocket(url);

      socket.onopen = () => {
        socket?.send(
          frameStomp('CONNECT', {
            'accept-version': '1.2,1.1',
            host: stompHost,
            Authorization: token ? `Bearer ${token}` : '',
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
                destination,
                ack: 'auto',
              })
            );
            continue;
          }

          if (parsed.command === 'MESSAGE' && parsed.body) {
            subscriber.next(parseMensagem(parsed.body));
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
        }
      };

      socket.onclose = () => {
        if (!conectado && !encerrado) {
          falharTentativa();
          return;
        }
        if (!encerrado) {
          subscriber.complete();
        }
      };
    };

    conectar();

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
