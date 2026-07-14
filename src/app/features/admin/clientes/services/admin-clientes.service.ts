import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

const API = `${environment.apiBaseUrl}/admin`;

@Injectable({ providedIn: 'root' })
export class AdminClientesService {
  private http = inject(HttpClient);

  list(params: any): Observable<any> { return this.http.get(`${API}/clientes`, { params }); }
  detail(id: number): Observable<any> { return this.http.get(`${API}/clientes/${id}`); }
  create(payload: any): Observable<any> { return this.http.post(`${API}/clientes`, payload); }
  update(id: number, payload: any): Observable<any> { return this.http.put(`${API}/clientes/${id}`, payload); }
}
