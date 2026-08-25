import { Component } from '@angular/core';

@Component({
  selector: 'app-terms-of-use',
  standalone: true,
  template: `
    <iframe src="/termos-de-uso/index.html" title="Termos de Uso" class="legal-frame"></iframe>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: var(--color-bg-base);
      }

      .legal-frame {
        width: 100%;
        min-height: 100vh;
        border: 0;
      }
    `,
  ],
})
export class TermsOfUseComponent {}
