import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { BookOpen, Check, ChevronRight, Copy, LucideAngularModule } from 'lucide-angular';

import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/services/toast.service';
import { TUTORIAL_TOPICOS, TutorialCodeLanguage, TutorialSection, TutorialTopico } from './tutorial.data';

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
  readonly abaExemploAtiva = signal<Record<string, number>>({});

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

  secaoComAbas(secao: TutorialSection): boolean {
    return secao.modoExemplos === 'abas' && (secao.exemplos?.length ?? 0) > 0;
  }

  chaveSecaoExemplos(topicoId: string, secaoTitulo: string): string {
    return `${topicoId}::${secaoTitulo}`;
  }

  indiceAbaAtiva(topicoId: string, secao: TutorialSection): number {
    const exemplos = secao.exemplos ?? [];
    if (exemplos.length === 0) {
      return 0;
    }

    const chave = this.chaveSecaoExemplos(topicoId, secao.titulo);
    const salvo = this.abaExemploAtiva()[chave];
    if (salvo != null && salvo >= 0 && salvo < exemplos.length) {
      return salvo;
    }

    return 0;
  }

  selecionarAbaExemplo(topicoId: string, secao: TutorialSection, indice: number): void {
    const chave = this.chaveSecaoExemplos(topicoId, secao.titulo);
    this.abaExemploAtiva.update((mapa) => ({ ...mapa, [chave]: indice }));
    this.copiadoId.set(null);
  }

  labelAba(language: TutorialCodeLanguage): string {
    const rotulos: Partial<Record<TutorialCodeLanguage, string>> = {
      typescript: 'TypeScript',
      javascript: 'JavaScript',
      java: 'Java',
      php: 'PHP',
      csharp: 'C#',
      bash: 'cURL',
      http: 'HTTP',
      json: 'JSON',
    };

    return rotulos[language] ?? language;
  }

  idCopiaExemplo(topicoId: string, secaoTitulo: string, rotulo: string): string {
    return `${topicoId}${secaoTitulo}${rotulo}`;
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

  classeLinguagem(language: TutorialCodeLanguage): string {
    return `tutorial-code--${language}`;
  }

  trackTopico(_: number, item: TutorialTopico): string {
    return item.id;
  }
}
