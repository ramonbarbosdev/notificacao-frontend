import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Menu, MessageCircle, X } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { signal } from '@angular/core';

import {
  APP_NOME_COMPLETO,
  EMPRESA_NOME,
} from '../../shared/config/product.config';
import { SITE_LEGAL_LINKS, SITE_NAV_ITEMS } from './site-nav';

@Component({
  selector: 'app-site-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './site-shell.component.html',
})
export class SiteShellComponent {
  protected readonly appNome = APP_NOME_COMPLETO;
  protected readonly empresaNome = EMPRESA_NOME;
  protected readonly navItems = SITE_NAV_ITEMS;
  protected readonly legalLinks = SITE_LEGAL_LINKS;
  protected readonly menuIcon = Menu;
  protected readonly closeIcon = X;
  protected readonly brandIcon = MessageCircle;
  protected readonly ano = new Date().getFullYear();
  protected readonly menuAberto = signal(false);

  fecharMenu(): void {
    this.menuAberto.set(false);
  }

  alternarMenu(): void {
    this.menuAberto.update((aberto) => !aberto);
  }
}
