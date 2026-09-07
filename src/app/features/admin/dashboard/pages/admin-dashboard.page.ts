import { Component, AfterViewInit, OnDestroy, OnInit, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { AdminPedidosService } from '../../pedidos/services/admin-pedidos.service';
import { AdminProductosService } from '../../productos/services/admin-productos.service';
import { AdminReportesService, FinancieroResumen } from '../../../../core/services/admin-reportes.service';

Chart.register(...registerables);

type StockBajoResp = { data?: Array<{ nombre?: string; stock?: number }>; meta?: { threshold?: number; count?: number } };

@Component({
  standalone: true,
  selector: 'app-admin-dashboard',
  imports: [CommonModule, RouterModule],
  template: `
  <div>
    <h2 class="ed-page-title">Dashboard</h2>
    <p class="ed-page-sub">Las 3 lecturas del negocio: ventas en el tiempo, productos que más facturan y stock por reponer. Haz clic en una tarjeta para el detalle.</p>

    <div class="ed-kpi-grid">
      <button type="button" class="ed-kpi ed-kpi-btn" (click)="goPedidos({ hoy: true })">
        <i class="pi pi-shopping-bag ed-kpi-icon"></i>
        <div class="ed-kpi-label">Pedidos (hoy {{ hoyLabel() }})</div>
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
        <div class="ed-kpi-value">{{ stockCritico().length }}</div>
        <div class="ed-kpi-cta">Ver productos →</div>
      </button>
    </div>

    <div *ngIf="stockCritico().length" class="ed-alert-stock">
      <strong>Alerta de stock:</strong>
      Productos con pocas unidades: {{ lowStockNames() }}
    </div>

    <div *ngIf="!loading() && kpis().pedidosHoy === 0 && kpis().pendientes === 0" class="ed-alert-stock" style="margin-top:1rem;border-color:#E7DAC6;background:#FFFEFA;">
      No hay movimiento de pedidos hoy. Cuando lleguen ventas, aparecerán aquí.
    </div>

    <div class="ed-dash-charts">
      <article class="ed-dash-card">
        <h3>1. Ventas cobradas (30 días)</h3>
        <p>Consulta de ventas por tiempo. Solo pagado / enviado / entregado.</p>
        <div class="ed-dash-canvas-wrap">
          <canvas #ventasCanvas></canvas>
        </div>
      </article>
      <article class="ed-dash-card">
        <h3>Forma de pago</h3>
        <p>Cómo están pagando en el mismo periodo.</p>
        <div class="ed-dash-canvas-wrap ed-dash-canvas-wrap--pie">
          <canvas #pagoCanvas></canvas>
        </div>
      </article>
      <article class="ed-dash-card">
        <h3>2. Productos que más facturan</h3>
        <p>Top 8 por importe cobrado (unidades × precio).</p>
        <div class="ed-dash-canvas-wrap ed-dash-canvas-wrap--h">
          <canvas #topCanvas></canvas>
        </div>
      </article>
      <article class="ed-dash-card">
        <h3>3. Stock bajo (≤10)</h3>
        <p>Unidades restantes. Los de ≤3 salen en la alerta de arriba.</p>
        <div class="ed-dash-canvas-wrap ed-dash-canvas-wrap--h" *ngIf="stockBajo().length; else sinStock">
          <canvas #stockCanvas></canvas>
        </div>
        <ng-template #sinStock>
          <p class="ed-dash-empty">Ningún producto por debajo de 10 unidades.</p>
        </ng-template>
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
      grid-template-columns: 1.3fr .9fr;
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
    .ed-dash-canvas-wrap--h { height: 260px; }
    .ed-dash-empty { margin: 1.5rem 0; color: #6B5B45; font-size: .9rem; }
    @media (max-width: 960px) {
      .ed-dash-charts { grid-template-columns: 1fr; }
    }
    @media (max-width: 576px) {
      .ed-dash-canvas-wrap, .ed-dash-canvas-wrap--h { height: 200px; }
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
  @ViewChild('topCanvas') topCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('stockCanvas') stockCanvas?: ElementRef<HTMLCanvasElement>;

  kpis = signal({ pedidosHoy: 0, pendientes: 0, pagados: 0 });
  stockBajo = signal<Array<{ nombre?: string; stock?: number }>>([]);
  loading = signal(true);
  private chartVentas?: Chart;
  private chartPago?: Chart;
  private chartTop?: Chart;
  private chartStock?: Chart;
  private finPendiente?: FinancieroResumen;
  private viewReady = false;

  stockCritico = computed(() =>
    (this.stockBajo() ?? []).filter((p) => Number(p?.stock ?? 0) <= 3),
  );
  lowStockNames = computed(() =>
    this.stockCritico().map((p) => p?.nombre).filter(Boolean).join(', '),
  );

  ngOnInit() {
    this.refrescarTodo();
    this.realtime.onPedidoCreated().subscribe(() => this.refrescarKPIs());
    this.realtime.onPedidoUpdated().subscribe(() => this.refrescarKPIs());
    this.realtime.onStockAlertLow().subscribe(() => this.cargarStock());
  }

  refrescarTodo() {
    this.loading.set(true);
    this.pedidos.list({ fecha_desde: this.hoyISO(), fecha_hasta: this.hoyISO() }).subscribe({
      next: (res: any) => this.kpis.update((v) => ({ ...v, pedidosHoy: res?.meta?.total ?? 0 })),
      complete: () => this.loading.set(false),
    });
    this.refrescarKPIs();
    this.cargarStock();
    this.reportes.financiero(this.rango30()).subscribe({
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
    this.pintarStock();
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
    this.router.navigate(['/panel-ed-k7m2/pedidos'], { queryParams });
  }

  goProductosStock() {
    this.router.navigate(['/panel-ed-k7m2/productos'], { queryParams: { stock_bajo: 1 } });
  }

  hoyISO() {
    const p = (n: number) => String(n).padStart(2, '0');
    const d = new Date();
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  hoyLabel() {
    const [y, m, d] = this.hoyISO().split('-');
    return `${d}/${m}`;
  }

  private rango30() {
    const p = (n: number) => String(n).padStart(2, '0');
    const ymd = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - 29);
    return { desde: ymd(desde), hasta: ymd(hasta) };
  }

  ngOnDestroy() {
    this.chartVentas?.destroy();
    this.chartPago?.destroy();
    this.chartTop?.destroy();
    this.chartStock?.destroy();
  }

  private cargarStock() {
    this.productos.stockBajo(10).subscribe((res: StockBajoResp) => {
      this.stockBajo.set(res?.data ?? []);
      queueMicrotask(() => this.pintarStock());
    });
  }

  private pintarStock() {
    const ink = '#2D2418';
    const rows = (this.stockBajo() ?? []).slice(0, 8);
    if (!this.stockCanvas?.nativeElement || rows.length === 0) {
      this.chartStock?.destroy();
      this.chartStock = undefined;
      return;
    }
    this.chartStock?.destroy();
    this.chartStock = new Chart(this.stockCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: rows.map((p) => this.corto(p.nombre, 22)),
        datasets: [{
          label: 'Unidades',
          data: rows.map((p) => Number(p.stock ?? 0)),
          backgroundColor: rows.map((p) => Number(p.stock ?? 0) <= 3 ? '#8B1E1E' : '#C9A227'),
          borderRadius: 6,
          maxBarThickness: 16,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1, color: ink }, grid: { color: '#EFE6D6' } },
          y: { ticks: { color: ink, font: { size: 11 } }, grid: { display: false } },
        },
      },
    });
  }

  private pintarGraficos(fin: FinancieroResumen) {
    const gold = '#C9A227';
    const ink = '#2D2418';
    const dias = fin?.por_dia ?? [];
    const pagos = fin?.por_pago ?? [];
    const tops = (fin?.top_productos ?? []).slice(0, 8);

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
            tooltip: { callbacks: { label: (c: { raw?: unknown }) => ` S/ ${Number(c.raw || 0).toFixed(2)}` } },
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
            tooltip: { callbacks: { label: (c: { raw?: unknown }) => ` S/ ${Number(c.raw || 0).toFixed(2)}` } },
          },
        },
      });
    }

    if (this.topCanvas?.nativeElement) {
      this.chartTop?.destroy();
      this.chartTop = new Chart(this.topCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: tops.map((p) => this.corto(p.nombre, 22)),
          datasets: [{
            label: 'Importe (S/)',
            data: tops.map((p) => Number(p.importe || 0)),
            backgroundColor: '#1B5E38',
            borderRadius: 6,
            maxBarThickness: 16,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (c: { raw?: unknown; dataIndex: number }) => {
                  const p = tops[c.dataIndex];
                  return ` S/ ${Number(c.raw || 0).toFixed(2)} · ${p?.unidades ?? 0} und.`;
                },
              },
            },
          },
          scales: {
            x: { beginAtZero: true, ticks: { color: ink }, grid: { color: '#EFE6D6' } },
            y: { ticks: { color: ink, font: { size: 11 } }, grid: { display: false } },
          },
        },
      });
    }

    this.pintarStock();
  }

  private corto(s: string | undefined, n: number) {
    const t = (s || '').trim();
    return t.length > n ? t.slice(0, n - 1) + '…' : t;
  }
}
