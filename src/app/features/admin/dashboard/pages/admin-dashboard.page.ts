import { Component, AfterViewInit, OnDestroy, OnInit, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { AdminPedidosService } from '../../pedidos/services/admin-pedidos.service';
import { AdminProductosService } from '../../productos/services/admin-productos.service';
import { AdminReportesService, FinancieroResumen } from '../../../../core/services/admin-reportes.service';

Chart.register(...registerables);

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

    <div class="ed-dash-charts">
      <article class="ed-dash-card">
        <h3>Ventas cobradas (30 días)</h3>
        <p>Solo pedidos pagado / enviado / entregado. Clic en Reportes para el detalle.</p>
        <div class="ed-dash-canvas-wrap">
          <canvas #ventasCanvas></canvas>
        </div>
      </article>
      <article class="ed-dash-card">
        <h3>Por forma de pago</h3>
        <p>Cómo están pagando en el mismo periodo.</p>
        <div class="ed-dash-canvas-wrap ed-dash-canvas-wrap--pie">
          <canvas #pagoCanvas></canvas>
        </div>
      </article>
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
    .ed-dash-charts {
      display: grid;
      grid-template-columns: 1.4fr .9fr;
      gap: 1.1rem;
      margin-top: 1.25rem;
    }
    .ed-dash-card {
      background: #FFFEFA;
      border: 1px solid #E7DAC6;
      border-radius: 16px;
      padding: 1rem 1.1rem 1.2rem;
      box-shadow: 0 8px 24px rgba(32,22,11,.06);
    }
    .ed-dash-card h3 {
      margin: 0;
      font-size: 1.05rem;
      color: #2D2418;
    }
    .ed-dash-card p {
      margin: .25rem 0 .75rem;
      font-size: .82rem;
      color: #6B5B45;
    }
    .ed-dash-canvas-wrap { position: relative; height: 220px; }
    .ed-dash-canvas-wrap--pie { height: 220px; max-width: 280px; margin: 0 auto; }
    @media (max-width: 960px) {
      .ed-dash-charts { grid-template-columns: 1fr; }
    }
  `],
})
export class AdminDashboardPage implements OnInit, AfterViewInit, OnDestroy {
  private pedidos = inject(AdminPedidosService);
  private productos = inject(AdminProductosService);
  private reportes = inject(AdminReportesService);
  private realtime = inject(RealtimeService);
  private router = inject(Router);

  @ViewChild('ventasCanvas') ventasCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('pagoCanvas') pagoCanvas?: ElementRef<HTMLCanvasElement>;

  kpis = signal({ pedidosHoy: 0, pendientes: 0, pagados: 0 });
  stockBajo = signal<any[]>([]);
  loading = signal(true);
  private chartVentas?: Chart;
  private chartPago?: Chart;
  private finPendiente?: FinancieroResumen;
  private viewReady = false;

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
    this.reportes.financiero(30).subscribe({
      next: (fin) => {
        this.finPendiente = fin;
        if (this.viewReady) this.pintarGraficos(fin);
      },
      error: () => {},
    });
  }

  ngAfterViewInit() {
    this.viewReady = true;
    if (this.finPendiente) this.pintarGraficos(this.finPendiente);
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

  ngOnDestroy() {
    this.chartVentas?.destroy();
    this.chartPago?.destroy();
  }

  private pintarGraficos(fin: FinancieroResumen) {
    const gold = '#C9A227';
    const ink = '#2D2418';
    const dias = fin?.por_dia ?? [];
    const pagos = fin?.por_pago ?? [];

    if (this.ventasCanvas?.nativeElement) {
      this.chartVentas?.destroy();
      this.chartVentas = new Chart(this.ventasCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: dias.map((d) => d.fecha?.slice(5) || ''),
          datasets: [{
            label: 'Ingresos (S/)',
            data: dias.map((d) => Number(d.total || 0)),
            backgroundColor: gold,
            borderRadius: 6,
            maxBarThickness: 18,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (c) => ` S/ ${Number(c.raw || 0).toFixed(2)}` } },
          },
          scales: {
            x: { ticks: { maxRotation: 0, color: ink, font: { size: 10 } }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { color: ink }, grid: { color: '#EFE6D6' } },
          },
        },
      });
    }

    if (this.pagoCanvas?.nativeElement) {
      this.chartPago?.destroy();
      const palette = ['#1B5E38', '#C9A227', '#8B1E1E', '#4A3B2A', '#6B8F71'];
      this.chartPago = new Chart(this.pagoCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels: pagos.map((p) => p.metodo || 'otro'),
          datasets: [{
            data: pagos.map((p) => Number(p.total || 0)),
            backgroundColor: pagos.map((_, i) => palette[i % palette.length]),
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: ink, boxWidth: 12 } },
            tooltip: { callbacks: { label: (c) => ` S/ ${Number(c.raw || 0).toFixed(2)}` } },
          },
        },
      });
    }
  }
}
