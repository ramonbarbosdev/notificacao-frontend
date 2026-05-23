import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
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
}
