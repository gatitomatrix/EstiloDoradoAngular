import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/admin`;

@Injectable({ providedIn: 'root' })
export class AdminReportesService {
  private http = inject(HttpClient);

  downloadClientes(ext: 'xlsx'|'csv'|'pdf', params?: any): Observable<Blob> {
    return this.http.get(`${API}/reportes/clientes.${ext}`, { params, responseType: 'blob' });
  }
  downloadProductos(ext: 'xlsx'|'csv'|'pdf', params?: any): Observable<Blob> {
    return this.http.get(`${API}/reportes/productos.${ext}`, { params, responseType: 'blob' });
  }
  downloadPedidos(ext: 'xlsx'|'csv'|'pdf', params?: any): Observable<Blob> {
    return this.http.get(`${API}/reportes/pedidos.${ext}`, { params, responseType: 'blob' });
  }
  downloadInventario(ext: 'xlsx'|'csv'|'pdf', params?: any): Observable<Blob> {
    return this.http.get(`${API}/reportes/inventario.${ext}`, { params, responseType: 'blob' });
  }
}
