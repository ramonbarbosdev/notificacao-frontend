// src/app/core/auth/token.service.ts
import { Injectable } from '@angular/core';

const TOKEN_KEY = 'nf_token';

@Injectable({ providedIn: 'root' })
export class TokenService {

  salvar(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  obter(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  remover(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  existe(): boolean {
    return !!this.obter();
  }

  /** Decodifica o payload JWT sem biblioteca externa */
  payload(): Record<string, unknown> | null {
    const token = this.obter();
    if (!token) return null;
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  role(): string | null {
    return (this.payload()?.['role'] as string) ?? null;
  }

  tipoGlobalValor(): 'SUPER_ADMIN' | 'DEFAULT' | null {
    const tipoGlobal = this.payload()?.['tipoGlobal'];
    if (tipoGlobal === 'SUPER_ADMIN' || tipoGlobal === true) return 'SUPER_ADMIN';
    if (tipoGlobal === 'DEFAULT' || tipoGlobal === false) return 'DEFAULT';
    return null;
  }

  tipoGlobal(): boolean {
    return this.tipoGlobalValor() === 'SUPER_ADMIN';
  }

  isSuperAdmin(): boolean {
    return this.tipoGlobal() || this.role() === 'SUPER_ADMIN';
  }

  idOrganizacao(): number | null {
    const id = this.payload()?.['idOrganizacao'];
    return id != null ? Number(id) : null;
  }

  estaExpirado(): boolean {
    const exp = this.payload()?.['exp'] as number | undefined;
    if (!exp) return true;
    return Date.now() / 1000 > exp;
  }
}
