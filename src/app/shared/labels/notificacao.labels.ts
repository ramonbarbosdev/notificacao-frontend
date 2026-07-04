import { HttpErrorResponse } from '@angular/common/http';
import { StatusNotificacao, WhatsappStatus } from '../types/dtos';

export const STATUS_TENTATIVA = new Set<string>([
  'CONECTANDO',
  'CONNECTING',
  'AGUARDANDO_QR',
  'PENDING_QR',
]);

export const STATUS_LABELS: Record<StatusNotificacao, string> = {
  PENDENTE: 'Pendente',
  PROCESSANDO: 'Processando',
  ENVIADA: 'Enviada',
  ENTREGUE: 'Entregue',
  LIDA: 'Lida',
  FALHOU: 'Falhou',
  BLOQUEADA: 'Bloqueada',
  CANCELADA: 'Cancelada',
};

export const STATUS_TENTATIVA_LABELS: Record<WhatsappStatus, string> = {
  PENDING_QR: 'Pendente leitura QR',
  AGUARDANDO_QR: 'Aguardando leitura QR',
  NAO_INICIADO: 'Não iniciado',
  NOT_STARTED: 'Não iniciado',
  CONECTANDO: 'Conectando',
  CONNECTING: 'Conectando',
  CONECTADO: 'Conectado',
  DESCONECTADO: 'Desconectado',
  DESLOGADO: 'Deslogado',
  ERRO: 'Erro',
};

/** Códigos HTTP / API da notificacao-api (`erro` no corpo). */
export const API_ERRO_LABELS: Record<string, string> = {
  BAD_REQUEST: 'Requisição inválida',
  UNAUTHORIZED: 'Não autenticado',
  FORBIDDEN: 'Acesso negado',
  NOT_FOUND: 'Recurso não encontrado',
  CONFLICT: 'Conflito na operação',
  INTERNAL_SERVER_ERROR: 'Erro interno do servidor',
  GATEWAY_INDISPONIVEL: 'Gateway WhatsApp indisponível',
  HTTP_ERROR: 'Falha na comunicação com o servidor',
};

/** Códigos de integração OrcaFacil / envio de notificações. */
export const INTEGRACAO_ERRO_LABELS: Record<string, string> = {
  API_KEY_INVALIDA: 'API Key inválida ou expirada',
  API_KEY_SEM_PERMISSAO: 'API Key sem permissão para esta operação',
  SERVICO_NAO_ENCONTRADO: 'Serviço de notificações indisponível',
  LIMITE_EXCEDIDO: 'Limite de envios excedido',
  SERVICO_INDISPONIVEL: 'Serviço de notificações temporariamente indisponível',
  ERRO_INTERNO_NOTIFICACAO: 'Erro interno ao processar a notificação',
  ERRO_ENVIO: 'Não foi possível enviar a mensagem',
  TIMEOUT: 'O serviço demorou para responder',
  SERVICO_OFFLINE: 'Serviço de notificações offline',
  REDE: 'Falha de conexão com o serviço de notificações',
  ERRO_INESPERADO: 'Erro inesperado ao processar a solicitação',
  WHATSAPP_SESSAO_PAUSADA: 'Sessão WhatsApp pausada',
  WHATSAPP_SESSAO_RISCO: 'Sessão WhatsApp em risco de bloqueio',
  FILA_FALHA_DEFINITIVA: 'Falha definitiva no envio',
  FILA_BLOQUEADA_PROTECAO: 'Envio bloqueado por proteção',
};

export function ehStatusDeTentativa(status: string | null | undefined): boolean {
  return !!status && STATUS_TENTATIVA.has(status);
}

export function labelStatusNotificacao(status: string | null | undefined): string {
  if (!status) return '—';
  return STATUS_LABELS[status as StatusNotificacao] ?? humanizarCodigo(status);
}

export function labelWhatsappStatus(status: string | null | undefined): string {
  if (!status) return 'Desconhecido';
  return STATUS_TENTATIVA_LABELS[status as WhatsappStatus] ?? humanizarCodigo(status);
}

export function labelCodigoErro(codigo: string | null | undefined): string {
  if (!codigo?.trim()) return 'Erro desconhecido';
  const chave = codigo.trim().toUpperCase();
  return (
    INTEGRACAO_ERRO_LABELS[chave] ??
    API_ERRO_LABELS[chave] ??
    humanizarCodigo(codigo)
  );
}

/** Prioriza mensagem legível; traduz códigos técnicos quando necessário. */
export function resolverMensagemExibicao(
  mensagem?: string | null,
  codigo?: string | null,
  fallback = 'Ocorreu um erro. Tente novamente.'
): string {
  const msg = mensagem?.trim();
  const cod = codigo?.trim();

  if (msg && !ehCodigoTecnico(msg)) {
    return msg;
  }
  if (cod) {
    return labelCodigoErro(cod);
  }
  if (msg) {
    return labelCodigoErro(msg);
  }
  return fallback;
}

export function extrairMensagemErroHttp(
  err: HttpErrorResponse,
  fallback: string
): string {
  const body = err.error;
  if (!body || typeof body !== 'object') {
    return fallback;
  }
  const mensagem = typeof body.mensagem === 'string' ? body.mensagem : undefined;
  const message = typeof body.message === 'string' ? body.message : undefined;
  const codigo = typeof body.erro === 'string' ? body.erro : typeof body.error === 'string' ? body.error : undefined;
  return resolverMensagemExibicao(mensagem ?? message, codigo, fallback);
}

function ehCodigoTecnico(texto: string): boolean {
  const valor = texto.trim();
  return /^[A-Z][A-Z0-9_]*$/.test(valor) && valor.includes('_');
}

function humanizarCodigo(codigo: string): string {
  return codigo
    .trim()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}
