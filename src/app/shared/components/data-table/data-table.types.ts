export interface DataTableColumn<T = any> {
  key: keyof T | string;
  label: string;

  width?: string;

  align?: 'left' | 'center' | 'right';

  type?:
    | 'text'
    | 'badge'
    | 'date'
    | 'boolean'
    | 'actions'
    | 'rich';

  formatter?: (value: any, row: T) => string;

  rich?: (value: any, row: T) => {
    title: string;
    description?: string;
    hint?: string;
    link?: { label: string; href: string };
  };

  badge?: (value: any, row: T) => {
    label: string;
    className: string;
  };

  actions?: DataTableAction<T>[];

  filter?: DataTableColumnFilter;
}

export interface DataTableAction<T = any> {
  label: string;
  icon?: any;
  color?: 'primary' | 'danger' | 'success';

  action: (row: T) => void;
}

export type DataTableFilterType = 'text' | 'select' | 'boolean' | 'date' | 'number';

export interface DataTableFilterOption {
  label: string;
  value: string | boolean | number | null;
}

export interface DataTableColumnFilter {
  type: DataTableFilterType;
  placeholder?: string;
  debounceMs?: number;
  options?: DataTableFilterOption[];
}
