import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Check, LoaderCircle, LucideAngularModule, PauseCircle, PlayCircle } from 'lucide-angular';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { OrganizacaoConfiguracaoService } from '../../../core/services/organizacao-configuracao.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  TCTOKEN_CONFIRMACAO_PLACEHOLDER_DIAS,
  TCTOKEN_CONFIRMACAO_PLACEHOLDER_LOGIN,
} from '../../helper/tctoken-confirmacao.utils';
import { extrairMensagemErroHttp } from '../../labels/notificacao.labels';

@Component({
  selector: 'app-tctoken-confirmacao-motor',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './tctoken-confirmacao-motor.component.html',
})
export class TcTokenConfirmacaoMotorComponent implements OnInit {
  private readonly configService = inject(OrganizacaoConfiguracaoService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  /** Template org (null = padrão sistema) após carregar ou salvar. */
  readonly templateAlterado = output<string | null>();

  protected readonly loaderIcon = LoaderCircle;
  protected readonly pauseIcon = PauseCircle;
  protected readonly playIcon = PlayCircle;
  protected readonly checkIcon = Check;
  protected readonly placeholderLogin = TCTOKEN_CONFIRMACAO_PLACEHOLDER_LOGIN;
  protected readonly placeholderDias = TCTOKEN_CONFIRMACAO_PLACEHOLDER_DIAS;

  readonly carregando = signal(true);
  readonly alterandoMotor = signal(false);
  readonly salvando = signal(false);
  readonly habilitado = signal(true);
  readonly diasAntes = signal(7);
  readonly mensagemPadrao = signal('');
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
        this.habilitado.set(config.tctokenConfirmacaoAutomaticaHabilitado !== false);
        const dias = config.tctokenConfirmacaoAutomaticaDiasAntes ?? 7;
        this.diasAntes.set(Math.min(28, Math.max(1, dias)));
        const tpl = config.tctokenConfirmacaoMensagemPadrao ?? '';
        this.mensagemPadrao.set(tpl);
        this.emitirTemplate(tpl);
        this.carregando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(extrairMensagemErroHttp(err, 'Não foi possível carregar o motor de confirmação.'));
        this.carregando.set(false);
      },
    });
  }

  alternarMotor(): void {
    if (!this.isAdmin() || this.alterandoMotor() || this.carregando()) {
      return;
    }

    const ativo = this.habilitado();
    const chamada = ativo
      ? this.configService.desativarTctokenConfirmacaoAutomatica()
      : this.configService.ativarTctokenConfirmacaoAutomatica();

    this.alterandoMotor.set(true);
    this.erro.set(null);
    chamada.subscribe({
      next: (config) => {
        this.habilitado.set(config.tctokenConfirmacaoAutomaticaHabilitado !== false);
        this.alterandoMotor.set(false);
        this.toast.success(ativo ? 'Motor de confirmação desligado' : 'Motor de confirmação ligado');
      },
      error: (err: HttpErrorResponse) => {
        this.alterandoMotor.set(false);
        const msg = extrairMensagemErroHttp(err, 'Erro ao alterar o motor.');
        this.erro.set(msg);
        this.toast.error('Erro ao alterar motor', msg);
      },
    });
  }

  formularioValido(): boolean {
    const dias = Number(this.diasAntes());
    return Number.isFinite(dias) && dias >= 1 && dias <= 28;
  }

  salvar(): void {
    if (!this.isAdmin() || this.salvando() || !this.formularioValido()) {
      return;
    }

    const dias = Math.round(Number(this.diasAntes()));
    const mensagem = this.mensagemPadrao();

    this.salvando.set(true);
    this.erro.set(null);

    forkJoin([
      this.configService.atualizarTctokenConfirmacaoDiasAntes(dias),
      this.configService.atualizarTctokenConfirmacaoMensagemPadrao(mensagem),
    ]).subscribe({
      next: ([configDias, configMsg]) => {
        this.diasAntes.set(configDias.tctokenConfirmacaoAutomaticaDiasAntes ?? dias);
        const tpl = configMsg.tctokenConfirmacaoMensagemPadrao ?? '';
        this.mensagemPadrao.set(tpl);
        this.emitirTemplate(tpl);
        this.salvando.set(false);
        this.toast.success('Configuração do motor salva');
      },
      error: (err: HttpErrorResponse) => {
        this.salvando.set(false);
        const msg = extrairMensagemErroHttp(err, 'Erro ao salvar configuração.');
        this.erro.set(msg);
        this.toast.error('Erro ao salvar', msg);
      },
    });
  }

  private emitirTemplate(raw: string): void {
    const trimmed = (raw ?? '').trim();
    this.templateAlterado.emit(trimmed ? trimmed : null);
  }
}
