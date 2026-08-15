import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

const API = `${environment.apiBaseUrl}/admin`;

@Injectable({ providedIn: 'root' })
export class AdminPedidosService {
  private http = inject(HttpClient);

  novedades(afterId = 0): Observable<any> {
    let hp = new HttpParams();
    if (afterId > 0) hp = hp.set('after_id', String(afterId));
    return this.http.get(`${API}/pedidos/novedades`, { params: hp });
  }

  list(params: any): Observable<any> {
    let hp = new HttpParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') hp = hp.set(k, String(v));
    });
    return this.http.get(`${API}/pedidos`, { params: hp });
  }

  detail(id: number): Observable<any> { return this.http.get(`${API}/pedidos/${id}`); }

  historial(id: number, params?: any): Observable<any> {
    return this.http.get(`${API}/pedidos/${id}/estado-historial`, { params });
  }

  cambiarEstado(id: number, payload: { estado: string; comentario?: string; id_empleado?: number | null }): Observable<any> {
    return this.http.post(`${API}/pedidos/${id}/estado`, payload);
  }

  comprobantes(id: number): Observable<any> { return this.http.get(`${API}/pedidos/${id}/comprobantes`); }

  descargarComprobante(id: number, tipo: 'pdf'|'xml'|'cdr'): Observable<Blob> {
    const hp = new HttpParams().set('tipo', tipo);
    return this.http.get(`${API}/pedidos/${id}/comprobantes/download`, {
      params: hp, responseType: 'blob' as 'json'
    }) as unknown as Observable<Blob>;
  }

  create(payload: any): Observable<any> {
    return this.http.post(`${API}/pedidos`, payload);
  }

  update(id: number, payload: any): Observable<any> {
    return this.http.put(`${API}/pedidos/${id}`, payload);
  }

  remove(id: number): Observable<{ok:boolean}> {
    return this.http.delete<{ok:boolean}>(`${API}/pedidos/${id}`);
  }
}
