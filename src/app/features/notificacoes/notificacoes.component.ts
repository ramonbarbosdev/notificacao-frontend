// src/app/features/notificacoes/notificacoes.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import {
  LucideAngularModule,
  MessageCircle,
  Mail,
  Send,
  Webhook,
  LoaderCircle,
  Check,
  X,
  ChevronRight,
} from 'lucide-angular';


import {
  EnviarNotificacaoResponse,
  CanalNotificacao,
  StatusNotificacao,
} from '../../shared/types/dtos';
import { NotificacaoService } from '../../core/services/notificacao.service';
import { formatCanal } from '../../shared/helper/channel.utils';
import { maskPhoneInput, normalizePhone } from '../../shared/helper/phone.utils';

interface OpcaoCanal {
  valor: CanalNotificacao;
  label: string;
  icon: any;
}

@Component({
  selector: 'app-notificacoes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
  ],
  templateUrl: './notificacoes.component.html',
})
export class NotificacoesComponent {
  private readonly notificacaoService = inject(NotificacaoService);
  private readonly fb = inject(FormBuilder);

  protected readonly sendIcon = Send;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly checkIcon = Check;
  protected readonly xIcon = X;
  protected readonly chevronRightIcon = ChevronRight;

  readonly canalSelecionado = signal<CanalNotificacao>('WHATSAPP');
  readonly enviando = signal(false);
  readonly resposta = signal<EnviarNotificacaoResponse | null>(null);
  readonly erroRede = signal<string | null>(null);
  readonly mostrarJson = signal(false);

  readonly canais: OpcaoCanal[] = [
    { valor: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle },
    { valor: 'EMAIL', label: 'Email', icon: Mail },
    { valor: 'TELEGRAM', label: 'Telegram', icon: Send },
    { valor: 'WEBHOOK', label: 'Webhook', icon: Webhook },
  ];

  readonly statusLabels: Record<StatusNotificacao, string> = {
    PENDENTE: 'Pendente',
    PROCESSANDO: 'Processando',
    ENVIADA: 'Enviada',
    ENTREGUE: 'Entregue',
    LIDA: 'Lida',
    FALHOU: 'Falhou',
    BLOQUEADA: 'Bloqueada',
    CANCELADA: 'Cancelada',
  };

  readonly form = this.fb.group({
    destinatario: ['', [Validators.required]],
    assunto: [''],
    mensagem: ['', [Validators.required]],
  });

  readonly placeholderDestinatario = () => {
    const mapa: Record<CanalNotificacao, string> = {
      WHATSAPP: '+55 (71) 99118-0200',
      EMAIL: 'destinatario@email.com',
      TELEGRAM: '@usuario ou chat_id',
      WEBHOOK: 'https://seu-webhook.com/endpoint',
    };

    return mapa[this.canalSelecionado()];
  };

  readonly formatarCanal = formatCanal;

  helperDestinatario(): string {
    const mapa: Record<CanalNotificacao, string> = {
      WHATSAPP: 'Telefone com DDI e DDD, ex: +55 (71) 99118-0200',
      EMAIL: 'Endereço de e-mail do destinatário',
      TELEGRAM: 'Usuário (@nome) ou chat_id numérico',
      WEBHOOK: 'URL completa do endpoint que receberá o evento',
    };

    return mapa[this.canalSelecionado()];
  }

  atualizarDestinatario(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (this.canalSelecionado() !== 'WHATSAPP') return;

    const valorFormatado = maskPhoneInput(input.value);

    this.form.controls.destinatario.setValue(valorFormatado, { emitEvent: false });
    input.value = valorFormatado;
  }

  private normalizarDestinatario(valor: string): string {
    if (this.canalSelecionado() === 'WHATSAPP') {
      return normalizePhone(valor);
    }

    if (this.canalSelecionado() === 'EMAIL') {
      return valor.replace(/\s/g, '').toLowerCase();
    }

    return valor.trim();
  }

  selecionarCanal(canal: CanalNotificacao): void {
    this.canalSelecionado.set(canal);

    this.form.patchValue({
      destinatario: '',
    });

    this.resposta.set(null);
    this.erroRede.set(null);
  }

  labelStatus(status: StatusNotificacao): string {
    return this.statusLabels[status];
  }

  ehStatusSucesso(status: StatusNotificacao): boolean {
    return ['PENDENTE', 'PROCESSANDO', 'ENVIADA', 'ENTREGUE', 'LIDA'].includes(status);
  }

  ehStatusAlerta(status: StatusNotificacao): boolean {
    return status === 'PENDENTE' || status === 'PROCESSANDO';
  }

  ehErroConsentimento(mensagem: string | null | undefined): boolean {
    if (!mensagem) return false;

    const texto = mensagem.toLowerCase();
    return texto.includes('consentimento') || texto.includes('opt-in') || texto.includes('opt in') || texto.includes('bloque');
  }

  enviar(): void {
    if (this.form.invalid) return;

    this.enviando.set(true);
    this.resposta.set(null);
    this.erroRede.set(null);
    this.mostrarJson.set(false);

    const { destinatario, assunto, mensagem } = this.form.getRawValue();

    this.notificacaoService
      .enviar({
        canal: this.canalSelecionado(),
        destinatario: this.normalizarDestinatario(destinatario!),
        assunto: assunto ?? '',
        mensagem: mensagem!,
      })
      .subscribe({
        next: (res: any) => {
          this.resposta.set(res);
          this.enviando.set(false);

          if (res.sucesso) {
            this.form.reset({
              destinatario: '',
              assunto: '',
              mensagem: '',
            });
          }
        },
        error: (err: any) => {
          this.enviando.set(false);

          this.erroRede.set(
            err.error?.mensagem ??
            err.error?.detail ??
            err.error?.message ??
            'Falha ao enviar notificação.'
          );
        },
      });
  }
}
