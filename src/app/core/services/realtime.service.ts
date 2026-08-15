import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export type RealtimeDriver = 'poll' | 'sse' | 'pusher';

export interface PedidoNovedad {
  id_pedido: number;
  estado?: string;
  total?: number;
  forma_pago?: string;
  cliente_nombre?: string;
  event?: string;
}

/**
 * Avisos del admin. La UI solo escucha Subjects.
 * Hoy: polling (local + prod simple).
 * Luego: cambiar environment.realtime.driver a 'sse' o 'pusher'
 * sin tocar dashboard/shell.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private http = inject(HttpClient);
  private zone = inject(NgZone);

  private pedidoCreated$ = new Subject<PedidoNovedad>();
  private pedidoUpdated$ = new Subject<PedidoNovedad>();
  private stockUpdated$ = new Subject<any>();
  private stockAlertLow$ = new Subject<any>();
  private pendientes$ = new Subject<number>();

  private sseSource?: EventSource;
  private pollTimer?: ReturnType<typeof setInterval>;
  private lastId = 0;
  private started = false;

  onPedidoCreated(): Observable<PedidoNovedad> { return this.pedidoCreated$.asObservable(); }
  onPedidoUpdated(): Observable<PedidoNovedad> { return this.pedidoUpdated$.asObservable(); }
  onStockUpdated(): Observable<any> { return this.stockUpdated$.asObservable(); }
  onStockAlertLow(): Observable<any> { return this.stockAlertLow$.asObservable(); }
  onPendientesCount(): Observable<number> { return this.pendientes$.asObservable(); }

  start(): void {
    if (this.started) return;
    this.started = true;
    const driver = (environment as any).realtime?.driver ?? 'poll';
    if (driver === 'sse') {
      this.connectSSE();
      return;
    }
    // pusher: mismo contrato; por ahora poll (sin SDK extra)
    this.startPolling();
  }

  stop(): void {
    this.started = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    this.disconnect();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  connectSSE(sseUrl?: string) {
    const url = sseUrl || `${environment.apiBaseUrl}/admin/events/stream`;
    try {
      if (this.sseSource) return;
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
    } catch {
      this.startPolling();
    }
  }

  disconnect() {
    if (this.sseSource) {
      this.sseSource.close();
      this.sseSource = undefined;
    }
  }

  private startPolling() {
    const ms = (environment as any).realtime?.intervalMs ?? 12000;
    this.tick(true);
    this.pollTimer = setInterval(() => this.tick(false), ms);
  }

  private tick(baseline: boolean) {
    let hp = new HttpParams();
    if (!baseline && this.lastId > 0) {
      hp = hp.set('after_id', String(this.lastId));
    }
    this.http.get<any>(`${environment.apiBaseUrl}/admin/pedidos/novedades`, { params: hp }).subscribe({
      next: (res) => {
        const maxId = Number(res?.max_id ?? 0);
        const pendientes = Number(res?.pendientes ?? 0);
        this.pendientes$.next(pendientes);

        if (baseline || this.lastId === 0) {
          this.lastId = maxId;
          return;
        }

        const nuevos: PedidoNovedad[] = Array.isArray(res?.nuevos) ? res.nuevos : [];
        for (const n of nuevos) {
          this.pedidoCreated$.next(n);
        }
        if (maxId > this.lastId) this.lastId = maxId;
      },
      error: () => { /* silencio: Laravel caído */ },
    });
  }

  private parse(e: MessageEvent) {
    try { return JSON.parse(e.data); } catch { return e.data; }
  }
}
