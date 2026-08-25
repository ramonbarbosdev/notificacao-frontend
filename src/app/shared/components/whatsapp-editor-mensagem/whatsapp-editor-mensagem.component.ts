import { CommonModule } from '@angular/common';
import { Component, input, signal, viewChild, ElementRef } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule, Bold, Italic, Strikethrough, Code } from 'lucide-angular';

import {
  aplicarFormatoWhatsapp,
  previewWhatsappHtml,
  WhatsappFormatoTexto,
} from '../../helper/whatsapp-text-format';

@Component({
  selector: 'app-whatsapp-editor-mensagem',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './whatsapp-editor-mensagem.component.html',
})
export class WhatsappEditorMensagemComponent {
  readonly control = input.required<FormControl<string | null>>();
  readonly rows = input(5);
  readonly placeholder = input('Digite a mensagem...');
  readonly exibirPreview = input(true);

  protected readonly boldIcon = Bold;
  protected readonly italicIcon = Italic;
  protected readonly strikeIcon = Strikethrough;
  protected readonly codeIcon = Code;

  readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');

  readonly mostrarPreview = signal(false);

  previewHtml(): string {
    return previewWhatsappHtml(this.control().value ?? '');
  }

  aplicarFormato(formato: WhatsappFormatoTexto): void {
    const elemento = this.textareaRef()?.nativeElement;
    const valorAtual = this.control().value ?? '';

    if (!elemento) {
      const marcador = formato === 'negrito' ? '*' : formato === 'italico' ? '_' : formato === 'riscado' ? '~' : '```';
      this.control().setValue(`${valorAtual}${marcador}texto${marcador}`);
      return;
    }

    const inicio = elemento.selectionStart ?? valorAtual.length;
    const fim = elemento.selectionEnd ?? valorAtual.length;
    const resultado = aplicarFormatoWhatsapp(valorAtual, inicio, fim, formato);

    this.control().setValue(resultado.texto);
    this.control().markAsDirty();

    queueMicrotask(() => {
      elemento.focus();
      elemento.setSelectionRange(resultado.selecaoInicio, resultado.selecaoFim);
    });
  }

  alternarPreview(): void {
    this.mostrarPreview.update((atual) => !atual);
  }
}
