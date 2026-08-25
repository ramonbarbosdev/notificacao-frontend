import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowRight, Cloud, Layers, Send, Shield } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';

import {
  APP_NOME_COMPLETO,
  EMPRESA_NOME,
  EMPRESA_TAGLINE,
} from '../../shared/config/product.config';
import { SITE_PAGE_STYLES } from './site-page.styles';

@Component({
  selector: 'app-site-home',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './site-home.component.html',
  styles: SITE_PAGE_STYLES,
})
export class SiteHomeComponent {
  protected readonly appNome = APP_NOME_COMPLETO;
  protected readonly empresaNome = EMPRESA_NOME;
  protected readonly tagline = EMPRESA_TAGLINE;
  protected readonly sendIcon = Send;
  protected readonly cloudIcon = Cloud;
  protected readonly layersIcon = Layers;
  protected readonly shieldIcon = Shield;
  protected readonly arrowIcon = ArrowRight;
}
