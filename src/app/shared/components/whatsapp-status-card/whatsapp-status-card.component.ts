import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { formatPhone } from '../../helper/phone.utils';
import { labelWhatsappStatus } from '../../labels/notificacao.labels';
import { WhatsappStatusResponse } from '../../types/dtos';


@Component({
  selector: 'app-whatsapp-status-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './whatsapp-status-card.component.html',
})
export class WhatsappStatusCardComponent {
  @Input({ required: true }) whatsappStatus: WhatsappStatusResponse | null = null;
  @Input() carregandoStatus = false;
  @Input({ required: true }) whatsappIcon!: LucideIconData;

  readonly formatarTelefone = formatPhone;
  readonly labelStatus = (status: string | undefined) => labelWhatsappStatus(status);
}
