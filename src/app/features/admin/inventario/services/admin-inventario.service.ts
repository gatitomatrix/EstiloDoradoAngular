import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminInventarioService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/admin`;

  list(params: any) {
    let hp = new HttpParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') hp = hp.set(k, String(v));
    });
    return this.http.get<any>(`${this.base}/inventario`, { params: hp });
  }

  // Ahora aceptan fecha e id_empleado opcionales
  entrada(payload: { id_producto: number; cantidad: number; observacion?: string; referencia_tipo?: 'pedido'|'ajuste'|'otro'|'compra'; referencia_id?: number; fecha?: string; id_empleado?: number }) {
    return this.http.post(`${this.base}/inventario/entrada`, payload);
  }
  salida(payload: { id_producto: number; cantidad: number; observacion?: string; referencia_tipo?: 'pedido'|'ajuste'|'otro'|'compra'; referencia_id?: number; fecha?: string; id_empleado?: number }) {
    return this.http.post(`${this.base}/inventario/salida`, payload);
  }
  ajuste(payload: { id_producto: number; cantidad: number; observacion?: string; referencia_tipo?: 'pedido'|'ajuste'|'otro'|'compra'; referencia_id?: number; fecha?: string; id_empleado?: number }) {
    return this.http.post(`${this.base}/inventario/ajuste`, payload);
  }
}
