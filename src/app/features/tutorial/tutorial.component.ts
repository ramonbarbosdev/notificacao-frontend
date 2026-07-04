import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { BookOpen, Check, ChevronRight, Copy, LucideAngularModule } from 'lucide-angular';

import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/services/toast.service';
import { TUTORIAL_TOPICOS, TutorialTopico } from './tutorial.data';

@Component({
  selector: 'app-tutorial',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './tutorial.component.html',
  styleUrl: './tutorial.component.scss',
})
export class TutorialComponent {
  private readonly toast = inject(ToastService);

  protected readonly bookIcon = BookOpen;
  protected readonly copyIcon = Copy;
  protected readonly checkIcon = Check;
  protected readonly chevronIcon = ChevronRight;

  readonly topicos = TUTORIAL_TOPICOS;
  readonly topicoAtivoId = signal(TUTORIAL_TOPICOS[0].id);
  readonly copiadoId = signal<string | null>(null);

  readonly topicoAtivo = computed(() =>
    this.topicos.find((t) => t.id === this.topicoAtivoId()) ?? this.topicos[0],
  );

  readonly apiUrl = environment.apiUrl;

  selecionarTopico(id: string): void {
    this.topicoAtivoId.set(id);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  resolverCodigo(code: string): string {
    return code.replaceAll('{API_URL}', this.apiUrl);
  }

  async copiar(codigo: string, id: string): Promise<void> {
    const texto = this.resolverCodigo(codigo);
    try {
      await navigator.clipboard.writeText(texto);
      this.copiadoId.set(id);
      this.toast.success('Copiado para a área de transferência');
      setTimeout(() => {
        if (this.copiadoId() === id) {
          this.copiadoId.set(null);
        }
      }, 2000);
    } catch {
      this.toast.error('Não foi possível copiar');
    }
  }

  classeLinguagem(language: string): string {
    return `tutorial-code--${language}`;
  }

  trackTopico(_: number, item: TutorialTopico): string {
    return item.id;
  }
}
