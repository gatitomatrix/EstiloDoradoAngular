import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/admin`;

@Injectable({ providedIn: 'root' })
export class AdminAuditoriaService {
  private http = inject(HttpClient);

  list(params: any): Observable<any> { return this.http.get(`${API}/auditoria`, { params }); }
}
