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

import { SidebarComponent } from '../../core/layout/layout.components';
import { NotificacaoService } from '../../core/http/services';

import {
  EnviarNotificacaoResponse,
  CanalNotificacao,
} from '../../shared/types/dtos';
import { HeaderComponent } from '../../core/layout/header/header.component';

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
    SidebarComponent,
    HeaderComponent,
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

  readonly form = this.fb.group({
    destinatario: ['', [Validators.required]],
    assunto: [''],
    mensagem: ['', [Validators.required]],
  });

  readonly placeholderDestinatario = () => {
    const mapa: Record<CanalNotificacao, string> = {
      WHATSAPP: '5571991180200',
      EMAIL: 'destinatario@email.com',
      TELEGRAM: '@usuario ou chat_id',
      WEBHOOK: 'https://seu-webhook.com/endpoint',
    };

    return mapa[this.canalSelecionado()];
  };

  selecionarCanal(canal: CanalNotificacao): void {
    this.canalSelecionado.set(canal);

    this.form.patchValue({
      destinatario: '',
    });

    this.resposta.set(null);
    this.erroRede.set(null);
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
        destinatario: destinatario!,
        assunto: assunto ?? '',
        mensagem: mensagem!,
      })
      .subscribe({
        next: (res) => {
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
        error: (err) => {
          this.erroRede.set(
            err.error?.mensagem ??
            err.error?.erro ??
            'Falha na comunicação com a API.'
          );

          this.enviando.set(false);
        },
      });
  }
}