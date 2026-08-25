import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EMPRESA_NOME, EMPRESA_TAGLINE } from '../../shared/config/product.config';
import { SITE_PAGE_STYLES } from './site-page.styles';

@Component({
  selector: 'app-site-about',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './site-about.component.html',
  styles: SITE_PAGE_STYLES,
})
export class SiteAboutComponent {
  protected readonly empresaNome = EMPRESA_NOME;
  protected readonly tagline = EMPRESA_TAGLINE;
}
