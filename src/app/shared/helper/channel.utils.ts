import {
  CANAL_PADRAO,
  FOCO_WHATSAPP,
  TODOS_CANAIS,
} from '../config/product.config';
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

/** Canais exibidos em formularios, filtros e seletores da UI organizacional. */
export function canaisVisiveisUi(): CanalNotificacao[] {
  return FOCO_WHATSAPP ? [CANAL_PADRAO] : TODOS_CANAIS;
}

export function canalUnicoUi(): boolean {
  return canaisVisiveisUi().length === 1;
}

export function opcoesCanalFiltro(incluirTodos = true): { label: string; value: string }[] {
  const canais = canaisVisiveisUi().map((canal) => ({
    label: CANAL_LABELS[canal],
    value: canal,
  }));

  if (!incluirTodos || canalUnicoUi()) {
    return canais;
  }

  return [{ label: 'Todos', value: '' }, ...canais];
}
