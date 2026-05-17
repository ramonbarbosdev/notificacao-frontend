import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import { HeaderComponent } from '../../core/layout/header/header.component';
import { SidebarComponent } from '../../core/layout/layout.components';
import { OrganizacaoConfiguracaoService } from '../../core/services/organizacao-configuracao.service';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { DataTableColumn } from '../../shared/components/data-table/data-table.types';
import { usePaginatedTable } from '../../shared/helper/paginated-table.state';
import { AuditoriaEvento } from '../../shared/types/dtos';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, SidebarComponent, HeaderComponent, DataTableComponent],
  templateUrl: './auditoria.component.html',
})
export class AuditoriaComponent implements OnInit {
  private readonly service = inject(OrganizacaoConfiguracaoService);
  readonly table = usePaginatedTable(20);
  readonly eventos = signal<AuditoriaEvento[]>([]);
  readonly erro = signal<string | null>(null);

  readonly columns: DataTableColumn<AuditoriaEvento>[] = [
    { key: 'dtCriacao', label: 'Data', formatter: (value) => this.data(value) },
    { key: 'idUsuario', label: 'Usuario', formatter: (value) => value ? `#${value}` : '-' },
    { key: 'modulo', label: 'Modulo' },
    { key: 'acao', label: 'Acao' },
    { key: 'descricao', label: 'Descricao' },
    { key: 'ip', label: 'IP', formatter: (value) => value || '-' },
  ];

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.table.loading.set(true);
    this.erro.set(null);
    this.service.listarAuditoria({ page: this.table.paginaAtual(), size: this.table.tamanhoPagina() }).subscribe({
      next: (page) => {
        this.eventos.set(page.data);
        this.table.atualizarPaginacao(page);
        this.table.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(err.error?.mensagem ?? 'Erro ao carregar auditoria.');
        this.table.loading.set(false);
      },
    });
  }

  proximaPagina(): void {
    this.table.proximaPagina(() => this.carregar());
  }

  paginaAnterior(): void {
    this.table.paginaAnterior(() => this.carregar());
  }

  alterarTamanhoPagina(size: number): void {
    this.table.alterarTamanhoPagina(size, () => this.carregar());
  }

  private data(value: string | null): string {
    return value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '-';
  }
}
