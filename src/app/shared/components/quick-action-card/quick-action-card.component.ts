import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';

export type QuickActionTone = 'success' | 'default';

@Component({
  selector: 'app-quick-action-card',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './quick-action-card.component.html',
})
export class QuickActionCardComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) description = '';
  @Input({ required: true }) routerLink = '';
  @Input({ required: true }) icon!: LucideIconData;
  @Input({ required: true }) chevronIcon!: LucideIconData;

  @Input() tone: QuickActionTone = 'default';
}
