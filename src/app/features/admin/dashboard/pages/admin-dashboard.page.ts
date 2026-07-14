import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { AdminPedidosService } from '../../pedidos/services/admin-pedidos.service';
import { AdminProductosService } from '../../productos/services/admin-productos.service';

type StockBajoResp = { data?: Array<{ nombre?: string }>; meta?: { threshold?: number; count?: number } };

@Component({
  standalone: true,
  selector: 'app-admin-dashboard',
  imports: [CommonModule],
  template: `
  <div class="p-3">
    <h2 class="mb-3">Dashboard</h2>

    <div class="row g-3 mb-3">
      <div class="col-sm-6 col-lg-3">
        <div class="card p-3">
          <h6 class="text-muted">Pedidos (hoy)</h6>
          <div class="fs-3">{{kpis().pedidosHoy}}</div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="card p-3">
          <h6 class="text-muted">Pendientes</h6>
          <div class="fs-3">{{kpis().pendientes}}</div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="card p-3">
          <h6 class="text-muted">Pagados</h6>
          <div class="fs-3">{{kpis().pagados}}</div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="card p-3">
          <h6 class="text-muted">Stock bajo (≤3)</h6>
          <div class="fs-3">{{stockBajo().length}}</div>
        </div>
      </div>
    </div>

    <div *ngIf="stockBajo().length" class="alert alert-warning">
      <strong>Alerta:</strong>
      Productos con stock bajo: {{ lowStockNames() }}
    </div>
  </div>
  `
})
export class AdminDashboardPage implements OnInit {
  private pedidos = inject(AdminPedidosService);
  private productos = inject(AdminProductosService);
  private realtime = inject(RealtimeService);

  kpis = signal({ pedidosHoy: 0, pendientes: 0, pagados: 0 });
  stockBajo = signal<any[]>([]);

  lowStockNames = computed(() =>
    (this.stockBajo() ?? []).map(p => p?.nombre).filter(Boolean).join(', ')
  );

  ngOnInit() {
    // KPIs rápidos desde listing (puedes cambiar por endpoints dedicados)
    this.pedidos.list({ fecha_desde: this.hoyISO(), fecha_hasta: this.hoyISO() })
      .subscribe((res: any) => this.kpis.update(v => ({ ...v, pedidosHoy: res?.meta?.total ?? 0 })));

    this.pedidos.list({ estado: 'pendiente' })
      .subscribe((res: any) => this.kpis.update(v => ({ ...v, pendientes: res?.meta?.total ?? 0 })));

    this.pedidos.list({ estado: 'pagado' })
      .subscribe((res: any) => this.kpis.update(v => ({ ...v, pagados: res?.meta?.total ?? 0 })));

    // 🔧 Stock bajo (tipado local para evitar "implicit any")
    this.productos.stockBajo(3).subscribe((res: StockBajoResp) => this.stockBajo.set(res?.data ?? []));

    // Realtime (conecta SSE si está disponible en backend)
    // this.realtime.connectSSE();
    this.realtime.onPedidoCreated().subscribe(() => this.refrescarKPIs());
    this.realtime.onPedidoUpdated().subscribe(() => this.refrescarKPIs());
    this.realtime.onStockAlertLow().subscribe(() => {
      this.productos.stockBajo(3).subscribe((r: StockBajoResp) => this.stockBajo.set(r?.data ?? []));
    });
  }

  refrescarKPIs() {
    this.pedidos.list({ estado: 'pendiente' })
      .subscribe((res: any) => this.kpis.update(v => ({ ...v, pendientes: res?.meta?.total ?? 0 })));
    this.pedidos.list({ estado: 'pagado' })
      .subscribe((res: any) => this.kpis.update(v => ({ ...v, pagados: res?.meta?.total ?? 0 })));
  }

  hoyISO() { const d = new Date(); return d.toISOString().split('T')[0]; }
}
