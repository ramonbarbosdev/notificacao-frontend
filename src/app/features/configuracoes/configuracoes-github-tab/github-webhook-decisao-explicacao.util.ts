import { GithubWebhookDecisao } from '../../../shared/types/dtos';

function textoDetalhe(detalhe: Record<string, unknown> | undefined, chave: string): string | null {
  if (!detalhe) {
    return null;
  }
  const valor = detalhe[chave];
  if (typeof valor === 'string' && valor.trim()) {
    return valor.trim();
  }
  return null;
}

function boolDetalhe(detalhe: Record<string, unknown> | undefined, chave: string): boolean {
  return detalhe?.[chave] === true;
}

/** Legenda amigável para a coluna "Status" da tabela de eventos. */
export function labelStatusDestinoEvento(statusDestino: string | null | undefined): string {
  if (!statusDestino?.trim()) {
    return '—';
  }
  const s = statusDestino.trim().toLowerCase();
  const mapa: Record<string, string> = {
    assigned: 'Responsável atribuído',
    unassigned: 'Responsável removido',
    opened: 'Issue aberta',
    closed: 'Issue fechada',
    reopened: 'Issue reaberta',
    labeled: 'Label na issue',
    editado: 'Edição no board (sem coluna)',
    reordenado: 'Reordenado no board',
    removido: 'Removido do board',
  };
  return mapa[s] ?? statusDestino.trim();
}

/**
 * Explicação para o usuário (API envia `explicacaoUsuario` em eventos novos; fallback para logs antigos).
 */
export function explicarDecisaoWebhook(item: GithubWebhookDecisao): string {
  const daApi = textoDetalhe(item.detalhe, 'explicacaoUsuario');
  if (daApi) {
    return daApi;
  }

  const d = item.detalhe;
  const destino = item.statusDestino?.trim() ?? '';
  const destinoLegivel = labelStatusDestinoEvento(item.statusDestino);

  switch (item.resultado) {
    case 'ENVIADO':
      return item.whatsappEnfileirados > 0
        ? `WhatsApp enfileirado (${item.whatsappEnfileirados}). Fluxo: ${item.fluxoDestinatarios ?? 'geral'}.`
        : 'Processado sem destinatários com opt-in.';
    case 'IGNORADO_GATILHO':
      return `Nenhum gatilho habilitado corresponde ao evento ${item.githubEvent ?? '?'}/${item.action ?? '?'}. Confira os checkboxes em Regras e salve.`;
    case 'IGNORADO_EVENTO':
      return 'Evento ou ação não tratada pela integração (ex.: push, ou project v2 created).';
    case 'IGNORADO_SEM_OPTIN':
      return 'Havia destinatários no card, mas nenhum com WhatsApp ativado na organização.';
    case 'FILA_SEM_DESTINATARIO':
      return 'Registrado na fila como bloqueado: sem responsável/opt-in conforme suas regras.';
    case 'IGNORADO_STATUS': {
      const partes: string[] = [];
      if (destino === 'assigned' || destino === 'unassigned') {
        partes.push(
          'Alteração de responsável na issue. O filtro de colunas (geral) só vale ao mover Status no board; use Responsável alterado / Tarefa atribuída.',
        );
      } else if (destino === 'Editado') {
        partes.push(
          'Edição no board sem mudança de coluna Status no payload. Avaliadores só disparam ao entrar na coluna configurada.',
        );
      }
      if (boolDetalhe(d, 'issueAvaliadoresNaoAplicado')) {
        partes.push(
          'Aviso a avaliadores de Issue não se aplica (não foi entrada na coluna da lista de Issue).',
        );
      }
      if (boolDetalhe(d, 'prAvaliadoresNaoAplicado')) {
        partes.push('Aviso a avaliadores de PR não se aplica neste evento.');
      }
      const filtroGeral = textoDetalhe(d, 'filtroGeral');
      if (filtroGeral && destino && destino !== 'assigned' && destino !== 'unassigned' && destino !== 'Editado') {
        partes.push(`Coluna "${destinoLegivel}" fora do filtro geral (${filtroGeral}).`);
      }
      return partes.length > 0 ? partes.join(' ') : item.descricao || 'Bloqueado pelo filtro de status.';
    }
    default:
      return item.descricao || item.resultado;
  }
}
