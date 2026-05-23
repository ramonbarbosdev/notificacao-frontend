import { HttpErrorResponse } from '@angular/common/http';
import { STATUS_TENTATIVA } from './whatsapp.constants';

export function ehStatusDeTentativa(status: string | null | undefined): boolean {
  return !!status && STATUS_TENTATIVA.has(status);
}

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
  return err.error?.mensagem ?? err.error?.erro ?? fallback;
}
