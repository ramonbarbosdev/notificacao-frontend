import { Component } from '@angular/core';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  template: `
    <iframe
      src="/privacy-policy/index.html"
      title="Politica de Privacidade"
      class="privacy-policy-frame"
    ></iframe>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: #f9fafb;
      }

      .privacy-policy-frame {
        width: 100%;
        min-height: 100vh;
        border: 0;
      }
    `,
  ],
})
export class PrivacyPolicyComponent {}
