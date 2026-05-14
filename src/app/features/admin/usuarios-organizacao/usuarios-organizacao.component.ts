import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CheckCircle2, LoaderCircle, LucideAngularModule, UserPlus } from 'lucide-angular';
import { SidebarComponent } from '../../../core/layout/layout.components';
import { HeaderComponent } from '../../../core/layout/header/header.component';
import { AdminService } from '../../../core/http/admin.service';
import {
  OrganizacaoAdminResponse,
  RoleOrganizacao,
  UsuarioOrganizacaoResponse,
} from '../../../shared/types/dtos';

@Component({
  selector: 'app-usuarios-organizacao',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    SidebarComponent,
    HeaderComponent,
  ],
  templateUrl: './usuarios-organizacao.component.html',
})
export class UsuariosOrganizacaoComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);

  protected readonly userPlusIcon = UserPlus;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly successIcon = CheckCircle2;

  readonly roles: RoleOrganizacao[] = ['ADMIN', 'USER'];
  readonly carregando = signal(false);
  readonly carregandoOrganizacoes = signal(false);
  readonly carregandoUsuarios = signal(false);
  readonly erro = signal<string | null>(null);
  readonly erroOrganizacoes = signal<string | null>(null);
  readonly erroUsuarios = signal<string | null>(null);
  readonly sucesso = signal<UsuarioOrganizacaoResponse | null>(null);
  readonly organizacoes = signal<OrganizacaoAdminResponse[]>([]);
  readonly usuarios = signal<UsuarioOrganizacaoResponse[]>([]);
  readonly idOrganizacaoSelecionada = signal<number | null>(null);
  readonly organizacaoSelecionada = computed(() => {
    const id = this.idOrganizacaoSelecionada();
    return this.organizacoes().find((org) => org.idOrganizacao === id) ?? null;
  });

  readonly form = this.fb.group({
    idOrganizacao: [null as number | null, [Validators.required, Validators.min(1)]],
    nuCpf: ['', [Validators.required, Validators.minLength(11)]],
    nmUsuario: ['', [Validators.required, Validators.minLength(2)]],
    nmEmail: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]],
    role: ['USER' as RoleOrganizacao, [Validators.required]],
  });

  ngOnInit(): void {
    this.carregarOrganizacoes();
  }

  carregarOrganizacoes(): void {
    this.carregandoOrganizacoes.set(true);
    this.erroOrganizacoes.set(null);

    this.adminService.listarOrganizacoes().subscribe({
      next: (res) => {
        this.organizacoes.set(res);
        this.carregandoOrganizacoes.set(false);

        const idAtual = this.form.controls.idOrganizacao.value;
        if (idAtual) {
          this.selecionarOrganizacao(Number(idAtual));
        }
      },
      error: (err: HttpErrorResponse) => {
        this.erroOrganizacoes.set(this.mensagemErro(err, 'Erro ao listar organizacoes.'));
        this.carregandoOrganizacoes.set(false);
      },
    });
  }

  selecionarOrganizacao(idOrganizacao: number | string | null): void {
    const id = Number(idOrganizacao);
    if (!id) {
      this.idOrganizacaoSelecionada.set(null);
      this.usuarios.set([]);
      return;
    }

    this.form.patchValue({ idOrganizacao: id });
    this.idOrganizacaoSelecionada.set(id);
    this.carregarUsuarios(id);
  }

  carregarUsuarios(idOrganizacao = this.idOrganizacaoSelecionada()): void {
    if (!idOrganizacao) return;

    this.carregandoUsuarios.set(true);
    this.erroUsuarios.set(null);

    this.adminService.listarUsuariosOrganizacao(idOrganizacao).subscribe({
      next: (res) => {
        this.usuarios.set(res);
        this.carregandoUsuarios.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erroUsuarios.set(this.mensagemErro(err, 'Erro ao listar usuarios.'));
        this.carregandoUsuarios.set(false);
      },
    });
  }

  criarUsuario(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.carregando.set(true);
    this.erro.set(null);
    this.sucesso.set(null);

    const dados = this.form.getRawValue();
    this.adminService
      .criarUsuarioOrganizacao(dados.idOrganizacao!, {
        nuCpf: dados.nuCpf!,
        nmUsuario: dados.nmUsuario!,
        nmEmail: dados.nmEmail!,
        senha: dados.senha!,
        role: dados.role!,
      })
      .subscribe({
        next: (res) => {
          const idOrganizacao = dados.idOrganizacao;
          this.sucesso.set(res);
          this.usuarios.update((usuarios) => [res, ...usuarios]);
          this.form.reset({ idOrganizacao, role: 'USER' });
          this.idOrganizacaoSelecionada.set(idOrganizacao);
          this.carregando.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.erro.set(this.mensagemErro(err));
          this.carregando.set(false);
        },
      });
  }

  private mensagemErro(err: HttpErrorResponse, fallback = 'Erro ao cadastrar usuario.'): string {
    if (err.status === 409) {
      return 'CPF ou e-mail ja cadastrado.';
    }

    if (err.status === 401 || err.status === 403) {
      return 'Acesso negado. Entre novamente com um usuario SUPER_ADMIN.';
    }

    return err.error?.mensagem ?? err.error?.erro ?? fallback;
  }
}
