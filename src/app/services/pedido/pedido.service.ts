// src/app/services/pedido/pedido.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PedidoResumen {
  id_pedido: number;
  id_cliente: number;
  total: number;
  estado: string;
  fecha: string;              // viene de fecha_pedido as fecha
  forma_pago?: string | null;
  direccion_entrega?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private http = inject(HttpClient);
  private API  = environment.apiBaseUrl;

  listMine(options: { desde?: 'last'|'3m'|'1y'; q?: number | null } = {}): Observable<PedidoResumen[]> {
    let params = new HttpParams();
    if (options.desde) params = params.set('desde', options.desde);
    if (options.q != null && options.q !== undefined && options.q !== 0) {
      params = params.set('q', String(options.q));
    }
    return this.http.get<PedidoResumen[]>(`${this.API}/pedidos/mios`, { params });
  }
}
