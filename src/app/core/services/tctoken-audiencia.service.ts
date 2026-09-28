import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TcTokenAudienciaPedirConfirmacaoRequest, TcTokenAudienciaPedirConfirmacaoResponse, TcTokenAudienciaScanResponse } from '../../shared/types/dtos';

@Injectable({ providedIn: 'root' })
export class TcTokenAudienciaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/app/whatsapp/tctoken-audiencia`;

  obter(refresh = false): Observable<TcTokenAudienciaScanResponse> {
    let params = new HttpParams();
    if (refresh) {
      params = params.set('refresh', '1');
    }
    return this.http.get<TcTokenAudienciaScanResponse>(this.base, { params });
  }

  pedirConfirmacao(body: TcTokenAudienciaPedirConfirmacaoRequest): Observable<TcTokenAudienciaPedirConfirmacaoResponse> {
    return this.http.post<TcTokenAudienciaPedirConfirmacaoResponse>(`${this.base}/pedir-confirmacao`, body);
  }
}
