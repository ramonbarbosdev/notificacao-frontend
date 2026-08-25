import { Injectable, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { FeatureFlag, RecursoFeature } from '../../shared/types/dtos';
import { FeatureFlagService } from './feature-flag.service';

@Injectable({ providedIn: 'root' })
export class FeatureFlagStore {
  private readonly featureFlagService = inject(FeatureFlagService);

  private readonly _flags = signal<Partial<Record<RecursoFeature, boolean>>>({});
  private readonly _carregado = signal(false);

  readonly flags = this._flags.asReadonly();
  readonly carregado = this._carregado.asReadonly();

  carregar(): Observable<void> {
    return this.featureFlagService.listarOrganizacaoAtual().pipe(
      tap((lista) => this.aplicar(lista)),
      map(() => void 0),
      catchError(() => {
        this._flags.set({});
        this._carregado.set(true);
        return of(void 0);
      }),
    );
  }

  habilitado(recurso: RecursoFeature): boolean {
    const flags = this._flags();

    if (recurso === 'WHATSAPP_GATEWAY' || recurso === 'WHATSAPP_META_CLOUD') {
      const especifico = flags[recurso];
      if (especifico !== undefined) {
        return especifico;
      }
      const legado = flags['WHATSAPP'];
      if (legado !== undefined) {
        return legado;
      }
    }

    return flags[recurso] ?? true;
  }

  limpar(): void {
    this._flags.set({});
    this._carregado.set(false);
  }

  private aplicar(lista: FeatureFlag[]): void {
    const mapa = Object.fromEntries(
      lista.map((item) => [item.recurso, item.habilitado]),
    ) as Partial<Record<RecursoFeature, boolean>>;

    this._flags.set(mapa);
    this._carregado.set(true);
  }
}
