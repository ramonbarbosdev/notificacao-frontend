import { FormArray, FormBuilder, FormGroup } from '@angular/forms';

import { criarItemLoteFormulario } from './whatsapp-lote.form';

export const LIMITE_LOTE_MENSAGENS = 50;

export interface LinhaLoteImportada {
  telefone: string;
  mensagem: string;
  referenciaExterna?: string;
}

export function parseLinhasImportacaoLote(texto: string): LinhaLoteImportada[] {
  return texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0)
    .map((linha) => {
      const partes = linha.split(';').map((parte) => parte.trim());
      const telefone = partes[0] ?? '';
      const mensagem = partes[1] ?? '';
      const referenciaExterna = partes[2] || undefined;

      return { telefone, mensagem, referenciaExterna };
    })
    .filter((item) => item.telefone && item.mensagem);
}

export function aplicarLinhasNoFormularioLote(
  fb: FormBuilder,
  itens: FormArray<FormGroup>,
  linhas: LinhaLoteImportada[],
): void {
  itens.clear();

  const limitadas = linhas.slice(0, LIMITE_LOTE_MENSAGENS);
  for (const linha of limitadas) {
    itens.push(
      criarItemLoteFormulario(fb, {
        telefone: linha.telefone,
        mensagem: linha.mensagem,
        referenciaExterna: linha.referenciaExterna ?? '',
      }),
    );
  }

  if (itens.length === 0) {
    itens.push(criarItemLoteFormulario(fb));
  }
}
