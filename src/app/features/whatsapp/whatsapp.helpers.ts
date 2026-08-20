import { HttpErrorResponse } from '@angular/common/http';
import {
  ehStatusDeTentativa,
  extrairMensagemErroHttp,
  resolverMensagemExibicao,
} from '../../shared/labels/notificacao.labels';
import { explicarErroFila } from '../../shared/labels/whatsapp-operacional.labels';

export { ehStatusDeTentativa, resolverMensagemExibicao };

export function montarQrImagemSrc(qrImagem: string | null | undefined): string {
  if (!qrImagem) return '';

  return qrImagem.startsWith('data:image/')
    ? qrImagem
    : `data:image/png;base64,${qrImagem}`;
}

export function ehErroConsentimento(mensagem: string | null | undefined): boolean {
  if (!mensagem) return false;

  const texto = mensagem.toLowerCase();

  return (
    texto.includes('consentimento') ||
    texto.includes('opt-in') ||
    texto.includes('opt in') ||
    texto.includes('bloque')
  );
}

export function extrairMensagemErro(
  err: HttpErrorResponse,
  fallback: string
): string {
  return extrairMensagemErroHttp(err, fallback);
}

export function detalheErroEnvio(mensagem: string | null | undefined) {
  return explicarErroFila(mensagem);
}

/** Gateway pode retornar CONNECTED; API interna usa CONECTADO. */
export function ehWhatsappConectado(
  status: string | null | undefined,
  conectado?: boolean | null,
): boolean {
  const normalized = status?.trim().toUpperCase();

  if (normalized === 'CONECTADO' || normalized === 'CONNECTED') {
    return true;
  }

  if (
    normalized === 'DESCONECTADO'
    || normalized === 'DISCONNECTED'
    || normalized === 'DESLOGADO'
    || normalized === 'LOGGED_OUT'
  ) {
    return false;
  }

  return conectado === true;
}
