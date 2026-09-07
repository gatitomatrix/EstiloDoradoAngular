import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface AsistenteProducto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  imagen_url?: string;
  cantidad?: number;
  info_only?: boolean;
}

export interface AsistenteAction {
  type: string;
  id?: number;
  qty?: number;
  nombre?: string;
  precio?: number;
  stock?: number;
  imagen_url?: string;
  url?: string;
  label?: string;
}

export interface AsistentePedidoChip {
  id_pedido: number;
  fecha?: string;
  total?: string;
  estado?: string;
  resumen?: string;
  imagen_url?: string;
}

export interface AsistenteComplaint {
  tipo?: string;
  pedido_id?: number;
  phone?: string;
  mensaje?: string;
}

export interface AsistenteReply {
  success?: boolean;
  reply: string;
  driver?: string;
  products?: AsistenteProducto[];
  suggestions?: string[];
  action?: AsistenteAction | null;
  actions?: AsistenteAction[];
  pedidos?: AsistentePedidoChip[];
  awaiting?: string | null;
  complaint?: AsistenteComplaint | null;
}

@Injectable({ providedIn: 'root' })
export class AsistenteService {
  private http = inject(HttpClient);
  private url = `${environment.apiBaseUrl}/asistente`;

  send(
    message: string,
    offeredIds: number[] = [],
    awaiting: string | null = null,
    complaint: AsistenteComplaint | null = null,
  ): Observable<AsistenteReply> {
    return this.http.post<AsistenteReply>(this.url, {
      message,
      offered_ids: offeredIds,
      awaiting,
      complaint,
    }).pipe(timeout(120000));
  }
}
