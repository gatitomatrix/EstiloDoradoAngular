import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminReportesService, FinancieroResumen, RangoReporte } from '../../../../core/services/admin-reportes.service';

type ReportKey = 'clientes' | 'productos' | 'pedidos' | 'inventario' | 'financiero' | 'stock_bajo';
type ReportExt = 'csv' | 'xlsx' | 'pdf';
type Atajo = 7 | 30 | 90 | 'mes';

interface ReportGroup {
  key: ReportKey;
  label: string;
  desc: string;
  icon: string;
  accent: string;
}

@Component({
  standalone: true,
  selector: 'app-reportes',
  imports: [CommonModule, FormsModule],
  template: `
  <div class="ed-rep">
    <header class="ed-rep-head">
      <div>
        <h2 class="ed-page-title">Reportes</h2>
        <p class="ed-page-sub">
          Descarga listados del negocio en CSV, Excel (XLSX) o PDF
          para control de clientes, inventario, ventas y respaldo de información.
        </p>
      </div>
    </header>

    <section class="ed-fin">
      <div class="ed-fin-bar">
        <div>
          <h3 class="ed-fin-title">Resumen financiero</h3>
          <p class="ed-fin-sub">
            Solo pedidos cobrados (pagado, enviado o entregado).
            <strong *ngIf="fin()"> {{ etiquetaRango() }}</strong>
          </p>
        </div>
        <div class="ed-fin-periods" role="group" aria-label="Periodo">
          <button type="button" *ngFor="let d of atajos" class="ed-chip"
            [class.ed-chip--on]="atajo() === d" (click)="setAtajo(d)">
            {{ d === 'mes' ? 'Este mes' : d + ' días' }}
          </button>
        </div>
      </div>
      <form class="ed-fin-range" (ngSubmit)="aplicarRango()">
        <label class="ed-fin-date">
          <span>Desde</span>
          <input type="date" [(ngModel)]="desde" name="desde">
        </label>
        <label class="ed-fin-date">
          <span>Hasta</span>
          <input type="date" [(ngModel)]="hasta" name="hasta">
        </label>
        <button type="submit" class="ed-chip ed-chip--on">Aplicar</button>
      </form>

      <p class="ed-fin-load" *ngIf="finLoading()">Cargando cifras…</p>
      <p class="ed-fin-err" *ngIf="finErr()">{{ finErr() }}</p>

      <ng-container *ngIf="fin() as f">
        <div class="ed-kpi">
          <article class="ed-kpi-card">
            <span class="ed-kpi-label">Ingresos</span>
            <strong>S/ {{ f.kpis.ingresos | number:'1.2-2' }}</strong>
          </article>
          <article class="ed-kpi-card">
            <span class="ed-kpi-label">Pedidos cobrados</span>
            <strong>{{ f.kpis.pedidos_cobrados }}</strong>
          </article>
          <article class="ed-kpi-card">
            <span class="ed-kpi-label">Ticket promedio</span>
            <strong>S/ {{ f.kpis.ticket_promedio | number:'1.2-2' }}</strong>
          </article>
          <article class="ed-kpi-card">
            <span class="ed-kpi-label">Margen estimado</span>
            <strong>S/ {{ f.kpis.margen_estimado | number:'1.2-2' }}</strong>
            <small>venta − costo de compra</small>
          </article>
        </div>
        <p class="ed-fin-meta">
          Pendientes: {{ f.kpis.pendientes }}
          · Cancelados: {{ f.kpis.cancelados }}
          (S/ {{ f.kpis.monto_cancelado | number:'1.2-2' }})
          · Costo estimado S/ {{ f.kpis.costo_estimado | number:'1.2-2' }}
        </p>

        <div class="ed-charts">
          <div class="ed-chart">
            <div class="ed-chart-head">
              <h4>Ventas por día</h4>
              <ng-container *ngTemplateOutlet="miniDl; context: { $implicit: 'ventas_dia' }"></ng-container>
            </div>
            <div class="ed-bars" *ngIf="chartDays().length; else emptyChart">
              <div class="ed-bar-col" *ngFor="let b of chartDays()" [title]="b.fecha + ' · S/ ' + b.total">
                <div class="ed-bar" [style.height.%]="b.pct"></div>
                <span class="ed-bar-lbl">{{ b.label }}</span>
              </div>
            </div>
          </div>
          <div class="ed-chart">
            <div class="ed-chart-head">
              <h4>Por forma de pago</h4>
              <ng-container *ngTemplateOutlet="miniDl; context: { $implicit: 'forma_pago' }"></ng-container>
            </div>
            <div class="ed-pay" *ngIf="f.por_pago.length; else emptyChart">
              <div class="ed-pay-row" *ngFor="let p of f.por_pago">
                <span class="ed-pay-name">{{ p.metodo }}</span>
                <div class="ed-pay-track">
                  <div class="ed-pay-fill" [style.width.%]="pagoPct(p.total)"></div>
                </div>
                <span class="ed-pay-n">S/ {{ p.total | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="ed-chart ed-chart--full" *ngIf="f.top_productos.length">
          <div class="ed-chart-head">
            <h4>Productos que más facturaron</h4>
            <ng-container *ngTemplateOutlet="miniDl; context: { $implicit: 'top_productos' }"></ng-container>
          </div>
          <div class="ed-pay">
            <div class="ed-pay-row" *ngFor="let p of f.top_productos">
              <span class="ed-pay-name">{{ p.nombre }} <small>×{{ p.unidades }}</small></span>
              <div class="ed-pay-track">
                <div class="ed-pay-fill ed-pay-fill--gold" [style.width.%]="topPct(p.importe)"></div>
              </div>
              <span class="ed-pay-n">S/ {{ p.importe | number:'1.2-2' }}</span>
            </div>
          </div>
        </div>
      </ng-container>
      <ng-template #emptyChart>
        <p class="ed-fin-empty">Aún no hay ventas cobradas en este periodo.</p>
      </ng-template>
      <ng-template #miniDl let-key>
        <div class="ed-mini-dl" role="group">
          <button type="button" (click)="dlSerie(key, 'csv')" [disabled]="busyKey() === key + ':csv'">CSV</button>
          <button type="button" (click)="dlSerie(key, 'xlsx')" [disabled]="busyKey() === key + ':xlsx'">Excel</button>
          <button type="button" (click)="dlSerie(key, 'pdf')" [disabled]="busyKey() === key + ':pdf'">PDF</button>
        </div>
      </ng-template>
    </section>

    <h3 class="ed-dl-title">Descargar listados</h3>

    <div class="ed-rep-grid">
      <article class="ed-rep-card" *ngFor="let g of groups" [style.--accent]="g.accent">
        <div class="ed-rep-card-top">
          <span class="ed-rep-icon" aria-hidden="true">{{ g.icon }}</span>
          <div>
            <h3 class="ed-rep-card-title">{{ g.label }}</h3>
            <p class="ed-rep-card-desc">{{ g.desc }}</p>
          </div>
        </div>

        <div class="ed-rep-actions" role="group" [attr.aria-label]="'Formatos de ' + g.label">
          <button
            type="button"
            class="ed-fmt ed-fmt--csv"
            [disabled]="busyKey() === g.key + ':csv'"
            (click)="dl(g.key, 'csv')"
          >
            <span class="ed-fmt-label">CSV</span>
            <span class="ed-fmt-hint">Excel / hojas</span>
            <span class="ed-fmt-spin" *ngIf="busyKey() === g.key + ':csv'">…</span>
          </button>

          <button
            type="button"
            class="ed-fmt ed-fmt--xlsx"
            [disabled]="busyKey() === g.key + ':xlsx'"
            (click)="dl(g.key, 'xlsx')"
          >
            <span class="ed-fmt-label">Excel</span>
            <span class="ed-fmt-hint">.xlsx</span>
            <span class="ed-fmt-spin" *ngIf="busyKey() === g.key + ':xlsx'">…</span>
          </button>

          <button
            type="button"
            class="ed-fmt ed-fmt--pdf"
            [disabled]="busyKey() === g.key + ':pdf'"
            (click)="dl(g.key, 'pdf')"
          >
            <span class="ed-fmt-label">PDF</span>
            <span class="ed-fmt-hint">Imprimible</span>
            <span class="ed-fmt-spin" *ngIf="busyKey() === g.key + ':pdf'">…</span>
          </button>
        </div>
      </article>
    </div>

    <div
      class="ed-rep-toast"
      *ngIf="msg()"
      [class.ed-rep-toast--ok]="msgOk()"
      [class.ed-rep-toast--err]="!msgOk()"
      role="status"
    >
      {{ msg() }}
    </div>
  </div>
  `,
  styles: [`
    .ed-rep { max-width: 1100px; }

    .ed-rep-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.1rem;
    }

    .ed-rep-card {
      background: #FFFEFA;
      border: 1px solid #E7DAC6;
      border-radius: 1.05rem;
      padding: 1.15rem 1.2rem 1.2rem;
      box-shadow: 0 10px 28px rgba(32, 22, 11, 0.07);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      position: relative;
      overflow: hidden;
    }
    .ed-rep-card::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 4px;
      background: var(--accent, #D4AF37);
    }

    .ed-rep-card-top {
      display: flex;
      gap: .85rem;
      align-items: flex-start;
    }
    .ed-rep-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: .75rem;
      display: grid;
      place-items: center;
      font-size: 1.2rem;
      background: color-mix(in srgb, var(--accent, #D4AF37) 18%, #fff);
      flex-shrink: 0;
    }
    .ed-rep-card-title {
      margin: 0 0 .25rem;
      font-size: 1.05rem;
      font-weight: 800;
      color: #2D2418;
    }
    .ed-rep-card-desc {
      margin: 0;
      font-size: .86rem;
      color: #8A7B65;
      line-height: 1.4;
    }

    .ed-rep-actions {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: .45rem;
    }

    .ed-fmt {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: .1rem;
      min-height: 3.4rem;
      border-radius: .7rem;
      border: 1.5px solid #E7DAC6;
      background: #fff;
      cursor: pointer;
      padding: .45rem .3rem;
      transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease, background .12s ease;
      position: relative;
    }
    .ed-fmt:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 14px rgba(32, 22, 11, 0.1);
    }
    .ed-fmt:disabled {
      opacity: .65;
      cursor: wait;
    }
    .ed-fmt-label {
      font-size: .82rem;
      font-weight: 800;
      letter-spacing: .02em;
    }
    .ed-fmt-hint {
      font-size: .68rem;
      color: #8A7B65;
      font-weight: 500;
    }
    .ed-fmt-spin {
      position: absolute;
      top: 4px;
      right: 6px;
      font-size: .75rem;
      color: #8A7B65;
    }

    .ed-fmt--csv {
      border-color: #D4AF37;
      background: linear-gradient(180deg, #FFF8E6 0%, #FFF 100%);
    }
    .ed-fmt--csv .ed-fmt-label { color: #8A6A12; }

    .ed-fmt--xlsx {
      border-color: #2E7D4F;
      background: linear-gradient(180deg, #EEF8F1 0%, #FFF 100%);
    }
    .ed-fmt--xlsx .ed-fmt-label { color: #1B5E38; }

    .ed-fmt--pdf {
      border-color: #B42318;
      background: linear-gradient(180deg, #FDF0EF 0%, #FFF 100%);
    }
    .ed-fmt--pdf .ed-fmt-label { color: #912018; }

    .ed-rep-toast {
      margin-top: 1.25rem;
      padding: .85rem 1rem;
      border-radius: .75rem;
      font-size: .9rem;
      font-weight: 600;
    }
    .ed-rep-toast--ok {
      background: #EEF8F1;
      border: 1px solid #A6D8B5;
      color: #1B5E38;
    }
    .ed-rep-toast--err {
      background: #FFF6E0;
      border: 1px solid #E8C547;
      color: #5C4A12;
    }

    @media (max-width: 420px) {
      .ed-rep-actions { grid-template-columns: 1fr; }
    }

    .ed-fin {
      margin: 0 0 1.6rem;
      padding: 1.15rem 1.2rem 1.25rem;
      background: #FFFEFA;
      border: 1px solid #E7DAC6;
      border-radius: 1.05rem;
      box-shadow: 0 10px 28px rgba(32, 22, 11, 0.06);
    }
    .ed-fin-bar {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: flex-start;
      margin-bottom: .9rem;
    }
    .ed-fin-title { margin: 0 0 .2rem; font-size: 1.08rem; font-weight: 800; color: #2D2418; }
    .ed-fin-sub { margin: 0; font-size: .84rem; color: #8A7B65; }
    .ed-fin-periods { display: flex; gap: .4rem; flex-wrap: wrap; }
    .ed-fin-range {
      display: flex; flex-wrap: wrap; gap: .6rem; align-items: end; margin: 0 0 .85rem;
    }
    .ed-fin-date { display: flex; flex-direction: column; gap: .15rem; font-size: .75rem; color: #8A7B65; font-weight: 600; }
    .ed-fin-date input {
      border: 1.5px solid #E7DAC6; border-radius: .55rem; padding: .35rem .5rem; font-size: .85rem; color: #2D2418;
    }
    .ed-chip {
      border: 1.5px solid #E7DAC6;
      background: #fff;
      border-radius: 999px;
      padding: .35rem .75rem;
      font-size: .82rem;
      font-weight: 700;
      cursor: pointer;
      color: #5C4A12;
    }
    .ed-chip--on { background: #D4AF37; border-color: #C4A030; color: #2D2418; }
    .ed-fin-load, .ed-fin-err, .ed-fin-empty { font-size: .88rem; margin: .4rem 0; }
    .ed-fin-err { color: #912018; }
    .ed-kpi {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: .7rem;
    }
    .ed-kpi-card {
      background: #fff;
      border: 1px solid #E7DAC6;
      border-radius: .8rem;
      padding: .7rem .8rem;
    }
    .ed-kpi-label { display: block; font-size: .72rem; color: #8A7B65; font-weight: 600; margin-bottom: .15rem; }
    .ed-kpi-card strong { font-size: 1.15rem; color: #2D2418; }
    .ed-kpi-card small { display: block; font-size: .68rem; color: #8A7B65; }
    .ed-fin-meta { font-size: .8rem; color: #8A7B65; margin: .7rem 0 .9rem; }
    .ed-charts {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: .9rem;
    }
    .ed-chart h4 { margin: 0; font-size: .88rem; color: #2D2418; }
    .ed-chart-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .5rem;
      margin-bottom: .5rem;
      flex-wrap: wrap;
    }
    .ed-mini-dl { display: flex; gap: .3rem; }
    .ed-mini-dl button {
      border: 1px solid #E7DAC6;
      background: #fff;
      color: #2D2418;
      font: inherit;
      font-size: .68rem;
      font-weight: 700;
      padding: .22rem .45rem;
      border-radius: 999px;
      cursor: pointer;
    }
    .ed-mini-dl button:hover { background: #F6EFE0; }
    .ed-mini-dl button:disabled { opacity: .5; cursor: wait; }
    .ed-chart--full { margin-top: .9rem; }
    .ed-bars {
      display: flex;
      align-items: flex-end;
      gap: 3px;
      height: 140px;
      padding: .3rem 0 1.3rem;
      border-bottom: 1px solid #E7DAC6;
    }
    .ed-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; min-width: 0; }
    .ed-bar {
      width: 100%;
      max-width: 18px;
      min-height: 2px;
      background: linear-gradient(180deg, #D4AF37, #B8962C);
      border-radius: 3px 3px 0 0;
    }
    .ed-bar-lbl { font-size: .58rem; color: #8A7B65; margin-top: .2rem; white-space: nowrap; }
    .ed-pay { display: flex; flex-direction: column; gap: .45rem; }
    .ed-pay-row { display: grid; grid-template-columns: 7.5rem 1fr 5.2rem; gap: .45rem; align-items: center; font-size: .8rem; }
    .ed-pay-name { color: #2D2418; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ed-pay-track { height: 8px; background: #F3EADC; border-radius: 99px; overflow: hidden; }
    .ed-pay-fill { height: 100%; background: #2E7D4F; border-radius: 99px; }
    .ed-pay-fill--gold { background: #D4AF37; }
    .ed-pay-n { text-align: right; color: #5C4A12; font-variant-numeric: tabular-nums; }
    .ed-dl-title { font-size: 1rem; margin: 0 0 .8rem; color: #2D2418; }

    @media (max-width: 800px) {
      .ed-kpi { grid-template-columns: 1fr 1fr; }
      .ed-charts { grid-template-columns: 1fr; }
    }
  `],
})
export class ReportesPage implements OnInit {
  private api = inject(AdminReportesService);

  msg = signal<string | undefined>(undefined);
  msgOk = signal(true);
  busyKey = signal<string | null>(null);

  atajos: Atajo[] = [7, 30, 90, 'mes'];
  atajo = signal<Atajo | 'custom'>(30);
  desde = this.ymd(this.haceDias(29));
  hasta = this.ymd(new Date());
  fin = signal<FinancieroResumen | null>(null);
  finLoading = signal(false);
  finErr = signal<string | undefined>(undefined);

  maxIngreso = computed(() => {
    const days = this.fin()?.por_dia ?? [];
    return Math.max(0, ...days.map((d) => d.total), 0.01);
  });
  maxTop = computed(() => {
    const tops = this.fin()?.top_productos ?? [];
    return Math.max(0, ...tops.map((t) => t.importe), 0.01);
  });
  maxPago = computed(() => {
    const p = this.fin()?.por_pago ?? [];
    return Math.max(0, ...p.map((x) => x.total), 0.01);
  });

  chartDays = computed(() => {
    const raw = this.fin()?.por_dia ?? [];
    if (!raw.length) return [];
    const max = this.maxIngreso();
    const step = raw.length > 40 ? 7 : raw.length > 14 ? 4 : 1;
    return raw.map((d, i) => ({
      ...d,
      pct: Math.max(3, (d.total / max) * 100),
      label: i % step === 0 ? d.fecha.slice(5) : '',
    }));
  });

  ngOnInit() {
    this.loadFin();
  }

  setAtajo(d: Atajo) {
    this.atajo.set(d);
    if (d === 'mes') {
      const n = new Date();
      this.desde = this.ymd(new Date(n.getFullYear(), n.getMonth(), 1));
      this.hasta = this.ymd(n);
    } else {
      this.hasta = this.ymd(new Date());
      this.desde = this.ymd(this.haceDias(d - 1));
    }
    this.loadFin();
  }

  aplicarRango() {
    this.atajo.set('custom');
    this.loadFin();
  }

  etiquetaRango(): string {
    const a = this.fin()?.desde || this.desde;
    const b = this.fin()?.hasta || this.hasta;
    return this.fmt(a) + ' → ' + this.fmt(b);
  }

  private rango(): RangoReporte {
    return { desde: this.desde, hasta: this.hasta };
  }
  private ymd(d: Date) {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  private haceDias(n: number) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  }
  private fmt(ymd: string) {
    const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : ymd;
  }

  loadFin() {
    this.finLoading.set(true);
    this.finErr.set(undefined);
    this.api.financiero(this.rango()).subscribe({
      next: (res) => {
        this.fin.set(res);
        this.finLoading.set(false);
      },
      error: () => {
        this.finLoading.set(false);
        this.finErr.set('No se pudo cargar el resumen. ¿Laravel está en marcha y eres ADMIN?');
      },
    });
  }

  pagoPct(n: number) {
    return Math.max(4, (n / this.maxPago()) * 100);
  }
  topPct(n: number) {
    return Math.max(4, (n / this.maxTop()) * 100);
  }

  groups: ReportGroup[] = [
    {
      key: 'clientes',
      label: 'Clientes',
      desc: 'Registro de clientes: contacto, correo y fecha de alta.',
      icon: '👥',
      accent: '#D4AF37',
    },
    {
      key: 'productos',
      label: 'Productos',
      desc: 'Catálogo con precios, stock y estado de cada ítem.',
      icon: '🏷️',
      accent: '#3B82F6',
    },
    {
      key: 'pedidos',
      label: 'Pedidos',
      desc: 'Órdenes del rango de fechas de arriba (cliente, estado, total y pago).',
      icon: '🛒',
      accent: '#2E7D4F',
    },
    {
      key: 'inventario',
      label: 'Inventario',
      desc: 'Movimientos de stock y empleado responsable.',
      icon: '📦',
      accent: '#7C3AED',
    },
    {
      key: 'financiero',
      label: 'Financiero (las 3 lecturas)',
      desc: 'Ventas por día, forma de pago y productos que más facturan (periodo de arriba).',
      icon: '💰',
      accent: '#0F766E',
    },
    {
      key: 'stock_bajo',
      label: 'Stock bajo',
      desc: 'Productos con 10 unidades o menos, para reposición.',
      icon: '⚠️',
      accent: '#B45309',
    },
  ];

  dlSerie(tipo: 'ventas_dia' | 'forma_pago' | 'top_productos', ext: ReportExt) {
    const key = `${tipo}:${ext}`;
    this.busyKey.set(key);
    this.msg.set(undefined);
    const map = {
      ventas_dia: () => this.api.downloadVentasDia(ext, this.rango()),
      forma_pago: () => this.api.downloadFormaPago(ext, this.rango()),
      top_productos: () => this.api.downloadTopProductos(ext, this.rango()),
    };
    map[tipo]().subscribe({
      next: (blob) => {
        if (blob.type?.includes('application/json')) {
          this.busyKey.set(null);
          this.msgOk.set(false);
          this.msg.set('El servidor respondió un error. Revisa Laravel y permisos de rol ADMIN.');
          return;
        }
        this.downloadBlob(blob, `reporte_${tipo}.${ext}`);
        this.busyKey.set(null);
        this.msgOk.set(true);
        this.msg.set(`Descarga lista: reporte_${tipo}.${ext}`);
      },
      error: () => {
        this.busyKey.set(null);
        this.msgOk.set(false);
        this.msg.set('No se pudo descargar. ¿Laravel está en 8000 y eres ADMIN?');
      },
    });
  }

  dl(tipo: ReportKey, ext: ReportExt) {
    const key = `${tipo}:${ext}`;
    this.busyKey.set(key);
    this.msg.set(undefined);

    const map: Record<ReportKey, () => ReturnType<AdminReportesService['downloadClientes']>> = {
      clientes: () => this.api.downloadClientes(ext),
      productos: () => this.api.downloadProductos(ext),
      pedidos: () => this.api.downloadPedidos(ext, this.rango()),
      inventario: () => this.api.downloadInventario(ext),
      financiero: () => this.api.downloadFinanciero(ext, this.rango()),
      stock_bajo: () => this.api.downloadStockBajo(ext),
    };

    map[tipo]().subscribe({
      next: (blob) => {
        // Si el backend devolvió JSON de error con status 200 raro, o blob vacío
        if (blob.type?.includes('application/json')) {
          this.busyKey.set(null);
          this.msgOk.set(false);
          this.msg.set('El servidor respondió un error. Revisa Laravel y permisos de rol ADMIN.');
          return;
        }
        this.downloadBlob(blob, `reporte_${tipo}.${ext}`);
        this.busyKey.set(null);
        this.msgOk.set(true);
        this.msg.set(`Descarga lista: reporte_${tipo}.${ext}`);
      },
      error: async (err) => {
        this.busyKey.set(null);
        this.msgOk.set(false);
        let detail = '';
        try {
          const b = err?.error;
          if (b instanceof Blob) {
            const text = await b.text();
            const j = JSON.parse(text);
            detail = j?.error?.message || j?.message || '';
          }
        } catch {
          /* ignore */
        }
        this.msg.set(
          detail ||
            `No se pudo descargar ${ext.toUpperCase()} de ${tipo}. Verifica que Laravel esté en :8000 y que tu usuario tenga rol ADMIN.`,
        );
      },
    });
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
