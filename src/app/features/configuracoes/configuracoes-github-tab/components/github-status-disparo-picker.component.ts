import { CommonModule } from '@angular/common';
import { Component, Input, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { FormFieldComponent } from '../../../../shared/components/forms/form-field/app-form-field';
import { GithubProjectV2StatusOpcao } from '../../../../shared/types/dtos';
import { OrganizacaoConfiguracaoFormData } from '../../schemas/organizacao-configuracao-form.schema';
import { corStatusGithubProject } from '../github-status-color.util';

@Component({
  selector: 'app-github-status-disparo-picker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent],
  templateUrl: './github-status-disparo-picker.component.html',
})
export class GithubStatusDisparoPickerComponent {
  @Input({ required: true }) form!: FormGroup;
  readonly campo = input.required<keyof OrganizacaoConfiguracaoFormData>();
  readonly titulo = input.required<string>();
  readonly helper = input<string>('');
  readonly erro = input<string | null>(null);
  readonly opcoes = input<GithubProjectV2StatusOpcao[]>([]);
  readonly carregandoOpcoes = input(false);
  readonly vinculoCarregando = input(false);

  corOpcao(color: string | null | undefined): string {
    return corStatusGithubProject(color);
  }

  selecionado(nome: string): boolean {
    return this.nomes().has(nome);
  }

  alternar(nome: string): void {
    const control = this.form.get(this.campo());
    if (!control) {
      return;
    }
    const set = this.nomes();
    if (set.has(nome)) {
      set.delete(nome);
    } else {
      set.add(nome);
    }
    const ordenados = [...set].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    control.setValue(ordenados.join(', '));
    control.markAsDirty();
  }

  limpar(): void {
    const control = this.form.get(this.campo());
    if (!control) {
      return;
    }
    control.setValue('');
    control.markAsDirty();
  }

  resumoSelecao(): string | null {
    const raw = String(this.form.get(this.campo())?.value ?? '').trim();
    return raw.length > 0 ? raw : null;
  }

  private nomes(): Set<string> {
    const raw = String(this.form.get(this.campo())?.value ?? '');
    const set = new Set<string>();
    for (const parte of raw.split(/[,;]+/)) {
      const nome = parte.trim();
      if (nome) {
        set.add(nome);
      }
    }
    return set;
  }
}
