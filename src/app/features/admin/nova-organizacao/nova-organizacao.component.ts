import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Building2,
  CheckCircle2,
  LoaderCircle,
  LucideAngularModule,
  UserPlus,
} from 'lucide-angular';
import { AdminService } from '../../../core/http/admin.service';
import { formatCnpj, maskCnpjInput, normalizeCnpj } from '../../../shared/helper/cnpj.utils';
import { formatCpf, maskCpfInput, normalizeCpf } from '../../../shared/helper/cpf.utils';
import {
  OrganizacaoAdminResponse,
  RoleOrganizacao,
  UsuarioOrganizacaoResponse,
} from '../../../shared/types/dtos';

@Component({
  selector: 'app-nova-organizacao',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
  ],
  templateUrl: './nova-organizacao.component.html',
})
export class NovaOrganizacaoComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);

  protected readonly buildingIcon = Building2;
  protected readonly userPlusIcon = UserPlus;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly successIcon = CheckCircle2;

  readonly roles: RoleOrganizacao[] = ['ADMIN', 'USER'];

  readonly formatarCpf = formatCpf;
  readonly formatarCnpj = formatCnpj;

  atualizarDocumento(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valorFormatado = maskCnpjInput(input.value);

    this.formOrganizacao.controls.dsDocumento.setValue(valorFormatado, { emitEvent: false });
    input.value = valorFormatado;
  }

  atualizarCpfUsuario(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valorFormatado = maskCpfInput(input.value);

    this.formUsuario.controls.nuCpf.setValue(valorFormatado, { emitEvent: false });
    input.value = valorFormatado;
  }
  readonly criandoOrganizacao = signal(false);
  readonly criandoUsuario = signal(false);
  readonly erroOrganizacao = signal<string | null>(null);
  readonly erroUsuario = signal<string | null>(null);
  readonly erroListagem = signal<string | null>(null);
  readonly organizacaoCriada = signal<OrganizacaoAdminResponse | null>(null);
  readonly usuarioCriado = signal<UsuarioOrganizacaoResponse | null>(null);
  readonly organizacoes = signal<OrganizacaoAdminResponse[]>([]);
  readonly organizacaoEmEdicao = signal<OrganizacaoAdminResponse | null>(null);

  readonly formOrganizacao = this.fb.group({
    nmOrganizacao: ['', [Validators.required, Validators.minLength(2)]],
    dsDocumento: ['', [Validators.required, Validators.minLength(11)]],
  });

  readonly formUsuario = this.fb.group({
    nuCpf: ['', [Validators.required, Validators.minLength(11)]],
    nmUsuario: ['', [Validators.required, Validators.minLength(2)]],
    nmEmail: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]],
    role: ['ADMIN' as RoleOrganizacao, [Validators.required]],
  });

  ngOnInit(): void {
    this.carregarOrganizacoes();
  }

  salvarOrganizacao(): void {
    if (this.formOrganizacao.invalid) {
      this.formOrganizacao.markAllAsTouched();
      return;
    }

    const organizacaoEmEdicao = this.organizacaoEmEdicao();
    this.criandoOrganizacao.set(true);
    this.erroOrganizacao.set(null);
    this.usuarioCriado.set(null);

    const dados = this.formOrganizacao.getRawValue();
    const payload = {
      nmOrganizacao: dados.nmOrganizacao!,
      dsDocumento: normalizeCnpj(dados.dsDocumento!),
    };

    const request = organizacaoEmEdicao
      ? this.adminService.atualizarOrganizacao(organizacaoEmEdicao.idOrganizacao, payload)
      : this.adminService.criarOrganizacao(payload);

    request.subscribe({
      next: (res) => {
        this.organizacaoCriada.set(res);
        this.organizacoes.update((organizacoes) => {
          const existe = organizacoes.some((org) => org.idOrganizacao === res.idOrganizacao);
          return existe
            ? organizacoes.map((org) => org.idOrganizacao === res.idOrganizacao ? res : org)
            : [res, ...organizacoes];
        });
        this.organizacaoEmEdicao.set(null);
        this.formOrganizacao.reset();
        this.criandoOrganizacao.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erroOrganizacao.set(
          this.mensagemErro(
            err,
            organizacaoEmEdicao ? 'Erro ao atualizar organizacao.' : 'Erro ao cadastrar organizacao.'
          )
        );
        this.criandoOrganizacao.set(false);
      },
    });
  }

  editarOrganizacao(org: OrganizacaoAdminResponse): void {
    this.erroOrganizacao.set(null);
    this.organizacaoEmEdicao.set(org);
    this.formOrganizacao.patchValue({
      nmOrganizacao: org.nmOrganizacao,
      dsDocumento: maskCnpjInput(org.dsDocumento),
    });
  }

  cancelarEdicao(): void {
    this.organizacaoEmEdicao.set(null);
    this.erroOrganizacao.set(null);
    this.formOrganizacao.reset();
  }

  carregarOrganizacoes(): void {
    this.erroListagem.set(null);
    this.adminService.listarOrganizacoes().subscribe({
      next: (res) => this.organizacoes.set(res),
      error: (err: HttpErrorResponse) => {
        this.erroListagem.set(this.mensagemErro(err, 'Erro ao listar organizacoes.'));
      },
    });
  }

  criarUsuario(): void {
    const organizacao = this.organizacaoCriada();
    if (!organizacao) return;

    if (this.formUsuario.invalid) {
      this.formUsuario.markAllAsTouched();
      return;
    }

    this.criandoUsuario.set(true);
    this.erroUsuario.set(null);
    this.usuarioCriado.set(null);

    const dados = this.formUsuario.getRawValue();
    this.adminService
      .criarUsuarioOrganizacao(organizacao.idOrganizacao, {
        nuCpf: normalizeCpf(dados.nuCpf!),
        nmUsuario: dados.nmUsuario!,
        nmEmail: dados.nmEmail!,
        senha: dados.senha!,
        role: dados.role!,
      })
      .subscribe({
        next: (res) => {
          this.usuarioCriado.set(res);
          this.formUsuario.reset({ role: 'USER' });
          this.criandoUsuario.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.erroUsuario.set(this.mensagemErro(err, 'Erro ao cadastrar usuario.'));
          this.criandoUsuario.set(false);
        },
      });
  }

  private mensagemErro(err: HttpErrorResponse, fallback: string): string {
    if (err.status === 409) {
      return 'CPF ou e-mail ja cadastrado.';
    }

    if (err.status === 401 || err.status === 403) {
      return 'Acesso negado. Entre novamente com um usuario SUPER_ADMIN.';
    }

    return err.error?.mensagem ?? err.error?.erro ?? fallback;
  }
}
