import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';

export type MetricTone = 'default' | 'warning' | 'info' | 'success' | 'danger';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './metric-card.component.html',
})
export class MetricCardComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) description = '';
  @Input({ required: true }) icon!: LucideIconData;

  @Input() value: string | number = '-';
  @Input() label = 'total';
  @Input() tone: MetricTone = 'default';
  @Input() loading = false;
}
