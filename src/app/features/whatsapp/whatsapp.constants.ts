import { StatusNotificacao, WhatsappStatus } from '../../shared/types/dtos';

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
  NAO_INICIADO: 'Não Iniciado',
  NOT_STARTED: 'Não Iniciado',
  CONECTANDO: 'Conectando',
  CONNECTING: 'Conectando',
  CONECTADO: 'Conectado',
  DESCONECTADO: 'Desconectado',
  DESLOGADO: 'Deslogado',
  ERRO: 'Erro',
};
