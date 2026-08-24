import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import {
  Building2,
  CheckCircle2,
  LoaderCircle,
  LucideAngularModule,
  RefreshCw,
  Trash2,
  UserPlus,
} from 'lucide-angular';
import { AdminService } from '../../../core/http/admin.service';
import { CommandDialogService } from '../../../core/services/command-dialog.service';
import { AdminNotificacaoService } from '../../../core/services/admin-notificacao.service';
import { SidePanelComponent } from '../../../shared/components/side-panel/side-panel.component';
import { FormInputComponent } from '../../../shared/components/forms/text-input/app-text-input';
import { FormSelectComponent } from '../../../shared/components/forms/select-input/form-select.component';
import { formatCnpj, maskCnpjInput, normalizeCnpj } from '../../../shared/helper/cnpj.utils';
import { formatCpf, maskCpfInput, normalizeCpf } from '../../../shared/helper/cpf.utils';
import { formatDestinatario } from '../../../shared/helper/phone.utils';
import { useSidePanel } from '../../../shared/helper/side-panel.state';
import { getZodFieldErrors } from '../../../shared/helper/zod-form.helper';
import {
  GatewaySessaoResumo,
  AdminOrganizacaoOperacionalResumo,
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
    FormsModule,
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
  private readonly adminNotificacaoService = inject(AdminNotificacaoService);
  private readonly commandDialog = inject(CommandDialogService);

  protected readonly buildingIcon = Building2;
  protected readonly userPlusIcon = UserPlus;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly successIcon = CheckCircle2;
  protected readonly trashIcon = Trash2;
  protected readonly gatewayIcon = RefreshCw;

  readonly roles: RoleOrganizacao[] = ['ADMIN', 'USER'];
  readonly roleOptions = this.roles.map((role) => ({ label: role, value: role }));

  readonly orgPanel = useSidePanel<OrganizacaoAdminResponse>();
  readonly usuarioPanel = useSidePanel<OrganizacaoAdminResponse>();
  readonly gatewayPanel = useSidePanel<OrganizacaoAdminResponse>();

  readonly criandoOrganizacao = signal(false);
  readonly criandoUsuario = signal(false);
  readonly excluindoOrganizacaoId = signal<number | null>(null);
  readonly sincronizandoGatewayId = signal<number | null>(null);
  readonly cancelandoPausaId = signal<number | null>(null);
  readonly resumoOperacionalPorOrg = signal<Record<number, AdminOrganizacaoOperacionalResumo>>({});
  readonly carregandoSessoesGateway = signal(false);
  readonly mensagemGateway = signal<string | null>(null);
  readonly erroGatewayPanel = signal<string | null>(null);
  readonly sessoesGateway = signal<GatewaySessaoResumo[]>([]);
  idSessaoMigracao: number | null = null;
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
    this.carregarResumoOperacional();
  }

  carregarResumoOperacional(): void {
    this.adminNotificacaoService.resumoOperacional().subscribe({
      next: (resumo) => {
        const mapa: Record<number, AdminOrganizacaoOperacionalResumo> = {};
        for (const org of resumo.organizacoes ?? []) {
          mapa[org.idOrganizacao] = org;
        }
        this.resumoOperacionalPorOrg.set(mapa);
      },
    });
  }

  podeCancelarPausa(org: OrganizacaoAdminResponse): boolean {
    return this.resumoOperacionalPorOrg()[org.idOrganizacao]?.podeCancelarPausa ?? false;
  }

  async cancelarPausaOrganizacao(org: OrganizacaoAdminResponse): Promise<void> {
    if (!this.podeCancelarPausa(org) || this.cancelandoPausaId()) return;

    const confirmado = await this.commandDialog.confirm({
      title: 'Cancelar pausa',
      message:
        `Cancelar a pausa da organizacao ${org.nmOrganizacao} (#${org.idOrganizacao})?\n\n`
        + 'Os envios WhatsApp desta org poderao retomar imediatamente.',
      confirmLabel: 'Cancelar pausa',
    });

    if (!confirmado) {
      return;
    }

    this.cancelandoPausaId.set(org.idOrganizacao);
    this.erroListagem.set(null);
    this.mensagemGateway.set(null);

    this.adminNotificacaoService.reativarWhatsappOrganizacao(org.idOrganizacao).subscribe({
      next: () => {
        this.cancelandoPausaId.set(null);
        this.mensagemGateway.set(`Pausa cancelada para org #${org.idOrganizacao} (${org.nmOrganizacao}).`);
        this.carregarResumoOperacional();
      },
      error: (err: HttpErrorResponse) => {
        this.erroListagem.set(this.mensagemErro(err, 'Erro ao cancelar pausa da organizacao.'));
        this.cancelandoPausaId.set(null);
      },
    });
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

  async inativarOrganizacao(org: OrganizacaoAdminResponse): Promise<void> {
    if (!org.flAtivo || this.excluindoOrganizacaoId()) return;

    const confirmado = await this.commandDialog.confirm({
      title: 'Inativar organizacao',
      message:
        `Inativar a organizacao ${org.nmOrganizacao}? Os usuarios vinculados tambem serao inativados.`,
      confirmLabel: 'Inativar',
      variant: 'danger',
    });

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

  atualizarOrgNoGateway(org: OrganizacaoAdminResponse): void {
    this.idSessaoMigracao = null;
    this.erroGatewayPanel.set(null);
    this.gatewayPanel.abrir(org);
    this.carregarSessoesGateway();
  }

  fecharPainelGateway(): void {
    this.gatewayPanel.fechar();
    this.erroGatewayPanel.set(null);
    this.idSessaoMigracao = null;
  }

  carregarSessoesGateway(): void {
    this.carregandoSessoesGateway.set(true);
    this.erroGatewayPanel.set(null);

    this.adminService.listarSessoesGateway().subscribe({
      next: (resposta) => {
        this.carregandoSessoesGateway.set(false);
        if (!resposta.sucesso) {
          this.erroGatewayPanel.set(resposta.erro ?? 'Nao foi possivel listar sessoes do gateway.');
          this.sessoesGateway.set([]);
          return;
        }
        this.sessoesGateway.set(resposta.sessoes ?? []);
      },
      error: (err: HttpErrorResponse) => {
        this.carregandoSessoesGateway.set(false);
        this.erroGatewayPanel.set(this.mensagemErro(err, 'Erro ao listar sessoes do gateway.'));
      },
    });
  }

  sessaoDaOrganizacao(org: OrganizacaoAdminResponse | null | undefined): GatewaySessaoResumo | null {
    if (!org) return null;
    return this.sessoesGateway().find((sessao) => sessao.idOrganizacao === org.idOrganizacao) ?? null;
  }

  sessoesMigracaoDisponiveis(org: OrganizacaoAdminResponse | null | undefined): GatewaySessaoResumo[] {
    if (!org) return [];
    return this.sessoesGateway().filter(
      (sessao) =>
        sessao.idOrganizacao !== org.idOrganizacao &&
        (sessao.temCredenciais || sessao.conectado || sessao.emMemoria)
    );
  }

  formatarTelefoneGateway(telefone: string | null | undefined): string {
    if (!telefone) return '—';
    return formatDestinatario('WHATSAPP', telefone);
  }

  rotuloSessaoMigracao(sessao: GatewaySessaoResumo): string {
    const telefone = sessao.telefone
      ? ` · ${this.formatarTelefoneGateway(sessao.telefone)}`
      : '';
    return `org-${sessao.idOrganizacao}${telefone} · ${sessao.status}`;
  }

  sincronizarGatewayAtual(): void {
    const org = this.gatewayPanel.item();
    if (!org) return;
    this.executarGateway(org.idOrganizacao, null);
  }

  async migrarSessaoGateway(): Promise<void> {
    const org = this.gatewayPanel.item();
    if (!org || !this.idSessaoMigracao) return;

    const confirmado = await this.commandDialog.confirm({
      title: 'Migrar sessao',
      message:
        `Migrar a sessao org-${this.idSessaoMigracao} para a organizacao #${org.idOrganizacao} (${org.nmOrganizacao})?`,
      confirmLabel: 'Migrar',
    });

    if (!confirmado) {
      return;
    }

    this.executarGateway(org.idOrganizacao, this.idSessaoMigracao);
  }

  private executarGateway(idOrganizacao: number, idOrganizacaoAnterior: number | null): void {
    if (this.sincronizandoGatewayId()) return;

    this.sincronizandoGatewayId.set(idOrganizacao);
    this.erroGatewayPanel.set(null);
    this.erroListagem.set(null);
    this.mensagemGateway.set(null);

    this.adminService.atualizarOrganizacaoGateway(idOrganizacao, idOrganizacaoAnterior).subscribe({
      next: (status) => {
        this.sincronizandoGatewayId.set(null);
        const conectado = status.conectado ? 'conectado' : 'desconectado';
        const telefone = status.telefone ? ` · ${this.formatarTelefoneGateway(status.telefone)}` : '';
        this.mensagemGateway.set(
          `Gateway atualizado para org #${idOrganizacao}: ${status.status} (${conectado})${telefone}.`
        );
        this.carregarSessoesGateway();
        this.idSessaoMigracao = null;
      },
      error: (err: HttpErrorResponse) => {
        this.erroGatewayPanel.set(
          this.mensagemErro(err, 'Erro ao atualizar organizacao no gateway.')
        );
        this.sincronizandoGatewayId.set(null);
      },
    });
  }

  async excluirOrganizacaoPermanentemente(org: OrganizacaoAdminResponse): Promise<void> {
    if (this.excluindoOrganizacaoId()) return;

    const confirmado = await this.commandDialog.confirm({
      title: 'Remover permanentemente',
      message:
        `ATENCAO: remover permanentemente ${org.nmOrganizacao} do banco?\n\n`
        + 'Todos os contatos, notificacoes, templates e configuracoes desta organizacao serao apagados. '
        + 'Esta acao nao pode ser desfeita.',
      confirmLabel: 'Remover permanentemente',
      variant: 'danger',
    });

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
