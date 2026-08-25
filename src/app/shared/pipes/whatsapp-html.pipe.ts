import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { previewWhatsappHtml } from '../helper/whatsapp-text-format';

@Pipe({
  name: 'whatsappHtml',
  standalone: true,
})
export class WhatsappHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(texto: string | null | undefined, outbound = false): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(previewWhatsappHtml(texto ?? '', outbound));
  }
}
