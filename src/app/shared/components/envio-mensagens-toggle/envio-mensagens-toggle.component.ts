import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { LoaderCircle, LucideAngularModule, PauseCircle, PlayCircle } from 'lucide-angular';

import { AuthService } from '../../../core/auth/auth.service';
import { OrganizacaoConfiguracaoService } from '../../../core/services/organizacao-configuracao.service';
import { ToastService } from '../../../core/services/toast.service';
import { extrairMensagemErroHttp } from '../../labels/notificacao.labels';

@Component({
  selector: 'app-envio-mensagens-toggle',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './envio-mensagens-toggle.component.html',
})
export class EnvioMensagensToggleComponent implements OnInit {
  private readonly configService = inject(OrganizacaoConfiguracaoService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  /** banner = card completo; compact = chip + botão na barra superior */
  readonly variant = input<'banner' | 'compact'>('banner');

  /** Emite sempre que o status de envio da org é carregado ou alterado. */
  readonly habilitadoAlterado = output<boolean>();

  protected readonly loaderIcon = LoaderCircle;
  protected readonly pauseIcon = PauseCircle;
  protected readonly playIcon = PlayCircle;

  readonly carregando = signal(true);
  readonly alterando = signal(false);
  readonly habilitado = signal(true);
  readonly erro = signal<string | null>(null);

  isAdmin(): boolean {
    return this.authService.role() === 'ADMIN';
  }

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.configService.buscar().subscribe({
      next: (config) => {
        const ativo = config.envioMensagensHabilitado !== false;
        this.habilitado.set(ativo);
        this.habilitadoAlterado.emit(ativo);
        this.carregando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(extrairMensagemErroHttp(err, 'Não foi possível carregar o status de envio.'));
        this.carregando.set(false);
      },
    });
  }

  alternar(): void {
    if (!this.isAdmin() || this.alterando() || this.carregando()) {
      return;
    }

    const ativo = this.habilitado();
    if (
      ativo
      && !confirm(
        'Desativar os envios WhatsApp desta organização? '
          + 'Novos envios serão bloqueados; itens na fila ficam aguardando até reativar.',
      )
    ) {
      return;
    }

    const chamada = ativo
      ? this.configService.desativarEnvioMensagens()
      : this.configService.ativarEnvioMensagens();

    this.alterando.set(true);
    this.erro.set(null);
    chamada.subscribe({
      next: (config) => {
        const habilitado = config.envioMensagensHabilitado !== false;
        this.habilitado.set(habilitado);
        this.habilitadoAlterado.emit(habilitado);
        this.alterando.set(false);
        this.toast.success(ativo ? 'Envios WhatsApp desativados' : 'Envios WhatsApp reativados');
      },
      error: (err: HttpErrorResponse) => {
        this.alterando.set(false);
        const msg = extrairMensagemErroHttp(err, 'Erro ao alterar envios.');
        this.erro.set(msg);
        this.toast.error('Erro ao alterar envios', msg);
      },
    });
  }
}
