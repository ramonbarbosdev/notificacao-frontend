import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { X, LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-side-panel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './side-panel.component.html',
})
export class SidePanelComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() description = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  @Output() closed = new EventEmitter<void>();

  readonly closeIcon = X;

  get widthClass(): string {
    switch (this.size) {
      case 'sm':
        return 'max-w-md';
      case 'lg':
        return 'max-w-2xl';
      default:
        return 'max-w-xl';
    }
  }

  close(): void {
    this.closed.emit();
  }
}