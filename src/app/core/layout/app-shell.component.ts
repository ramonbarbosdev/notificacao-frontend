import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './layout.components';
import { HeaderComponent } from './header/header.component';
import { LayoutService } from './layout.service';
import { StatusEnvioBannerComponent } from '../../shared/components/status-envio-banner/status-envio-banner.component';
import { AuthService } from '../auth/auth.service';
import { FeatureFlagStore } from '../services/feature-flag.store';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterModule, SidebarComponent, HeaderComponent, StatusEnvioBannerComponent],
  template: `
    <div class="min-h-screen bg-[var(--color-bg-base)]">
      @if (layout.sidebarAberta()) {
        <button
          type="button"
          class="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-label="Fechar menu"
          (click)="layout.fecharSidebar()"
        ></button>
      }

      <app-sidebar />

      <app-header />

      <main class="pt-16 pl-0 lg:pl-64 transition-[padding] duration-300">
        <div class="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <app-status-envio-banner />
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class AppShellComponent implements OnInit {
  readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);
  private readonly featureFlags = inject(FeatureFlagStore);

  ngOnInit(): void {
    if (this.auth.autenticado() && !this.auth.isSuperAdmin()) {
      this.featureFlags.carregar().subscribe();
    }
  }
}
