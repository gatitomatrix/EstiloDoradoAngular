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
}

export interface AsistenteAction {
  type: string;
  id?: number;
  qty?: number;
  nombre?: string;
  precio?: number;
  stock?: number;
  imagen_url?: string;
}

export interface AsistenteReply {
  success?: boolean;
  reply: string;
  driver?: string;
  products?: AsistenteProducto[];
  suggestions?: string[];
  action?: AsistenteAction | null;
}

@Injectable({ providedIn: 'root' })
export class AsistenteService {
  private http = inject(HttpClient);
  private url = `${environment.apiBaseUrl}/asistente`;

  send(message: string, offeredIds: number[] = []): Observable<AsistenteReply> {
    return this.http.post<AsistenteReply>(this.url, {
      message,
      offered_ids: offeredIds,
    }).pipe(timeout(120000));
  }
}
