export type WhatsappFormatoTexto = 'negrito' | 'italico' | 'riscado' | 'monoespaco';

const MARCADORES: Record<WhatsappFormatoTexto, { abrir: string; fechar: string }> = {
  negrito: { abrir: '*', fechar: '*' },
  italico: { abrir: '_', fechar: '_' },
  riscado: { abrir: '~', fechar: '~' },
  monoespaco: { abrir: '```', fechar: '```' },
};

export function aplicarFormatoWhatsapp(
  texto: string,
  inicio: number,
  fim: number,
  formato: WhatsappFormatoTexto,
): { texto: string; selecaoInicio: number; selecaoFim: number } {
  const { abrir, fechar } = MARCADORES[formato];
  const selecionado = texto.slice(inicio, fim) || 'texto';
  const novo = texto.slice(0, inicio) + abrir + selecionado + fechar + texto.slice(fim);
  const selecaoInicio = inicio + abrir.length;
  const selecaoFim = selecaoInicio + selecionado.length;

  return { texto: novo, selecaoInicio, selecaoFim };
}

/** Preview simples: converte marcadores WhatsApp para HTML seguro (exibicao local). */
export function previewWhatsappHtml(texto: string, outbound = false): string {
  if (!texto) {
    return '';
  }

  let html = texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const codeClass = outbound
    ? 'font-mono text-xs bg-white/20 px-1 rounded'
    : 'font-mono text-xs bg-black/10 px-1 rounded';

  html = html.replace(/```([^`]+)```/g, `<code class="${codeClass}">$1</code>`);
  html = html.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
  html = html.replace(/_([^_\n]+)_/g, '<em>$1</em>');
  html = html.replace(/~([^~\n]+)~/g, '<s>$1</s>');

  return html.replace(/\n/g, '<br />');
}
