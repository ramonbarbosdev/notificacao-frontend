import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SITE_PAGE_STYLES } from './site-page.styles';

@Component({
  selector: 'app-site-platform',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './site-platform.component.html',
  styles: SITE_PAGE_STYLES,
})
export class SitePlatformComponent {}
