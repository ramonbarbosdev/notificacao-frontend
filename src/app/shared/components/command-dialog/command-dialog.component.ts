import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { LucideAngularModule, TriangleAlert } from 'lucide-angular';

import { CommandDialogService } from '../../../core/services/command-dialog.service';

@Component({
  selector: 'app-command-dialog',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './command-dialog.component.html',
})
export class CommandDialogComponent {
  readonly commandDialog = inject(CommandDialogService);
  readonly alertIcon = TriangleAlert;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.commandDialog.dialog()) {
      this.commandDialog.close(false);
    }
  }

  cancelar(): void {
    this.commandDialog.close(false);
  }

  confirmar(): void {
    this.commandDialog.close(true);
  }
}
