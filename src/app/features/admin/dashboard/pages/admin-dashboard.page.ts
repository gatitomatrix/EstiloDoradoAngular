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
  <div>
    <h2 class="ed-page-title">Dashboard</h2>
    <p class="ed-page-sub">Resumen del día y alertas de inventario</p>

    <div class="ed-kpi-grid">
      <div class="ed-kpi">
        <i class="pi pi-shopping-bag ed-kpi-icon"></i>
        <div class="ed-kpi-label">Pedidos (hoy)</div>
        <div class="ed-kpi-value">{{ kpis().pedidosHoy }}</div>
      </div>
      <div class="ed-kpi">
        <i class="pi pi-clock ed-kpi-icon"></i>
        <div class="ed-kpi-label">Pendientes</div>
        <div class="ed-kpi-value">{{ kpis().pendientes }}</div>
      </div>
      <div class="ed-kpi">
        <i class="pi pi-check-circle ed-kpi-icon"></i>
        <div class="ed-kpi-label">Pagados</div>
        <div class="ed-kpi-value">{{ kpis().pagados }}</div>
      </div>
      <div class="ed-kpi">
        <i class="pi pi-exclamation-triangle ed-kpi-icon"></i>
        <div class="ed-kpi-label">Stock bajo (≤3)</div>
        <div class="ed-kpi-value">{{ stockBajo().length }}</div>
      </div>
    </div>

    <div *ngIf="stockBajo().length" class="ed-alert-stock">
      <strong>Alerta de stock:</strong>
      Productos con pocas unidades: {{ lowStockNames() }}
    </div>
  </div>
  `,
})
export class AdminDashboardPage implements OnInit {
  private pedidos = inject(AdminPedidosService);
  private productos = inject(AdminProductosService);
  private realtime = inject(RealtimeService);

  kpis = signal({ pedidosHoy: 0, pendientes: 0, pagados: 0 });
  stockBajo = signal<any[]>([]);

  lowStockNames = computed(() =>
    (this.stockBajo() ?? []).map((p) => p?.nombre).filter(Boolean).join(', '),
  );

  ngOnInit() {
    this.pedidos
      .list({ fecha_desde: this.hoyISO(), fecha_hasta: this.hoyISO() })
      .subscribe((res: any) =>
        this.kpis.update((v) => ({ ...v, pedidosHoy: res?.meta?.total ?? 0 })),
      );

    this.pedidos
      .list({ estado: 'pendiente' })
      .subscribe((res: any) =>
        this.kpis.update((v) => ({ ...v, pendientes: res?.meta?.total ?? 0 })),
      );

    this.pedidos
      .list({ estado: 'pagado' })
      .subscribe((res: any) =>
        this.kpis.update((v) => ({ ...v, pagados: res?.meta?.total ?? 0 })),
      );

    this.productos
      .stockBajo(3)
      .subscribe((res: StockBajoResp) => this.stockBajo.set(res?.data ?? []));

    this.realtime.onPedidoCreated().subscribe(() => this.refrescarKPIs());
    this.realtime.onPedidoUpdated().subscribe(() => this.refrescarKPIs());
    this.realtime.onStockAlertLow().subscribe(() => {
      this.productos
        .stockBajo(3)
        .subscribe((r: StockBajoResp) => this.stockBajo.set(r?.data ?? []));
    });
  }

  refrescarKPIs() {
    this.pedidos
      .list({ estado: 'pendiente' })
      .subscribe((res: any) =>
        this.kpis.update((v) => ({ ...v, pendientes: res?.meta?.total ?? 0 })),
      );
    this.pedidos
      .list({ estado: 'pagado' })
      .subscribe((res: any) =>
        this.kpis.update((v) => ({ ...v, pagados: res?.meta?.total ?? 0 })),
      );
  }

  hoyISO() {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }
}
