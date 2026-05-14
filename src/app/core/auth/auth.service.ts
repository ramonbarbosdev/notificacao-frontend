// src/app/core/auth/auth.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, finalize, mapTo, tap } from 'rxjs/operators';
import { firstValueFrom, Observable, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TokenService } from './token.service';
import {
  LoginRequest,
  LoginResponse,
  SelecionarOrganizacaoRequest,
  SelecionarOrganizacaoResponse,
  UsuarioAtual,
  Organizacao,
} from '../../shared/types/dtos';

const TEMP_TOKEN_KEY = 'nf_temp_token';
const USER_CACHE_KEY = 'nf_user';
const ORGS_CACHE_KEY = 'nf_orgs';
const CURRENT_ORG_KEY = 'nf_current_org';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);

  private readonly _usuario = signal<UsuarioAtual | null>(null);
  private readonly _organizacoes = signal<Organizacao[]>([]);
  private readonly _carregando = signal(false);

  // ── Signals públicos ────────────────────────────────────────────────────────
  readonly usuario = this._usuario.asReadonly();
  readonly organizacoes = this._organizacoes.asReadonly();
  readonly carregando = this._carregando.asReadonly();
  readonly autenticado = computed(() => !!this._usuario());
  readonly role = computed(() => this._usuario()?.role ?? null);
  readonly isSuperAdmin = computed(() => this.role() === 'SUPER_ADMIN');
  readonly nomeUsuario = computed(() => this._usuario()?.nmUsuario ?? null);
  readonly emailUsuario = computed(() => this._usuario()?.nmEmail ?? null);
  readonly idOrganizacaoAtual = computed(() => this._usuario()?.idOrganizacao ?? null);
  readonly organizacaoAtual = computed(() => {
    const idOrganizacao = this.idOrganizacaoAtual();
    if (!idOrganizacao) return null;

    return (
      this._organizacoes().find((org) => org.idOrganizacao === idOrganizacao)?.nmOrganizacao ??
      this.obterOrganizacaoAtualCache()?.nmOrganizacao ??
      `Organizacao #${idOrganizacao}`
    );
  });

  // ── Autenticação ────────────────────────────────────────────────────────────

  login(dados: LoginRequest): Observable<LoginResponse> {
    this._carregando.set(true);
    this.limparTokenTemporario();

    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, dados)
      .pipe(
        tap({
          next: (res) => {
            if (!res.deveSelecionarOrganizacao && res.token) {
              this.tokenService.salvar(res.token);
              this.limparOrganizacoesCache();
              this.carregarUsuarioAtual().subscribe();
            } else {
              if (res.token) {
                this.salvarTokenTemporario(res.token);
              }
              this._organizacoes.set(res.organizacoes ?? []);
              this.salvarOrganizacoesCache(res.organizacoes ?? []);
            }
          },
        }),
        finalize(() => this._carregando.set(false))
      );
  }

  selecionarOrganizacao(
    req: SelecionarOrganizacaoRequest
  ): Observable<SelecionarOrganizacaoResponse> {
    this._carregando.set(true);
    const tokenTemporario = this.obterTokenTemporario();
    const options = tokenTemporario
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${tokenTemporario}` }) }
      : undefined;

    return this.http
      .post<SelecionarOrganizacaoResponse>(
        `${environment.apiUrl}/auth/selecionar-organizacao`,
        req,
        options
      )
      .pipe(
        tap({
          next: (res) => {
            const organizacaoSelecionada = this._organizacoes().find(
              (org) => org.idOrganizacao === req.idOrganizacao
            );

            this.tokenService.salvar(res.token);
            this.limparTokenTemporario();
            this.limparOrganizacoesCache();
            if (organizacaoSelecionada) {
              this.salvarOrganizacaoAtualCache(organizacaoSelecionada);
              this._organizacoes.set([organizacaoSelecionada]);
            }
            this.carregarUsuarioAtual().subscribe();
          },
        }),
        finalize(() => this._carregando.set(false))
      );
  }

  carregarUsuarioAtual(): Observable<UsuarioAtual> {
    return this.http
      .get<UsuarioAtual>(`${environment.apiUrl}/auth/me`)
      .pipe(
        tap((u) => {
          this._usuario.set(u);
          this.salvarUsuarioCache(u);
        })
      );
  }

  logout(): void {
    const tokenTemporario = this.obterTokenTemporario();
    const options = tokenTemporario && !this.tokenService.existe()
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${tokenTemporario}` }) }
      : undefined;

    this.http
      .post(`${environment.apiUrl}/auth/logout`, {}, options)
      .subscribe({ error: () => {} });
    this.tokenService.remover();
    this.limparTokenTemporario();
    this.limparCaches();
    this._usuario.set(null);
    this._organizacoes.set([]);
    this.router.navigate(['/login']);
  }

  /** Restaura sessão ao recarregar a página */
  inicializar(): Promise<void> {
    this.restaurarCaches();

    if (!this.tokenService.existe()) {
      return Promise.resolve();
    }

    if (this.tokenService.estaExpirado()) {
      this.tokenService.remover();
      this.limparTokenTemporario();
      this.limparCaches();
      return Promise.resolve();
    }

    return firstValueFrom(
      this.carregarUsuarioAtual().pipe(
        mapTo(void 0),
        catchError(() => {
          this.tokenService.remover();
          this.limparTokenTemporario();
          this.limparCaches();
          return of(void 0);
        })
      )
    );
  }

  private salvarTokenTemporario(token: string): void {
    sessionStorage.setItem(TEMP_TOKEN_KEY, token);
  }

  private obterTokenTemporario(): string | null {
    return sessionStorage.getItem(TEMP_TOKEN_KEY);
  }

  private limparTokenTemporario(): void {
    sessionStorage.removeItem(TEMP_TOKEN_KEY);
  }

  private salvarUsuarioCache(usuario: UsuarioAtual): void {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(usuario));
  }

  private obterUsuarioCache(): UsuarioAtual | null {
    return this.lerJson<UsuarioAtual>(localStorage.getItem(USER_CACHE_KEY));
  }

  private salvarOrganizacoesCache(organizacoes: Organizacao[]): void {
    sessionStorage.setItem(ORGS_CACHE_KEY, JSON.stringify(organizacoes));
  }

  private obterOrganizacoesCache(): Organizacao[] {
    return this.lerJson<Organizacao[]>(sessionStorage.getItem(ORGS_CACHE_KEY)) ?? [];
  }

  private limparOrganizacoesCache(): void {
    sessionStorage.removeItem(ORGS_CACHE_KEY);
  }

  private salvarOrganizacaoAtualCache(organizacao: Organizacao): void {
    localStorage.setItem(CURRENT_ORG_KEY, JSON.stringify(organizacao));
  }

  private obterOrganizacaoAtualCache(): Organizacao | null {
    return this.lerJson<Organizacao>(localStorage.getItem(CURRENT_ORG_KEY));
  }

  private restaurarCaches(): void {
    const usuario = this.obterUsuarioCache();
    const organizacaoAtual = this.obterOrganizacaoAtualCache();
    const organizacoesPendentes = this.obterOrganizacoesCache();

    if (usuario) {
      this._usuario.set(usuario);
    }

    if (organizacaoAtual) {
      this._organizacoes.set([organizacaoAtual]);
    } else if (organizacoesPendentes.length) {
      this._organizacoes.set(organizacoesPendentes);
    }
  }

  private limparCaches(): void {
    localStorage.removeItem(USER_CACHE_KEY);
    localStorage.removeItem(CURRENT_ORG_KEY);
    this.limparOrganizacoesCache();
  }

  private lerJson<T>(valor: string | null): T | null {
    if (!valor) return null;

    try {
      return JSON.parse(valor) as T;
    } catch {
      return null;
    }
  }
}
