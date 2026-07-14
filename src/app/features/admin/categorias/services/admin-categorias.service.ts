import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';


const API = `${environment.apiBaseUrl}/admin`;

@Injectable({ providedIn: 'root' })
export class AdminCategoriasService {
  private http = inject(HttpClient);

  list(): Observable<any> { return this.http.get(`${API}/categorias`); }
  detail(id: number): Observable<any> { return this.http.get(`${API}/categorias/${id}`); }
  create(payload: any): Observable<any> { return this.http.post(`${API}/categorias`, payload); }
  update(id: number, payload: any): Observable<any> { return this.http.put(`${API}/categorias/${id}`, payload); }
  remove(id: number): Observable<any> { return this.http.delete(`${API}/categorias/${id}`); }
}
