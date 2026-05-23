import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-dashboard-alert',
  standalone: true,
  templateUrl: './dashboard-alert.component.html',
})
export class DashboardAlertComponent {
  @Input({ required: true }) message = '';
}
