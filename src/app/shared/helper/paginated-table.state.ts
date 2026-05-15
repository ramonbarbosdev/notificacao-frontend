import { signal } from '@angular/core';

export function usePaginatedTable(defaultSize = 5) {
  const filtroTexto = signal('');
  const filtroStatus = signal<string>('TODOS');

  const paginaAtual = signal(0);
  const tamanhoPagina = signal(defaultSize);
  const totalElementos = signal(0);
  const totalPaginas = signal(0);
  const loading = signal(false);

  function aplicarFiltros(callback: () => void): void {
    paginaAtual.set(0);
    callback();
  }

  function proximaPagina(callback: () => void): void {
    if (paginaAtual() + 1 >= totalPaginas()) return;

    paginaAtual.update((page) => page + 1);
    callback();
  }

  function paginaAnterior(callback: () => void): void {
    if (paginaAtual() <= 0) return;

    paginaAtual.update((page) => page - 1);
    callback();
  }

  function alterarTamanhoPagina(size: number, callback: () => void): void {
    tamanhoPagina.set(size);
    paginaAtual.set(0);
    callback();
  }

  function atualizarPaginacao(page: {
    totalElements: number;
    totalPages: number;
    page: number;
    pageSize: number;
  }): void {
    totalElementos.set(page.totalElements);
    totalPaginas.set(page.totalPages);
    paginaAtual.set(page.page);
    tamanhoPagina.set(page.pageSize);
  }

  return {
    filtroTexto,
    filtroStatus,
    paginaAtual,
    tamanhoPagina,
    totalElementos,
    totalPaginas,
    loading,

    aplicarFiltros,
    proximaPagina,
    paginaAnterior,
    alterarTamanhoPagina,
    atualizarPaginacao,
  };
}