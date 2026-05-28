import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import {
  Download,
  LoaderCircle,
  LucideAngularModule,
  RefreshCcw,
  Upload,
} from 'lucide-angular';

import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { DataTableColumn } from '../../../../shared/components/data-table/data-table.types';
import { ContatoResponseDTO } from '../../../../shared/types/dtos';

type AcaoContato = 'consentimento' | 'bloqueio' | 'sync' | 'import' | 'export' | null;

@Component({
  selector: 'app-contato-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DataTableComponent],
  templateUrl: './contato-list.component.html',
})
export class ContatoListComponent {
  contatos = input.required<ContatoResponseDTO[]>();
  columns = input.required<DataTableColumn<ContatoResponseDTO>[]>();
  table = input.required<any>();
  acaoAtual = input.required<AcaoContato>();
  erro = input<string | null>(null);
  mensagemImportacao = input<string | null>(null);

  novoContato = output<void>();
  importar = output<Event>();
  exportar = output<void>();
  sincronizar = output<void>();
  filterChange = output<Record<string, any>>();
  nextPage = output<void>();
  previousPage = output<void>();
  pageSizeChange = output<number>();

  readonly loaderIcon = LoaderCircle;
  readonly importIcon = Upload;
  readonly exportIcon = Download;
  readonly syncIcon = RefreshCcw;
}