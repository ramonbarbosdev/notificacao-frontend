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

export const EMPRESA_NOME = 'Ramon Barbosa';
export const EMPRESA_TAGLINE =
  'Plataforma multi-organização para envio de notificações WhatsApp com fila, templates e API.';
export const CONTATO_EMAIL = 'ramonlegendario21@gmail.com';
export const CONTATO_WHATSAPP = '5571991180200';
