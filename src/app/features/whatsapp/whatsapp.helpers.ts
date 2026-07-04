import { HttpErrorResponse } from '@angular/common/http';
import {
  ehStatusDeTentativa,
  extrairMensagemErroHttp,
  resolverMensagemExibicao,
} from '../../shared/labels/notificacao.labels';

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
