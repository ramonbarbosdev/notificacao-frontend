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

export function ehErroNumeroInexistente(mensagem?: string | null): boolean {
  if (!mensagem?.trim()) return false;

  const normalizado = mensagem.toLowerCase();
  return (
    normalizado.includes('nao encontrado no whatsapp') ||
    normalizado.includes('não encontrado no whatsapp') ||
    normalizado.includes('numero informado nao encontrado') ||
    normalizado.includes('número informado não encontrado') ||
    normalizado.includes('not registered on whatsapp') ||
    normalizado.includes('nao esta no whatsapp') ||
    normalizado.includes('não está no whatsapp') ||
    normalizado.includes('is not on whatsapp')
  );
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

  const normalizado = texto.toLowerCase();

  if (ehErroNumeroInexistente(texto)) {
    return {
      mensagem: 'Número não encontrado no WhatsApp',
      titulo: 'Número não encontrado no WhatsApp',
      explicacao:
        'O WhatsApp não reconhece este número como um usuário ativo. ' +
        'Isso pode indicar número incorreto, inexistente ou sem conta WhatsApp.',
      acao:
        'Confira DDI + DDD + número completo, teste abrir o contato no celular ' +
        'e corrija o destinatário antes de tentar novamente.',
    };
  }

  if (
    normalizado.includes('463') ||
    normalizado.includes('tctoken') ||
    normalizado.includes('restricao 463') ||
    normalizado.includes('restrição 463') ||
    normalizado.includes('account restricted')
  ) {
    return {
      mensagem: 'WhatsApp bloqueou o envio (463)',
      titulo: 'Restrição do WhatsApp para novo contato',
      explicacao:
        'O WhatsApp recusou a mensagem porque este número ainda não tem histórico de conversa com você, ' +
        'ou a conta está com limite temporário de novas conversas.',
      acao:
        'Peça para o destinatário enviar uma mensagem para o seu número primeiro. ' +
        'Use o WhatsApp no celular normalmente e evite disparos em massa por algumas horas.',
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
