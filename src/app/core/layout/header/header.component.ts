import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Menu, LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../auth/auth.service';
import { LayoutService } from '../layout.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  readonly authService = inject(AuthService);
  readonly layout = inject(LayoutService);
  readonly menuIcon = Menu;
}
