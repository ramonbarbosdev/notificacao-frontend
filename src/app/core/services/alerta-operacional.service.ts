import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AlertaOperacional } from '../../shared/types/dtos';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class AlertaOperacionalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/app/alertas-operacionais`;

  listar(page = 0, size = 10): Observable<PageResponse<AlertaOperacional>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<AlertaOperacional>>(this.baseUrl, { params });
  }
}
