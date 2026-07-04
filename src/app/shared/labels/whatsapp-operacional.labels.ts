import { StatusOperacionalSessao } from '../types/dtos';

export const STATUS_OPERACIONAL_LABELS: Record<StatusOperacionalSessao, string> = {
  ATIVA: 'Operação normal',
  PAUSADA: 'Envios pausados',
  DESCONECTADA: 'Desconectada',
  RISCO_BANIMENTO: 'Risco operacional',
  BLOQUEADA: 'Bloqueada',
};

const FILA_ERRO_EXPLICACOES: Record<string, { titulo: string; explicacao: string; acao: string }> = {
  'Sessao WhatsApp em estado de risco operacional.': {
    titulo: 'Sessão em risco',
    explicacao:
      'A proteção bloqueou novos envios após várias falhas seguidas, para evitar bloqueio do número pelo WhatsApp.',
    acao: 'Abra WhatsApp → corrija a causa → Reativar sessão.',
  },
  'Sessao WhatsApp pausada automaticamente.': {
    titulo: 'Sessão pausada',
    explicacao: 'Houve falhas ao enviar e a proteção pausou temporariamente os envios.',
    acao: 'Aguarde o fim da pausa ou reative em WhatsApp após corrigir o problema.',
  },
  'Fora da janela de envio configurada.': {
    titulo: 'Fora do horário',
    explicacao: 'Os envios só são permitidos no horário configurado (ex.: 08h–18h).',
    acao: 'A mensagem será tentada novamente quando a janela abrir.',
  },
  'Rate limit por minuto atingido.': {
    titulo: 'Limite por minuto',
    explicacao: 'Muitas mensagens foram enviadas no último minuto.',
    acao: 'Aguarde — a fila tentará de novo em breve.',
  },
  'Rate limit por hora atingido.': {
    titulo: 'Limite por hora',
    explicacao: 'O limite de envios por hora foi atingido.',
    acao: 'Aguarde alguns minutos para a fila retomar.',
  },
  'Rate limit diario atingido.': {
    titulo: 'Limite diário',
    explicacao: 'O limite de envios do dia foi atingido.',
    acao: 'Novas tentativas ocorrerão conforme a política de proteção.',
  },
  'Delay entre envios em andamento.': {
    titulo: 'Intervalo entre envios',
    explicacao: 'Há um intervalo mínimo entre mensagens para parecer uso humano.',
    acao: 'A fila enviará automaticamente quando o intervalo terminar.',
  },
};

export function labelStatusOperacional(status?: StatusOperacionalSessao | string | null): string {
  if (!status) return 'Desconhecido';
  return STATUS_OPERACIONAL_LABELS[status as StatusOperacionalSessao] ?? status;
}

export function explicarErroFila(erro?: string | null): {
  mensagem: string;
  titulo?: string;
  explicacao?: string;
  acao?: string;
} {
  const texto = erro?.trim();
  if (!texto) {
    return { mensagem: '—' };
  }

  const conhecido = FILA_ERRO_EXPLICACOES[texto];
  if (conhecido) {
    return {
      mensagem: conhecido.titulo,
      titulo: conhecido.titulo,
      explicacao: conhecido.explicacao,
      acao: conhecido.acao,
    };
  }

  return { mensagem: texto, explicacao: texto };
}

export function severidadeOperacional(
  status?: StatusOperacionalSessao | string | null
): 'success' | 'warn' | 'danger' | 'info' {
  switch (status) {
    case 'ATIVA':
      return 'success';
    case 'PAUSADA':
      return 'warn';
    case 'RISCO_BANIMENTO':
    case 'BLOQUEADA':
      return 'danger';
    default:
      return 'info';
  }
}
