import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import {
  Building2,
  CheckCircle2,
  LoaderCircle,
  LucideAngularModule,
  Trash2,
  UserPlus,
} from 'lucide-angular';
import { AdminService } from '../../../core/http/admin.service';
import { SidePanelComponent } from '../../../shared/components/side-panel/side-panel.component';
import { FormInputComponent } from '../../../shared/components/forms/text-input/app-text-input';
import { FormSelectComponent } from '../../../shared/components/forms/select-input/form-select.component';
import { formatCnpj, maskCnpjInput, normalizeCnpj } from '../../../shared/helper/cnpj.utils';
import { formatCpf, maskCpfInput, normalizeCpf } from '../../../shared/helper/cpf.utils';
import { useSidePanel } from '../../../shared/helper/side-panel.state';
import { getZodFieldErrors } from '../../../shared/helper/zod-form.helper';
import {
  OrganizacaoAdminResponse,
  RoleOrganizacao,
  UsuarioOrganizacaoResponse,
} from '../../../shared/types/dtos';
import {
  organizacaoFormSchema,
  OrganizacaoFormData,
  OrganizacaoFormErrors,
} from '../schemas/organizacao-form.schema';
import {
  usuarioOrganizacaoFormSchema,
  UsuarioOrganizacaoFormData,
  UsuarioOrganizacaoFormErrors,
} from '../schemas/usuario-organizacao-form.schema';

@Component({
  selector: 'app-nova-organizacao',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    SidePanelComponent,
    FormInputComponent,
    FormSelectComponent,
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
  protected readonly trashIcon = Trash2;

  readonly roles: RoleOrganizacao[] = ['ADMIN', 'USER'];
  readonly roleOptions = this.roles.map((role) => ({ label: role, value: role }));

  readonly orgPanel = useSidePanel<OrganizacaoAdminResponse>();
  readonly usuarioPanel = useSidePanel<OrganizacaoAdminResponse>();

  readonly criandoOrganizacao = signal(false);
  readonly criandoUsuario = signal(false);
  readonly excluindoOrganizacaoId = signal<number | null>(null);
  readonly processandoUsuarioId = signal<number | null>(null);
  readonly erroOrganizacao = signal<string | null>(null);
  readonly erroUsuario = signal<string | null>(null);
  readonly erroListagem = signal<string | null>(null);
  readonly errosOrgFormulario = signal<OrganizacaoFormErrors>({});
  readonly errosUsuarioFormulario = signal<UsuarioOrganizacaoFormErrors>({});
  readonly organizacaoSalva = signal<OrganizacaoAdminResponse | null>(null);
  readonly usuarioCriado = signal<UsuarioOrganizacaoResponse | null>(null);
  readonly organizacoes = signal<OrganizacaoAdminResponse[]>([]);

  readonly formatarCpf = formatCpf;
  readonly formatarCnpj = formatCnpj;

  readonly formOrganizacao = this.fb.nonNullable.group({
    nmOrganizacao: '',
    dsDocumento: '',
  });

  readonly formUsuario = this.fb.nonNullable.group({
    idOrganizacao: 0,
    nuCpf: '',
    nmUsuario: '',
    nmEmail: '',
    senha: '',
    role: 'ADMIN' as RoleOrganizacao,
  });

  ngOnInit(): void {
    this.carregarOrganizacoes();
  }

  getOrgControl(name: keyof OrganizacaoFormData): FormControl {
    return this.formOrganizacao.get(name) as FormControl;
  }

  getUsuarioControl(name: keyof UsuarioOrganizacaoFormData): FormControl {
    return this.formUsuario.get(name) as FormControl;
  }

  campoErroOrg(campo: keyof OrganizacaoFormData): string | null {
    return this.errosOrgFormulario()[campo] ?? null;
  }

  campoErroUsuario(campo: keyof UsuarioOrganizacaoFormData): string | null {
    return this.errosUsuarioFormulario()[campo] ?? null;
  }

  abrirNovaOrganizacao(): void {
    this.formOrganizacao.reset({ nmOrganizacao: '', dsDocumento: '' });
    this.erroOrganizacao.set(null);
    this.errosOrgFormulario.set({});
    this.orgPanel.abrir();
  }

  editarOrganizacao(org: OrganizacaoAdminResponse): void {
    this.erroOrganizacao.set(null);
    this.errosOrgFormulario.set({});
    this.formOrganizacao.patchValue({
      nmOrganizacao: org.nmOrganizacao,
      dsDocumento: maskCnpjInput(org.dsDocumento),
    });
    this.orgPanel.abrir(org);
  }

  fecharPainelOrg(): void {
    this.orgPanel.fechar();
    this.errosOrgFormulario.set({});
  }

  abrirNovoUsuario(org: OrganizacaoAdminResponse): void {
    this.formUsuario.reset({
      idOrganizacao: org.idOrganizacao,
      nuCpf: '',
      nmUsuario: '',
      nmEmail: '',
      senha: '',
      role: 'ADMIN',
    });
    this.erroUsuario.set(null);
    this.errosUsuarioFormulario.set({});
    this.usuarioPanel.abrir(org);
  }

  fecharPainelUsuario(): void {
    this.usuarioPanel.fechar();
    this.errosUsuarioFormulario.set({});
  }

  atualizarDocumento(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valorFormatado = maskCnpjInput(input.value);

    this.formOrganizacao.controls.dsDocumento.setValue(valorFormatado, { emitEvent: false });
    input.value = valorFormatado;
    this.errosOrgFormulario.update((erros) => ({ ...erros, dsDocumento: undefined }));
  }

  atualizarCpfUsuario(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valorFormatado = maskCpfInput(input.value);

    this.formUsuario.controls.nuCpf.setValue(valorFormatado, { emitEvent: false });
    input.value = valorFormatado;
    this.errosUsuarioFormulario.update((erros) => ({ ...erros, nuCpf: undefined }));
  }

  salvarOrganizacao(): void {
    this.formOrganizacao.markAllAsTouched();

    const resultado = organizacaoFormSchema.safeParse(this.formOrganizacao.getRawValue());

    if (!resultado.success) {
      this.errosOrgFormulario.set(getZodFieldErrors(resultado.error));
      return;
    }

    this.errosOrgFormulario.set({});
    const organizacaoEmEdicao = this.orgPanel.item();
    const dados = resultado.data;

    this.criandoOrganizacao.set(true);
    this.erroOrganizacao.set(null);
    this.usuarioCriado.set(null);

    const payload = {
      nmOrganizacao: dados.nmOrganizacao,
      dsDocumento: normalizeCnpj(dados.dsDocumento),
    };

    const request = organizacaoEmEdicao
      ? this.adminService.atualizarOrganizacao(organizacaoEmEdicao.idOrganizacao, payload)
      : this.adminService.criarOrganizacao(payload);

    request.subscribe({
      next: (res) => {
        this.organizacaoSalva.set(res);
        this.organizacoes.update((organizacoes) => {
          const existe = organizacoes.some((org) => org.idOrganizacao === res.idOrganizacao);
          return existe
            ? organizacoes.map((org) => (org.idOrganizacao === res.idOrganizacao ? res : org))
            : [res, ...organizacoes];
        });
        this.criandoOrganizacao.set(false);
        this.orgPanel.fechar();
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

  carregarOrganizacoes(): void {
    this.erroListagem.set(null);
    this.adminService.listarOrganizacoes().subscribe({
      next: (res) => this.organizacoes.set(res),
      error: (err: HttpErrorResponse) => {
        this.erroListagem.set(this.mensagemErro(err, 'Erro ao listar organizacoes.'));
      },
    });
  }

  excluirOrganizacao(org: OrganizacaoAdminResponse): void {
    this.inativarOrganizacao(org);
  }

  inativarOrganizacao(org: OrganizacaoAdminResponse): void {
    if (!org.flAtivo || this.excluindoOrganizacaoId()) return;

    const confirmado = confirm(
      `Inativar a organizacao ${org.nmOrganizacao}? Os usuarios vinculados tambem serao inativados.`
    );
    if (!confirmado) return;

    this.executarAcaoOrganizacao(org.idOrganizacao, () =>
      this.adminService.inativarOrganizacao(org.idOrganizacao)
    );
  }

  ativarOrganizacao(org: OrganizacaoAdminResponse): void {
    if (org.flAtivo || this.excluindoOrganizacaoId()) return;

    this.executarAcaoOrganizacao(org.idOrganizacao, () =>
      this.adminService.ativarOrganizacao(org.idOrganizacao)
    );
  }

  excluirOrganizacaoPermanentemente(org: OrganizacaoAdminResponse): void {
    if (this.excluindoOrganizacaoId()) return;

    const confirmado = confirm(
      `ATENCAO: remover permanentemente ${org.nmOrganizacao} do banco?\n\n` +
        'Todos os contatos, notificacoes, templates e configuracoes desta organizacao serao apagados. ' +
        'Esta acao nao pode ser desfeita.'
    );
    if (!confirmado) return;

    this.excluindoOrganizacaoId.set(org.idOrganizacao);
    this.erroListagem.set(null);

    this.adminService.excluirOrganizacaoPermanentemente(org.idOrganizacao).subscribe({
      next: () => {
        this.organizacoes.update((lista) =>
          lista.filter((item) => item.idOrganizacao !== org.idOrganizacao)
        );
        this.excluindoOrganizacaoId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.erroListagem.set(this.mensagemErro(err, 'Erro ao remover organizacao permanentemente.'));
        this.excluindoOrganizacaoId.set(null);
      },
    });
  }

  private executarAcaoOrganizacao(
    idOrganizacao: number,
    acao: () => Observable<OrganizacaoAdminResponse>
  ): void {
    this.excluindoOrganizacaoId.set(idOrganizacao);
    this.erroListagem.set(null);

    acao().subscribe({
      next: (res) => {
        this.organizacoes.update((lista) =>
          lista.map((item) => (item.idOrganizacao === idOrganizacao ? res : item))
        );
        this.excluindoOrganizacaoId.set(null);
        this.organizacaoSalva.set(res);
      },
      error: (err: HttpErrorResponse) => {
        this.erroListagem.set(this.mensagemErro(err, 'Erro ao atualizar organizacao.'));
        this.excluindoOrganizacaoId.set(null);
      },
    });
  }

  criarUsuario(): void {
    this.formUsuario.markAllAsTouched();

    const resultado = usuarioOrganizacaoFormSchema.safeParse(this.formUsuario.getRawValue());

    if (!resultado.success) {
      this.errosUsuarioFormulario.set(getZodFieldErrors(resultado.error));
      return;
    }

    this.errosUsuarioFormulario.set({});
    const dados = resultado.data;

    this.criandoUsuario.set(true);
    this.erroUsuario.set(null);
    this.usuarioCriado.set(null);

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
          this.usuarioCriado.set(res);
          this.criandoUsuario.set(false);
          this.usuarioPanel.fechar();
        },
        error: (err: HttpErrorResponse) => {
          this.erroUsuario.set(this.mensagemErro(err, 'Erro ao cadastrar usuario.'));
          this.criandoUsuario.set(false);
        },
      });
  }

  private mensagemErro(err: HttpErrorResponse, fallback: string): string {
    if (err.status === 409) {
      return err.error?.mensagem ?? err.error?.erro ?? 'Operacao nao permitida.';
    }

    if (err.status === 401 || err.status === 403) {
      return 'Acesso negado. Entre novamente com um usuario SUPER_ADMIN.';
    }

    return err.error?.mensagem ?? err.error?.erro ?? fallback;
  }
}
