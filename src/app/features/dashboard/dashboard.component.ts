// src/app/features/dashboard/dashboard.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../core/layout/layout.components';
import { AuthService } from '../../core/auth/auth.service';
import { WhatsappService } from '../../core/http/services';
import { WhatsappStatusResponse } from '../../shared/types/dtos';
import {
  Shield,
  MessageCircle,
  Send,
  TriangleAlert,
  Zap,
  ChevronRight,
  LucideAngularModule
} from 'lucide-angular';
import { HeaderComponent } from '../../core/layout/header/header.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [    CommonModule,
    RouterModule,
    LucideAngularModule,
    SidebarComponent,
    HeaderComponent],
  templateUrl: './dashboard.component.html',

})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly whatsappService = inject(WhatsappService);

  protected readonly shieldIcon = Shield;
  protected readonly whatsappIcon = MessageCircle;
  protected readonly sendIcon = Send;
  protected readonly alertIcon = TriangleAlert;
  protected readonly zapIcon = Zap;
  protected readonly chevronRightIcon = ChevronRight;

  readonly whatsappStatus = signal<WhatsappStatusResponse | null>(null);
  readonly carregandoStatus = signal(true);

  readonly primeiroNome = () => {
    const nome = this.authService.nomeUsuario() ?? '';
    return nome.split(' ')[0];
  };

  ngOnInit(): void {
    this.carregarStatus();
  }

  carregarStatus(): void {
    this.carregandoStatus.set(true);
    this.whatsappService.status().subscribe({
      next: (s) => {
        this.whatsappStatus.set(s);
        this.carregandoStatus.set(false);
      },
      error: () => this.carregandoStatus.set(false),
    });
  }
}
