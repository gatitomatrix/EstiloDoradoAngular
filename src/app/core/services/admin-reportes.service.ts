import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/admin`;

export type RangoReporte = { desde: string; hasta: string };

@Injectable({ providedIn: 'root' })
export class AdminReportesService {
  private http = inject(HttpClient);

  downloadClientes(ext: 'xlsx'|'csv'|'pdf', params?: any): Observable<Blob> {
    return this.http.get(`${API}/reportes/clientes.${ext}`, { params, responseType: 'blob' });
  }
  downloadProductos(ext: 'xlsx'|'csv'|'pdf', params?: any): Observable<Blob> {
    return this.http.get(`${API}/reportes/productos.${ext}`, { params, responseType: 'blob' });
  }
  downloadPedidos(ext: 'xlsx'|'csv'|'pdf', params?: RangoReporte): Observable<Blob> {
    return this.http.get(`${API}/reportes/pedidos.${ext}`, { params: params as any, responseType: 'blob' });
  }
  downloadInventario(ext: 'xlsx'|'csv'|'pdf', params?: any): Observable<Blob> {
    return this.http.get(`${API}/reportes/inventario.${ext}`, { params, responseType: 'blob' });
  }

  financiero(rango: RangoReporte) {
    return this.http.get<FinancieroResumen>(`${API}/reportes/financiero`, { params: rango as any });
  }

  downloadFinanciero(ext: 'xlsx'|'csv'|'pdf', rango: RangoReporte): Observable<Blob> {
    return this.http.get(`${API}/reportes/financiero.${ext}`, { params: rango as any, responseType: 'blob' });
  }

  downloadVentasDia(ext: 'xlsx'|'csv'|'pdf', rango: RangoReporte): Observable<Blob> {
    return this.http.get(`${API}/reportes/ventas-dia.${ext}`, { params: rango as any, responseType: 'blob' });
  }
  downloadFormaPago(ext: 'xlsx'|'csv'|'pdf', rango: RangoReporte): Observable<Blob> {
    return this.http.get(`${API}/reportes/forma-pago.${ext}`, { params: rango as any, responseType: 'blob' });
  }
  downloadTopProductos(ext: 'xlsx'|'csv'|'pdf', rango: RangoReporte): Observable<Blob> {
    return this.http.get(`${API}/reportes/top-productos.${ext}`, { params: rango as any, responseType: 'blob' });
  }

  downloadStockBajo(ext: 'xlsx'|'csv'|'pdf'): Observable<Blob> {
    return this.http.get(`${API}/reportes/stock-bajo.${ext}`, { params: { threshold: 10 }, responseType: 'blob' });
  }
}

export interface FinancieroKpis {
  ingresos: number;
  pedidos_cobrados: number;
  ticket_promedio: number;
  costo_estimado: number;
  margen_estimado: number;
  pendientes: number;
  cancelados: number;
  monto_cancelado: number;
}

export interface FinancieroResumen {
  desde: string;
  hasta: string;
  dias: number;
  kpis: FinancieroKpis;
  por_pago: { metodo: string; pedidos: number; total: number }[];
  por_dia: { fecha: string; total: number; pedidos: number }[];
  top_productos: { id: number; nombre: string; unidades: number; importe: number }[];
}
