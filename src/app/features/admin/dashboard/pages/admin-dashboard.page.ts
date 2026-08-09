import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { AdminPedidosService } from '../../pedidos/services/admin-pedidos.service';
import { AdminProductosService } from '../../productos/services/admin-productos.service';

type StockBajoResp = { data?: Array<{ nombre?: string }>; meta?: { threshold?: number; count?: number } };

@Component({
  standalone: true,
  selector: 'app-admin-dashboard',
  imports: [CommonModule, RouterModule],
  template: `
  <div>
    <h2 class="ed-page-title">Dashboard</h2>
    <p class="ed-page-sub">Resumen del día. Haz clic en una tarjeta para ver el detalle.</p>

    <div class="ed-kpi-grid">
      <button type="button" class="ed-kpi ed-kpi-btn" (click)="goPedidos({ hoy: true })">
        <i class="pi pi-shopping-bag ed-kpi-icon"></i>
        <div class="ed-kpi-label">Pedidos (hoy)</div>
        <div class="ed-kpi-value">{{ kpis().pedidosHoy }}</div>
        <div class="ed-kpi-cta">Ver pedidos de hoy →</div>
      </button>
      <button type="button" class="ed-kpi ed-kpi-btn" (click)="goPedidos({ estado: 'pendiente' })">
        <i class="pi pi-clock ed-kpi-icon"></i>
        <div class="ed-kpi-label">Pendientes</div>
        <div class="ed-kpi-value">{{ kpis().pendientes }}</div>
        <div class="ed-kpi-cta">Filtrar pendientes →</div>
      </button>
      <button type="button" class="ed-kpi ed-kpi-btn" (click)="goPedidos({ estado: 'pagado' })">
        <i class="pi pi-check-circle ed-kpi-icon"></i>
        <div class="ed-kpi-label">Pagados</div>
        <div class="ed-kpi-value">{{ kpis().pagados }}</div>
        <div class="ed-kpi-cta">Filtrar pagados →</div>
      </button>
      <button type="button" class="ed-kpi ed-kpi-btn" (click)="goProductosStock()">
        <i class="pi pi-exclamation-triangle ed-kpi-icon"></i>
        <div class="ed-kpi-label">Stock bajo (≤3)</div>
        <div class="ed-kpi-value">{{ stockBajo().length }}</div>
        <div class="ed-kpi-cta">Ver productos →</div>
      </button>
    </div>

    <div *ngIf="stockBajo().length" class="ed-alert-stock">
      <strong>Alerta de stock:</strong>
      Productos con pocas unidades: {{ lowStockNames() }}
    </div>

    <div *ngIf="!loading() && kpis().pedidosHoy === 0 && kpis().pendientes === 0" class="ed-alert-stock" style="margin-top:1rem;border-color:#E7DAC6;background:#FFFEFA;">
      No hay movimiento de pedidos hoy. Cuando lleguen ventas, aparecerán aquí.
    </div>
  </div>
  `,
  styles: [`
    .ed-kpi-btn {
      width: 100%;
      text-align: left;
      cursor: pointer;
      font: inherit;
      transition: transform .12s ease, box-shadow .12s ease;
    }
    .ed-kpi-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px rgba(32,22,11,.12);
    }
    .ed-kpi-cta {
      margin-top: .45rem;
      font-size: .75rem;
      font-weight: 700;
      color: #A6822A;
    }
  `],
})
export class AdminDashboardPage implements OnInit {
  private pedidos = inject(AdminPedidosService);
  private productos = inject(AdminProductosService);
  private realtime = inject(RealtimeService);
  private router = inject(Router);

  kpis = signal({ pedidosHoy: 0, pendientes: 0, pagados: 0 });
  stockBajo = signal<any[]>([]);
  loading = signal(true);

  lowStockNames = computed(() =>
    (this.stockBajo() ?? []).map((p) => p?.nombre).filter(Boolean).join(', '),
  );

  ngOnInit() {
    this.refrescarTodo();
    this.realtime.onPedidoCreated().subscribe(() => this.refrescarKPIs());
    this.realtime.onPedidoUpdated().subscribe(() => this.refrescarKPIs());
    this.realtime.onStockAlertLow().subscribe(() => {
      this.productos.stockBajo(3).subscribe((r: StockBajoResp) => this.stockBajo.set(r?.data ?? []));
    });
  }

  refrescarTodo() {
    this.loading.set(true);
    this.pedidos.list({ fecha_desde: this.hoyISO(), fecha_hasta: this.hoyISO() }).subscribe({
      next: (res: any) => this.kpis.update((v) => ({ ...v, pedidosHoy: res?.meta?.total ?? 0 })),
      complete: () => this.loading.set(false),
    });
    this.refrescarKPIs();
    this.productos.stockBajo(3).subscribe((res: StockBajoResp) => this.stockBajo.set(res?.data ?? []));
  }

  refrescarKPIs() {
    this.pedidos.list({ estado: 'pendiente' }).subscribe((res: any) =>
      this.kpis.update((v) => ({ ...v, pendientes: res?.meta?.total ?? 0 })),
    );
    this.pedidos.list({ estado: 'pagado' }).subscribe((res: any) =>
      this.kpis.update((v) => ({ ...v, pagados: res?.meta?.total ?? 0 })),
    );
  }

  goPedidos(opts: { estado?: string; hoy?: boolean }) {
    const queryParams: any = {};
    if (opts.estado) queryParams.estado = opts.estado;
    if (opts.hoy) {
      queryParams.fecha_desde = this.hoyISO();
      queryParams.fecha_hasta = this.hoyISO();
    }
    this.router.navigate(['/admin/pedidos'], { queryParams });
  }

  goProductosStock() {
    this.router.navigate(['/admin/productos'], { queryParams: { stock_bajo: 1 } });
  }

  hoyISO() {
    return new Date().toISOString().split('T')[0];
  }
}
