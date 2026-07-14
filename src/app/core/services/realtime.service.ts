import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * RealtimeService
 * - Modo A (recomendado futuro): SSE => /api/admin/events/stream (server-sent events)
 * - Modo B (placeholder actual): Subjects locales para no romper compilación
 *
 * Eventos esperados:
 *  - pedido.created / pedido.updated => canal pedidos
 *  - stock.updated / stock.alert:low => canal stock
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  // Subjects locales (no rompen si aún no hay SSE)
  private pedidoCreated$ = new Subject<any>();
  private pedidoUpdated$ = new Subject<any>();
  private stockUpdated$ = new Subject<any>();
  private stockAlertLow$ = new Subject<any>();

  private sseSource?: EventSource;

  constructor(private zone: NgZone) {}

  /**
   * Conecta a SSE si existe el endpoint. Si no existe, no hace nada y seguimos con Subjects locales.
   * Cambiado: default a URL ABSOLUTA del backend para evitar 404 en :4200.
   */
  connectSSE(sseUrl?: string) {
    const url = sseUrl || `${environment.apiBaseUrl}/admin/events/stream`;

    try {
      if (this.sseSource) return; // ya conectado
      this.sseSource = new EventSource(url, { withCredentials: true });

      this.sseSource.addEventListener('pedido.created', (e: any) => {
        this.zone.run(() => this.pedidoCreated$.next(this.parse(e)));
      });
      this.sseSource.addEventListener('pedido.updated', (e: any) => {
        this.zone.run(() => this.pedidoUpdated$.next(this.parse(e)));
      });
      this.sseSource.addEventListener('stock.updated', (e: any) => {
        this.zone.run(() => this.stockUpdated$.next(this.parse(e)));
      });
      this.sseSource.addEventListener('stock.alert:low', (e: any) => {
        this.zone.run(() => this.stockAlertLow$.next(this.parse(e)));
      });

      this.sseSource.onmessage = () => { /* opcional */ };
      this.sseSource.onerror = () => { /* auto-retry por EventSource */ };
    } catch {
      // Silencio: si no hay SSE seguimos con Subjects
    }
  }

  disconnect() {
    if (this.sseSource) {
      this.sseSource.close();
      this.sseSource = undefined;
    }
  }

  onPedidoCreated(): Observable<any>   { return this.pedidoCreated$.asObservable(); }
  onPedidoUpdated(): Observable<any>   { return this.pedidoUpdated$.asObservable(); }
  onStockUpdated(): Observable<any>    { return this.stockUpdated$.asObservable(); }
  onStockAlertLow(): Observable<any>   { return this.stockAlertLow$.asObservable(); }

  /** Para pruebas locales sin SSE, puedes disparar eventos manualmente: */
  debugEmitPedidoCreated(payload: any) { this.pedidoCreated$.next(payload); }
  debugEmitPedidoUpdated(payload: any) { this.pedidoUpdated$.next(payload); }
  debugEmitStockUpdated(payload: any)  { this.stockUpdated$.next(payload); }
  debugEmitStockAlertLow(payload: any) { this.stockAlertLow$.next(payload); }

  private parse(e: MessageEvent) {
    try { return JSON.parse(e.data); } catch { return e.data; }
  }
}
