import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';

@Component({
  selector: 'app-whatsapp-cloud-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="callback-page">
      <p>{{ mensagem() }}</p>
    </main>
  `,
  styles: [
    `
      .callback-page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: system-ui, sans-serif;
        color: #334155;
      }
    `,
  ],
})
export class WhatsappCloudCallbackComponent implements OnInit {
  readonly mensagem = signal('Finalizando conexao com a Meta...');

  ngOnInit(): void {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error_description') ?? params.get('error');

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: 'WA_EMBEDDED_SIGNUP_OAUTH',
          code,
          error,
        },
        window.location.origin,
      );
      window.close();
      return;
    }

    if (code) {
      this.mensagem.set('Conexao recebida. Volte a aba do sistema e tente novamente se nao concluir.');
      return;
    }

    if (error) {
      this.mensagem.set(`Conexao cancelada: ${error}`);
      return;
    }

    this.mensagem.set('Pagina de callback OAuth do WhatsApp Cloud.');
  }
}
