import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { CheckCircle2, LoaderCircle, LucideAngularModule, Trash2, UserPlus } from 'lucide-angular';
import { AdminService } from '../../../core/http/admin.service';
import { CommandDialogService } from '../../../core/services/command-dialog.service';
import { SidePanelComponent } from '../../../shared/components/side-panel/side-panel.component';
import { FormInputComponent } from '../../../shared/components/forms/text-input/app-text-input';
import { FormSelectComponent } from '../../../shared/components/forms/select-input/form-select.component';
import { formatCpf, maskCpfInput, normalizeCpf } from '../../../shared/helper/cpf.utils';
import { useSidePanel } from '../../../shared/helper/side-panel.state';
import { getZodFieldErrors } from '../../../shared/helper/zod-form.helper';
import {
  OrganizacaoAdminResponse,
  RoleOrganizacao,
  UsuarioOrganizacaoResponse,
} from '../../../shared/types/dtos';
import {
  usuarioOrganizacaoFormSchema,
  UsuarioOrganizacaoFormData,
  UsuarioOrganizacaoFormErrors,
} from '../schemas/usuario-organizacao-form.schema';

@Component({
  selector: 'app-usuarios-organizacao',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    SidePanelComponent,
    FormInputComponent,
    FormSelectComponent,
  ],
  templateUrl: './usuarios-organizacao.component.html',
})
export class UsuariosOrganizacaoComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);
  private readonly commandDialog = inject(CommandDialogService);

  protected readonly userPlusIcon = UserPlus;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly successIcon = CheckCircle2;
  protected readonly trashIcon = Trash2;

  readonly roles: RoleOrganizacao[] = ['ADMIN', 'USER'];
  readonly usuarioPanel = useSidePanel<void>();
  readonly carregando = signal(false);
  readonly carregandoOrganizacoes = signal(false);
  readonly carregandoUsuarios = signal(false);
  readonly excluindoUsuarioId = signal<number | null>(null);
  readonly alterandoRoleUsuarioId = signal<number | null>(null);
  readonly erro = signal<string | null>(null);
  readonly erroOrganizacoes = signal<string | null>(null);
  readonly erroUsuarios = signal<string | null>(null);
  readonly sucesso = signal<UsuarioOrganizacaoResponse | null>(null);
  readonly errosFormulario = signal<UsuarioOrganizacaoFormErrors>({});
  readonly organizacoes = signal<OrganizacaoAdminResponse[]>([]);
  readonly usuarios = signal<UsuarioOrganizacaoResponse[]>([]);
  readonly idOrganizacaoSelecionada = signal<number | null>(null);

  readonly organizacaoSelecionada = computed(() => {
    const id = this.idOrganizacaoSelecionada();
    return this.organizacoes().find((org) => org.idOrganizacao === id) ?? null;
  });

  readonly roleOptions = computed(() =>
    this.roles.map((role) => ({ label: role, value: role }))
  );

  readonly form = this.fb.nonNullable.group({
    idOrganizacao: 0,
    nuCpf: '',
    nmUsuario: '',
    nmEmail: '',
    senha: '',
    role: 'USER' as RoleOrganizacao,
  });

  readonly formatarCpf = formatCpf;

  ngOnInit(): void {
    this.carregarOrganizacoes();
  }

  getControl(name: keyof UsuarioOrganizacaoFormData): FormControl {
    return this.form.get(name) as FormControl;
  }

  campoErro(campo: keyof UsuarioOrganizacaoFormData): string | null {
    return this.errosFormulario()[campo] ?? null;
  }

  abrirNovoUsuario(): void {
    const id = this.idOrganizacaoSelecionada();
    if (!id) return;

    this.form.reset({
      idOrganizacao: id,
      nuCpf: '',
      nmUsuario: '',
      nmEmail: '',
      senha: '',
      role: 'USER',
    });
    this.erro.set(null);
    this.sucesso.set(null);
    this.errosFormulario.set({});
    this.usuarioPanel.abrir();
  }

  fecharPainel(): void {
    this.usuarioPanel.fechar();
    this.errosFormulario.set({});
  }

  atualizarCpf(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valorFormatado = maskCpfInput(input.value);

    this.form.controls.nuCpf.setValue(valorFormatado, { emitEvent: false });
    input.value = valorFormatado;
    this.errosFormulario.update((erros) => ({ ...erros, nuCpf: undefined }));
  }

  carregarOrganizacoes(): void {
    this.carregandoOrganizacoes.set(true);
    this.erroOrganizacoes.set(null);

    this.adminService.listarOrganizacoes().subscribe({
      next: (res) => {
        this.organizacoes.set(res);
        this.carregandoOrganizacoes.set(false);

        const idAtual = this.idOrganizacaoSelecionada();
        if (idAtual) {
          this.selecionarOrganizacao(idAtual);
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
    this.form.markAllAsTouched();

    const resultado = usuarioOrganizacaoFormSchema.safeParse(this.form.getRawValue());

    if (!resultado.success) {
      this.errosFormulario.set(getZodFieldErrors(resultado.error));
      return;
    }

    this.errosFormulario.set({});
    const dados = resultado.data;

    this.carregando.set(true);
    this.erro.set(null);
    this.sucesso.set(null);

    this.adminService
      .criarUsuarioOrganizacao(dados.idOrganizacao, {
        nuCpf: normalizeCpf(dados.nuCpf),
        nmUsuario: dados.nmUsuario,
        nmEmail: dados.nmEmail,
        senha: dados.senha?.trim() || null,
        role: dados.role,
      })
      .subscribe({
        next: (res) => {
          this.sucesso.set(res);
          this.usuarios.update((usuarios) => [res, ...usuarios]);
          this.carregando.set(false);
          this.usuarioPanel.fechar();
        },
        error: (err: HttpErrorResponse) => {
          this.erro.set(this.mensagemErro(err));
          this.carregando.set(false);
        },
      });
  }

  excluirUsuario(usuario: UsuarioOrganizacaoResponse): void {
    this.inativarUsuario(usuario);
  }

  async inativarUsuario(usuario: UsuarioOrganizacaoResponse): Promise<void> {
    const idOrganizacao = this.idOrganizacaoSelecionada();
    if (!idOrganizacao || !usuario.flAtivo || this.excluindoUsuarioId()) return;

    const confirmado = await this.commandDialog.confirm({
      title: 'Inativar usuario',
      message: `Inativar o usuario ${usuario.nmUsuario} da organizacao ${usuario.nmOrganizacao}?`,
      confirmLabel: 'Inativar',
      variant: 'danger',
    });

    if (!confirmado) return;

    this.excluindoUsuarioId.set(usuario.idUsuario);
    this.erro.set(null);

    this.adminService.inativarUsuarioOrganizacao(idOrganizacao, usuario.idUsuario).subscribe({
      next: () => {
        this.usuarios.update((lista) =>
          lista.map((item) =>
            item.idUsuario === usuario.idUsuario ? { ...item, flAtivo: false } : item
          )
        );
        this.excluindoUsuarioId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(this.mensagemErro(err, 'Erro ao inativar usuario.'));
        this.excluindoUsuarioId.set(null);
      },
    });
  }

  alterarRole(usuario: UsuarioOrganizacaoResponse, role: RoleOrganizacao): void {
    const idOrganizacao = this.idOrganizacaoSelecionada();
    if (!idOrganizacao || !usuario.flAtivo || usuario.role === role) return;
    if (this.alterandoRoleUsuarioId() === usuario.idUsuario) return;

    this.alterandoRoleUsuarioId.set(usuario.idUsuario);
    this.erro.set(null);

    this.adminService
      .atualizarUsuarioOrganizacao(idOrganizacao, usuario.idUsuario, {
        nuCpf: usuario.nuCpf,
        nmUsuario: usuario.nmUsuario,
        nmEmail: usuario.nmEmail,
        senha: null,
        role,
      })
      .subscribe({
        next: (res) => {
          this.usuarios.update((lista) =>
            lista.map((item) => (item.idUsuario === usuario.idUsuario ? res : item))
          );
          this.alterandoRoleUsuarioId.set(null);
        },
        error: (err: HttpErrorResponse) => {
          this.erro.set(this.mensagemErro(err, 'Erro ao alterar perfil do usuario.'));
          this.alterandoRoleUsuarioId.set(null);
        },
      });
  }

  ativarUsuario(usuario: UsuarioOrganizacaoResponse): void {
    const idOrganizacao = this.idOrganizacaoSelecionada();
    if (!idOrganizacao || usuario.flAtivo || this.excluindoUsuarioId()) return;

    this.excluindoUsuarioId.set(usuario.idUsuario);
    this.erro.set(null);

    this.adminService.ativarUsuarioOrganizacao(idOrganizacao, usuario.idUsuario).subscribe({
      next: (res) => {
        this.usuarios.update((lista) =>
          lista.map((item) => (item.idUsuario === usuario.idUsuario ? res : item))
        );
        this.excluindoUsuarioId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(this.mensagemErro(err, 'Erro ao ativar usuario.'));
        this.excluindoUsuarioId.set(null);
      },
    });
  }

  async excluirUsuarioPermanentemente(usuario: UsuarioOrganizacaoResponse): Promise<void> {
    const idOrganizacao = this.idOrganizacaoSelecionada();
    if (!idOrganizacao || this.excluindoUsuarioId()) return;

    const confirmado = await this.commandDialog.confirm({
      title: 'Remover permanentemente',
      message:
        `ATENCAO: remover permanentemente ${usuario.nmUsuario} do banco?\n\n`
        + 'O vinculo com a organizacao sera apagado. Se o usuario nao pertencer a outra organizacao, '
        + 'a conta tambem sera removida. Esta acao nao pode ser desfeita.',
      confirmLabel: 'Remover permanentemente',
      variant: 'danger',
    });

    if (!confirmado) return;

    this.excluindoUsuarioId.set(usuario.idUsuario);
    this.erro.set(null);

    this.adminService.excluirUsuarioPermanentemente(idOrganizacao, usuario.idUsuario).subscribe({
      next: () => {
        this.usuarios.update((lista) =>
          lista.filter((item) => item.idUsuario !== usuario.idUsuario)
        );
        this.excluindoUsuarioId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(this.mensagemErro(err, 'Erro ao remover usuario permanentemente.'));
        this.excluindoUsuarioId.set(null);
      },
    });
  }

  private mensagemErro(err: HttpErrorResponse, fallback = 'Erro ao cadastrar usuario.'): string {
    if (err.status === 409) {
      return err.error?.mensagem ?? err.error?.erro ?? 'Operacao nao permitida.';
    }

    if (err.status === 401 || err.status === 403) {
      return 'Acesso negado. Entre novamente com um usuario SUPER_ADMIN.';
    }

    return err.error?.mensagem ?? err.error?.erro ?? fallback;
  }
}
