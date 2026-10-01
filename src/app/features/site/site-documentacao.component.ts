import { Component } from '@angular/core';

import { TutorialComponent } from '../tutorial/tutorial.component';
import { SITE_PAGE_STYLES } from './site-page.styles';

/** Documentação da API acessível sem login (site público). */
@Component({
  selector: 'app-site-documentacao',
  standalone: true,
  imports: [TutorialComponent],
  template: `
    <section class="site-page site-documentacao-wrap">
      <app-tutorial />
    </section>
  `,
  styles: [
    ...SITE_PAGE_STYLES,
    `
      .site-documentacao-wrap {
        padding-bottom: 3rem;
      }
    `,
  ],
})
export class SiteDocumentacaoComponent {}
