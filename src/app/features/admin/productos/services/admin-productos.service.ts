import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

export interface Producto {
  id_producto: number;
  nombre: string;
  descripcion?: string;
  /** Palabras clave para búsqueda / chatbot, separadas por coma */
  etiquetas?: string | null;
  precio_compra: number;
  precio_venta: number;
  descuento_pct?: number;
  oferta_hasta?: string | null;
  stock: number;
  id_categoria: number;
  id_proveedor: number;
  imagen_url?: string;
  estado: 'activo' | 'inactivo';
  slug: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface StockBajoResponse {
  data: Producto[];
  meta: { threshold: number; count: number };
}

@Injectable({ providedIn: 'root' })
export class AdminProductosService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/admin`;

  list(params: any) {
    let hp = new HttpParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') hp = hp.set(k, String(v));
    });
    return this.http.get<any>(`${this.base}/productos`, { params: hp });
  }

  get(id: number) {
    return this.http.get<Producto>(`${this.base}/productos/${id}`);
  }

  create(payload: Partial<Producto>) {
    return this.http.post<Producto>(`${this.base}/productos`, payload);
  }

  update(id: number, payload: Partial<Producto>) {
    return this.http.put<Producto>(`${this.base}/productos/${id}`, payload);
  }

  remove(id: number) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/productos/${id}`);
  }

  stockBajo(threshold = 3) {
    const params = new HttpParams().set('threshold', threshold);
    return this.http.get<StockBajoResponse>(`${this.base}/alertas/stock-bajo`, { params });
  }
}
