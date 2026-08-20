import { CanalNotificacao } from '../types/dtos';

/**
 * Modo fornecedor WhatsApp: UI organizacional exibe apenas WhatsApp.
 * Outros canais permanecem no codigo para uso futuro.
 */
export const FOCO_WHATSAPP = true;

export const CANAL_PADRAO: CanalNotificacao = 'WHATSAPP';

export const TODOS_CANAIS: CanalNotificacao[] = [
  'WHATSAPP',
  'EMAIL',
  'TELEGRAM',
  'WEBHOOK',
];

export const APP_NOME = 'WhatsApp';
export const APP_NOME_COMPLETO = 'WhatsApp — Plataforma';
export const APP_DESCRICAO =
  'Gerencie sessões, envios, contatos e templates via WhatsApp';
