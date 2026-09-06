import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Tipos que ya usas para factura/boleta
import { InvoiceData, BoletaData } from '../../core/state/payment-state.service';

export interface ConfirmarItemReq {
  id_producto: number;
  cantidad: number;
}

export type DocTipo = 'FA' | 'BO';

// ✅ Una sola interfaz; culqi_id opcional
export interface ConfirmarReq {
  forma_pago: 'tarjeta' | 'yape' | 'efectivo';
  culqi_id?: string;                        // requerido SOLO si no es efectivo
  direccion_entrega?: string | null;
  envio_tipo?: 'AGENCIA' | 'DOMICILIO';
  ubigeo?: { departamento?: string; provincia?: string; distrito?: string };
  items: ConfirmarItemReq[];
  comprobante?: DocTipo;                    // solo aplica si no es efectivo
  factura?: InvoiceData;
  boleta?: BoletaData | null;
}

export interface PedidoListItem {
  id_pedido: number;
  fecha_pedido: string;
  estado: string;
  total: number;
  forma_pago: 'tarjeta' | 'yape' | 'efectivo';
  direccion_entrega: string | null;
  producto_label: string;         // << nombre del producto (+N)
  comprobante_tipo: 'FA' | 'BO' | 'EF' | null;
  comprobante_serie: string | null;
  comprobante_numero: number | null;
  friendly: string | null;
}

interface ConfirmarBase {
  direccion_entrega?: string | null;
  items: ConfirmarItemReq[];
}

/** ✅ Unión:
 *  - Culqi (tarjeta/yape) requiere culqi_id y puede enviar comprobante/boleta/factura
 *  - Efectivo no lleva culqi_id ni comprobantes
 */
export interface ComprobanteOut {
  tipo: DocTipo;
  serie: string;
  numero: number;
  pdf: string | null;
  xml: string | null;
  cdr: string | null;
}

export interface ConfirmarRes {
  id_pedido: number;
  fecha_pedido: string;
  estado: string;
  total: number;
  forma_pago: 'tarjeta' | 'yape' | 'efectivo';
  direccion_entrega: string | null;
  sunat_pdf: string | null;
  sunat_xml: string | null;
  sunat_cdr: string | null;
  comprobante: ComprobanteOut | null;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private API = environment.apiBaseUrl;

  confirmar(body: ConfirmarReq): Observable<ConfirmarRes> {
    return this.http.post<ConfirmarRes>(`${this.API}/pedidos/confirmar`, body);
  }

  getById(id: number): Observable<
    ConfirmarRes & {
      detalles: { id_producto: number; producto?: string; cantidad: number; precio_unitario: number; subtotal: number }[];
    }
  > {
    return this.http.get<
      ConfirmarRes & { detalles: any[] }
    >(`${this.API}/pedidos/${id}`);
  }

  listMine() {
    return this.http.get<PedidoListItem[]>(`${this.API}/pedidos`);
  }
}
