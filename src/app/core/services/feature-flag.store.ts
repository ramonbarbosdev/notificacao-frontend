import { Injectable, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { FeatureFlag, RecursoFeature } from '../../shared/types/dtos';
import { FeatureFlagService } from './feature-flag.service';

type MotorWhatsapp = 'none' | 'WHATSAPP_GATEWAY' | 'WHATSAPP_META_CLOUD';

const PADROES: Partial<Record<RecursoFeature, boolean>> = {
  WHATSAPP: false,
  WHATSAPP_GATEWAY: true,
  WHATSAPP_META_CLOUD: false,
  EMAIL: false,
  TELEGRAM: false,
  WEBHOOK: true,
  TEMPLATES: true,
  API_PUBLICA: false,
  ANALYTICS: false,
};

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

  motorWhatsapp(): MotorWhatsapp {
    const flags = this._flags();
    if (flags.WHATSAPP_META_CLOUD) return 'WHATSAPP_META_CLOUD';
    if (flags.WHATSAPP_GATEWAY) return 'WHATSAPP_GATEWAY';
    if (flags.WHATSAPP) return 'WHATSAPP_GATEWAY';
    return 'none';
  }

  habilitado(recurso: RecursoFeature): boolean {
    if (recurso === 'WHATSAPP') {
      return this.motorWhatsapp() !== 'none';
    }

    if (recurso === 'WHATSAPP_GATEWAY' || recurso === 'WHATSAPP_META_CLOUD') {
      return this.motorWhatsapp() === recurso;
    }

    const flags = this._flags();
    return flags[recurso] ?? PADROES[recurso] ?? false;
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
