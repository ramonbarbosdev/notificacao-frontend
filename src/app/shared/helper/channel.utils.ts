import { CanalNotificacao } from '../types/dtos';

export const CANAL_LABELS: Record<CanalNotificacao, string> = {
  WHATSAPP: 'WhatsApp',
  EMAIL: 'E-mail',
  TELEGRAM: 'Telegram',
  WEBHOOK: 'Webhook',
};

export function formatCanal(canal: CanalNotificacao | string | null | undefined): string {
  if (!canal) return '-';

  return CANAL_LABELS[canal as CanalNotificacao] ?? canal;
}
