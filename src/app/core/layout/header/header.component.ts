import { CommonModule } from "@angular/common";
import { AuthService } from "../../auth/auth.service";
import { Component, inject } from "@angular/core";

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
 
})
export class HeaderComponent {
  readonly authService = inject(AuthService);
}
