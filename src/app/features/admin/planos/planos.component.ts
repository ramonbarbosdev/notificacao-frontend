import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Check, LoaderCircle, LucideAngularModule, PackagePlus } from 'lucide-angular';

import { HeaderComponent } from '../../../core/layout/header/header.component';
import { SidebarComponent } from '../../../core/layout/layout.components';
import { PlanoService } from '../../../core/services/plano.service';
import { SidePanelComponent } from '../../../shared/components/side-panel/side-panel.component';
import { useSidePanel } from '../../../shared/helper/side-panel.state';
import { Plano } from '../../../shared/types/dtos';

@Component({
  selector: 'app-planos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, SidebarComponent, HeaderComponent, SidePanelComponent],
  templateUrl: './planos.component.html',
})
export class PlanosComponent implements OnInit {
  private readonly service = inject(PlanoService);
  private readonly fb = inject(FormBuilder);

  protected readonly planIcon = PackagePlus;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly checkIcon = Check;

  readonly panel = useSidePanel<Plano>();
  readonly planos = signal<Plano[]>([]);
  readonly termo = signal('');
  readonly status = signal('');
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly sucesso = signal<string | null>(null);

  readonly planosFiltrados = computed(() => {
    const termo = this.termo().toLowerCase();
    const status = this.status();
    return this.planos().filter((plano) => {
      return (
        (!termo || plano.nmPlano.toLowerCase().includes(termo)) &&
        (!status || String(plano.flAtivo) === status)
      );
    });
  });

  readonly form = this.fb.group({
    nmPlano: ['', [Validators.required]],
    dsPlano: [''],
    nuLimiteMensagensMensal: [10000],
    nuLimiteUsuarios: [10],
    nuLimiteTemplates: [100],
    nuLimiteContatos: [10000],
    flWhatsappHabilitado: [true],
    flEmailHabilitado: [true],
    flTelegramHabilitado: [true],
    flWebhookHabilitado: [true],
    flApiPublicaHabilitada: [false],
    flAtivo: [true],
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.service.listar().subscribe({
      next: (planos) => {
        this.planos.set(planos);
        this.carregando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(this.mensagemErro(err, 'Nao foi possivel listar planos.'));
        this.carregando.set(false);
      },
    });
  }

  abrirNovo(): void {
    this.form.reset({
      nmPlano: '',
      dsPlano: '',
      nuLimiteMensagensMensal: 10000,
      nuLimiteUsuarios: 10,
      nuLimiteTemplates: 100,
      nuLimiteContatos: 10000,
      flWhatsappHabilitado: true,
      flEmailHabilitado: true,
      flTelegramHabilitado: true,
      flWebhookHabilitado: true,
      flApiPublicaHabilitada: false,
      flAtivo: true,
    });
    this.panel.abrir();
  }

  editar(plano: Plano): void {
    this.form.patchValue(plano);
    this.panel.abrir(plano);
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dados = this.form.getRawValue();
    const request = {
      nmPlano: dados.nmPlano!,
      dsPlano: dados.dsPlano || null,
      nuLimiteMensagensMensal: Number(dados.nuLimiteMensagensMensal ?? 0),
      nuLimiteUsuarios: Number(dados.nuLimiteUsuarios ?? 0),
      nuLimiteTemplates: Number(dados.nuLimiteTemplates ?? 0),
      nuLimiteContatos: Number(dados.nuLimiteContatos ?? 0),
      flWhatsappHabilitado: !!dados.flWhatsappHabilitado,
      flEmailHabilitado: !!dados.flEmailHabilitado,
      flTelegramHabilitado: !!dados.flTelegramHabilitado,
      flWebhookHabilitado: !!dados.flWebhookHabilitado,
      flApiPublicaHabilitada: !!dados.flApiPublicaHabilitada,
      flAtivo: !!dados.flAtivo,
    };
    const atual = this.panel.item();

    this.salvando.set(true);
    this.erro.set(null);
    this.sucesso.set(null);

    const chamada = atual ? this.service.atualizar(atual.idPlano, request) : this.service.criar(request);
    chamada.subscribe({
      next: () => {
        this.sucesso.set('Plano salvo.');
        this.salvando.set(false);
        this.panel.fechar();
        this.carregar();
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(this.mensagemErro(err, 'Nao foi possivel salvar o plano.'));
        this.salvando.set(false);
      },
    });
  }

  alternar(plano: Plano): void {
    const chamada = plano.flAtivo ? this.service.inativar(plano.idPlano) : this.service.ativar(plano.idPlano);
    chamada.subscribe({
      next: () => this.carregar(),
      error: (err: HttpErrorResponse) => this.erro.set(this.mensagemErro(err, 'Nao foi possivel alterar o status.')),
    });
  }

  atualizarFiltroTermo(event: Event): void {
    this.termo.set((event.target as HTMLInputElement).value);
  }

  atualizarFiltroStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value);
  }

  private mensagemErro(err: HttpErrorResponse, fallback: string): string {
    if (err.status === 403) return 'Voce nao tem permissao para executar esta acao.';
    return err.error?.mensagem ?? err.error?.erro ?? err.error?.message ?? fallback;
  }
}
