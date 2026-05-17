import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Activity, LucideAngularModule } from 'lucide-angular';

import { environment } from '../../../../environments/environment';
import { HeaderComponent } from '../../../core/layout/header/header.component';
import { SidebarComponent } from '../../../core/layout/layout.components';

@Component({
  selector: 'app-monitoramento',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, SidebarComponent, HeaderComponent],
  templateUrl: './monitoramento.component.html',
})
export class MonitoramentoComponent implements OnInit {
  private readonly http = inject(HttpClient);
  protected readonly activityIcon = Activity;
  readonly status = signal<unknown>(null);
  readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    this.http.get(`${environment.apiUrl}/admin/status`).subscribe({
      next: (res) => this.status.set(res),
      error: (err) => this.erro.set(err.error?.mensagem ?? 'Nao foi possivel consultar o status.'),
    });
  }
}
