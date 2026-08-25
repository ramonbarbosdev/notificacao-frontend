import { normalizeBrazilWhatsappMobile } from './phone.utils';

export interface DestinatarioImportado {
  telefone: string;
  nome?: string;
  mensagem?: string;
  referenciaExterna?: string;
}

export const LIMITE_DESTINATARIOS_LOTE = 50;

export function parseDestinatariosJson(texto: string): DestinatarioImportado[] {
  const bruto = JSON.parse(texto) as unknown;
  const lista = Array.isArray(bruto) ? bruto : [bruto];

  return lista
    .map((item) => normalizarItemImportado(item))
    .filter((item): item is DestinatarioImportado => Boolean(item?.telefone));
}

export function parseDestinatariosCsv(texto: string): DestinatarioImportado[] {
  const linhas = texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0);

  if (linhas.length === 0) {
    return [];
  }

  const primeira = linhas[0].toLowerCase();
  const temCabecalho = primeira.includes('telefone') || primeira.includes('phone');
  const dados = temCabecalho ? linhas.slice(1) : linhas;

  if (temCabecalho) {
    const colunas = linhas[0].split(/[,;]/).map((c) => c.trim().toLowerCase());
    const idxTelefone = colunas.findIndex((c) => c === 'telefone' || c === 'phone' || c === 'celular');
    const idxNome = colunas.findIndex((c) => c === 'nome' || c === 'name' || c === 'nmcontato');
    const idxMensagem = colunas.findIndex((c) => c === 'mensagem' || c === 'message' || c === 'texto');

    return dados
      .map((linha) => {
        const partes = linha.split(/[,;]/).map((p) => p.trim().replace(/^"|"$/g, ''));
        const telefone = idxTelefone >= 0 ? partes[idxTelefone] : partes[0];
        return normalizarItemImportado({
          telefone,
          nome: idxNome >= 0 ? partes[idxNome] : undefined,
          mensagem: idxMensagem >= 0 ? partes[idxMensagem] : undefined,
        });
      })
      .filter((item): item is DestinatarioImportado => Boolean(item?.telefone));
  }

  return dados
    .map((linha) => {
      const partes = linha.split(/[,;]/).map((p) => p.trim().replace(/^"|"$/g, ''));
      if (partes.length >= 2 && /^\d+$/.test(partes[0].replace(/\D/g, ''))) {
        return normalizarItemImportado({
          telefone: partes[0],
          nome: partes[1],
          mensagem: partes[2],
        });
      }

      return normalizarItemImportado({ telefone: partes[0], mensagem: partes[1] });
    })
    .filter((item): item is DestinatarioImportado => Boolean(item?.telefone));
}

export function parseDestinatariosLinhas(texto: string): DestinatarioImportado[] {
  return texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0)
    .map((linha) => {
      const partes = linha.split(';').map((p) => p.trim());
      return normalizarItemImportado({
        telefone: partes[0],
        mensagem: partes[1],
        referenciaExterna: partes[2],
      });
    })
    .filter((item): item is DestinatarioImportado => Boolean(item?.telefone));
}

function normalizarItemImportado(item: unknown): DestinatarioImportado | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const registro = item as Record<string, unknown>;
  const telefoneBruto = String(
    registro['telefone'] ?? registro['phone'] ?? registro['celular'] ?? registro['destinatario'] ?? '',
  ).trim();

  if (!telefoneBruto) {
    return null;
  }

  const telefone = normalizeBrazilWhatsappMobile(telefoneBruto);
  if (telefone.length < 12 || telefone.length > 13) {
    return null;
  }

  const nome = registro['nome'] ?? registro['name'] ?? registro['nmContato'];
  const mensagem = registro['mensagem'] ?? registro['message'] ?? registro['texto'];
  const referenciaExterna = registro['referenciaExterna'] ?? registro['referencia'] ?? registro['ref'];

  return {
    telefone,
    nome: typeof nome === 'string' && nome.trim() ? nome.trim() : undefined,
    mensagem: typeof mensagem === 'string' && mensagem.trim() ? mensagem.trim() : undefined,
    referenciaExterna:
      typeof referenciaExterna === 'string' && referenciaExterna.trim()
        ? referenciaExterna.trim()
        : undefined,
  };
}

export function deduplicarDestinatarios(itens: DestinatarioImportado[]): DestinatarioImportado[] {
  const mapa = new Map<string, DestinatarioImportado>();

  for (const item of itens) {
    mapa.set(item.telefone, { ...mapa.get(item.telefone), ...item });
  }

  return [...mapa.values()].slice(0, LIMITE_DESTINATARIOS_LOTE);
}
