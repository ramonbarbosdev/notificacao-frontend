import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SITE_PAGE_STYLES } from './site-page.styles';

@Component({
  selector: 'app-site-integrations',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './site-integrations.component.html',
  styles: SITE_PAGE_STYLES,
})
export class SiteIntegrationsComponent {}
