import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CONTATO_EMAIL, CONTATO_WHATSAPP, EMPRESA_NOME } from '../../shared/config/product.config';
import { SITE_PAGE_STYLES } from './site-page.styles';

@Component({
  selector: 'app-site-contact',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './site-contact.component.html',
  styles: SITE_PAGE_STYLES,
})
export class SiteContactComponent {
  protected readonly empresaNome = EMPRESA_NOME;
  protected readonly email = CONTATO_EMAIL;
  protected readonly whatsapp = CONTATO_WHATSAPP;
  protected readonly whatsappUrl = `https://wa.me/${CONTATO_WHATSAPP}`;
  protected readonly mailtoUrl = `mailto:${CONTATO_EMAIL}`;
}
