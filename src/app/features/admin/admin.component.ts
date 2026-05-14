import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import {  SidebarComponent } from '../../core/layout/layout.components';
import { HeaderComponent } from '../../core/layout/header/header.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent],
  templateUrl: './admin.component.html',

})
export class AdminComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly statusData = signal<unknown>(null);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    this.carregarStatus();
  }

  carregarStatus(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.http.get(`${environment.apiUrl}/admin/status`).subscribe({
      next: (data) => {
        this.statusData.set(data);
        this.carregando.set(false);
      },
      error: (err) => {
        this.erro.set(err.error?.mensagem ?? 'Erro ao consultar o status do sistema.');
        this.carregando.set(false);
      },
    });
  }
}
