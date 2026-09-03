import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';


const API = `${environment.apiBaseUrl}/admin`;

@Injectable({ providedIn: 'root' })
export class AdminProveedoresService {
  private http = inject(HttpClient);

  list(params?: Record<string, string | number>): Observable<any> {
    return this.http.get(`${API}/proveedores`, { params: params as any });
  }
  detail(id: number): Observable<any> { return this.http.get(`${API}/proveedores/${id}`); }
  create(payload: any): Observable<any> { return this.http.post(`${API}/proveedores`, payload); }
  update(id: number, payload: any): Observable<any> { return this.http.put(`${API}/proveedores/${id}`, payload); }
  remove(id: number): Observable<any> { return this.http.delete(`${API}/proveedores/${id}`); }
}
