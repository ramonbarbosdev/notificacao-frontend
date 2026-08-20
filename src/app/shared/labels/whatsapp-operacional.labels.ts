import { StatusOperacionalSessao } from '../types/dtos';

export const CODIGO_ERRO_RESTRICAO_CONTATO_WHATSAPP = 'WHATSAPP_RESTRICAO_463';

export const EXPLICACAO_RESTRICAO_CONTATO_WHATSAPP = {
  titulo: 'Contato precisa iniciar a conversa',
  mensagem: 'Restrição do WhatsApp para novo contato',
  explicacao:
    'Esta falha é só deste destinatário. A sessão WhatsApp continua ativa para os demais contatos. ' +
    'O WhatsApp exige histórico ou que o contato envie a primeira mensagem antes de receber mensagens outbound.',
  acao:
    'Peça para o destinatário enviar uma mensagem para o seu número conectado. ' +
    'Depois tente reenviar esta notificação — não é necessário reativar a sessão.',
};

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
  'WhatsApp nao confirmou a entrega da mensagem': {
    titulo: 'Entrega não confirmada',
    explicacao:
      'O WhatsApp aceitou o pacote mas não devolveu recibo (timeout/USync). Isso indica restrição 463 ou contato sem histórico na sessão.',
    acao: 'Peça para o destinatário enviar a primeira mensagem pelo celular e tente novamente.',
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
  'Configuracao ativa nao encontrada para o canal WHATSAPP': {
    titulo: 'Canal WhatsApp não provisionado',
    explicacao:
      'Esta organização ainda não tinha a configuração interna do canal WhatsApp necessária para enviar mensagens.',
    acao:
      'Abra a página WhatsApp para ativar o canal automaticamente. Se o erro persistir, peça ao administrador para revisar a organização.',
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

export function ehErroRestricaoContatoWhatsapp(
  mensagem?: string | null,
  codigoErro?: string | null,
): boolean {
  if (codigoErro === CODIGO_ERRO_RESTRICAO_CONTATO_WHATSAPP) {
    return true;
  }

  if (!mensagem?.trim()) return false;

  const normalizado = mensagem.toLowerCase();

  return (
    normalizado.includes('nao conseguiu preparar o envio') ||
    normalizado.includes('não conseguiu preparar o envio') ||
    normalizado.includes('nao confirmou a entrega') ||
    normalizado.includes('nao devolveu recibo') ||
    normalizado.includes('timed out waiting for message') ||
    normalizado.includes('usync fetch yielded no results') ||
    normalizado.includes('tokens de privacidade') ||
    normalizado.includes('lid indisponivel') ||
    normalizado.includes('lid indisponível') ||
    normalizado.includes('463') ||
    normalizado.includes('tctoken') ||
    normalizado.includes('restricao 463') ||
    normalizado.includes('restrição 463') ||
    normalizado.includes('account restricted')
  );
}

export function ehErroPausaSessaoWhatsapp(mensagem?: string | null): boolean {
  if (!mensagem?.trim()) return false;

  const normalizado = mensagem.toLowerCase();

  return (
    normalizado.includes('risco operacional') ||
    normalizado.includes('pausada automaticamente') ||
    normalizado.includes('bloqueada por protecao operacional')
  );
}

export function explicarErroFila(
  erro?: string | null,
  codigoErro?: string | null,
): {
  mensagem: string;
  titulo?: string;
  explicacao?: string;
  acao?: string;
} {
  const texto = erro?.trim();
  if (!texto && !ehErroRestricaoContatoWhatsapp(null, codigoErro)) {
    return { mensagem: '—' };
  }

  if (ehErroRestricaoContatoWhatsapp(texto, codigoErro)) {
    return { ...EXPLICACAO_RESTRICAO_CONTATO_WHATSAPP };
  }

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
    normalizado.includes('configuracao ativa nao encontrada') ||
    normalizado.includes('configuração ativa não encontrada')
  ) {
    return {
      mensagem: 'Canal WhatsApp não provisionado',
      titulo: 'Canal WhatsApp não provisionado',
      explicacao:
        'Esta organização ainda não tinha a configuração interna do canal WhatsApp necessária para enviar mensagens.',
      acao:
        'Abra a página WhatsApp para ativar o canal automaticamente. Se o erro persistir, peça ao administrador para revisar a organização.',
    };
  }

    if (
        normalizado.includes('nao conseguiu preparar o envio') ||
        normalizado.includes('não conseguiu preparar o envio') ||
        normalizado.includes('nao confirmou a entrega') ||
        normalizado.includes('nao devolveu recibo') ||
        normalizado.includes('timed out waiting for message') ||
        normalizado.includes('usync fetch yielded no results') ||
        normalizado.includes('tokens de privacidade') ||
        normalizado.includes('lid indisponivel') ||
    normalizado.includes('lid indisponível') ||
    normalizado.includes('463') ||
    normalizado.includes('tctoken') ||
    normalizado.includes('restricao 463') ||
    normalizado.includes('restrição 463') ||
    normalizado.includes('account restricted')
  ) {
    return { ...EXPLICACAO_RESTRICAO_CONTATO_WHATSAPP };
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
