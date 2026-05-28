import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-contato-summary-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contato-summary-cards.component.html',
})
export class ContatoSummaryCardsComponent {
  totalContatos = input.required<number>();
  totalConsentidos = input.required<number>();
  totalBloqueados = input.required<number>();
  totalSemConsentimento = input.required<number>();
}