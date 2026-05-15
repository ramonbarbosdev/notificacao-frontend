import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  DataTableAction,
  DataTableColumn,
} from './data-table.types';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-table.component.html',
})
export class DataTableComponent<T = any> implements OnChanges, OnDestroy {
  @Input() columns: DataTableColumn<T>[] = [];
  @Input() items: T[] = [];
  @Input() loading = false;
  @Input() page = 0;
  @Input() pageSize = 10;
  @Input() totalElements = 0;
  @Input() totalPages = 0;

  @Output() nextPage = new EventEmitter<void>();
  @Output() previousPage = new EventEmitter<void>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() filterChange = new EventEmitter<Record<string, any>>();

  filterValues: Record<string, any> = {};

  private readonly filterTimers = new Map<string, ReturnType<typeof setTimeout>>();

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['columns']) return;

    this.filterValues = this.columns.reduce((acc, column) => {
      if (column.filter) {
        const key = this.columnKey(column);
        acc[key] = this.filterValues[key] ?? '';
      }

      return acc;
    }, {} as Record<string, any>);
  }

  ngOnDestroy(): void {
    this.filterTimers.forEach((timer) => clearTimeout(timer));
    this.filterTimers.clear();
  }

  getValue(row: T, key: string): any {
    return (row as any)?.[key];
  }

  onPageSizeChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.pageSizeChange.emit(value);
  }

  onFilterChange(column: DataTableColumn<T>, value: any): void {
    const key = this.columnKey(column);
    const filter = column.filter;

    if (!filter) return;

    this.filterValues = {
      ...this.filterValues,
      [key]: this.normalizeFilterValue(value, filter.type),
    };

    if (filter.type === 'text') {
      this.emitDebouncedFilterChange(key, filter.debounceMs ?? 500);
      return;
    }

    this.clearFilterTimer(key);
    this.emitFilters();
  }

  clearFilters(): void {
    this.filterTimers.forEach((timer) => clearTimeout(timer));
    this.filterTimers.clear();

    this.filterValues = this.columns.reduce((acc, column) => {
      if (column.filter) {
        acc[this.columnKey(column)] = '';
      }

      return acc;
    }, {} as Record<string, any>);

    this.filterChange.emit({});
  }

  hasColumnFilters(): boolean {
    return this.columns.some((column) => !!column.filter);
  }

  columnKey(column: DataTableColumn<T>): string {
    return column.key.toString();
  }

  hasActiveFilters(): boolean {
    return Object.values(this.compactFilters()).length > 0;
  }

  getActionColor(action: DataTableAction): string {
    switch (action.color) {
      case 'danger':
        return 'text-[var(--color-danger)]';

      case 'success':
        return 'text-[var(--color-success)]';

      default:
        return 'text-[var(--color-primary-soft)]';
    }
  }

  private emitDebouncedFilterChange(key: string, debounceMs: number): void {
    this.clearFilterTimer(key);

    this.filterTimers.set(
      key,
      setTimeout(() => {
        this.filterTimers.delete(key);
        this.emitFilters();
      }, debounceMs)
    );
  }

  private clearFilterTimer(key: string): void {
    const timer = this.filterTimers.get(key);

    if (!timer) return;

    clearTimeout(timer);
    this.filterTimers.delete(key);
  }

  private emitFilters(): void {
    this.filterChange.emit(this.compactFilters());
  }

  private compactFilters(): Record<string, any> {
    return Object.entries(this.filterValues).reduce((acc, [key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        acc[key] = value;
      }

      return acc;
    }, {} as Record<string, any>);
  }

  private normalizeFilterValue(value: any, type: string): any {
    if (value === '' || value === null || value === undefined) return '';

    if (type === 'boolean') {
      return value === true || value === 'true';
    }

    if (type === 'number') {
      const numericValue = Number(value);
      return Number.isNaN(numericValue) ? '' : numericValue;
    }

    return value;
  }
}
