import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';

type Item = {
  id: number;
  nombre: string;
  imagen_url?: string | null;
  precio?: number | null;
  stock?: number | null;
  consultas: number;
  consultas_cuenta?: number;
  consultas_invitado?: number;
  likes: number;
  dislikes: number;
  carritos: number;
  stock_bajo?: boolean;
};

@Component({
  standalone: true,
  selector: 'app-asistente-interes',
  imports: [CommonModule, RouterLink],
  styles: [`
    .ed-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
    .ed-card {
      background: #fffaf2; border-radius: 14px; overflow: hidden;
      box-shadow: 0 6px 18px rgba(40,24,8,.08); display: flex; flex-direction: column;
    }
    .ed-card img { width: 100%; height: 160px; object-fit: cover; background: #eee; }
    .ed-card body, .ed-body { padding: 12px 14px 14px; }
    .ed-card h3 { margin: 0 0 4px; font-size: 1rem; line-height: 1.3; }
    .ed-meta { font-size: 12px; color: #6b5d4d; margin: 0 0 8px; }
    .ed-kpis { display: flex; gap: 8px; flex-wrap: wrap; font-size: 12px; }
    .ed-kpis span { background: #f3e6d0; border-radius: 999px; padding: 3px 8px; }
    .ed-card--alert { outline: 2px solid #B45309; box-shadow: 0 0 0 3px rgba(180,83,9,.15); }
    .ed-reponer { color: #B45309; font-weight: 800; font-size: 12px; margin: 0 0 6px; }
    .ed-stats { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 1rem; }
    .ed-stat {
      min-width: 148px; max-width: 220px; flex: 1 1 148px;
      background: #FFFEFA; border: 1px solid #E7DAC6; border-radius: 14px;
      padding: 12px 14px;
    }
    .ed-stat strong { display: block; font-size: 1.7rem; line-height: 1.1; color: #2D2418; }
    .ed-stat-label { font-size: 13px; font-weight: 700; margin-top: 4px; color: #2D2418; }
    .ed-stat-hint { font-size: 11px; color: #6b5d4d; margin-top: 4px; line-height: 1.35; }
    .ed-toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
    .ed-updated { font-size: 12px; color: #6b5d4d; }
  `],
  template: `
    <div class="p-3">
      <h2 class="ed-page-title">Interés Dori</h2>
      <p class="text-muted">
        Qué preguntaron a Dori, qué les gustó y qué pasaron al carrito.
        Los números de arriba son <strong>veces (eventos)</strong>, no personas distintas.
        El 👍 del chat se suma aquí; pulsa <strong>Actualizar</strong> o espera unos segundos.
      </p>
      <div class="ed-toolbar">
        <button type="button" class="btn btn-sm btn-dark" (click)="cargar()" [disabled]="loading">Actualizar</button>
        <span class="ed-updated" *ngIf="updatedAt">Actualizado {{ updatedAt }}</span>
        <div class="ms-auto d-flex gap-1">
          <button type="button" class="btn btn-sm btn-outline-secondary" (click)="dl('csv')" [disabled]="!!busy">CSV</button>
          <button type="button" class="btn btn-sm btn-outline-success" (click)="dl('xlsx')" [disabled]="!!busy">Excel</button>
          <button type="button" class="btn btn-sm btn-outline-danger" (click)="dl('pdf')" [disabled]="!!busy">PDF</button>
        </div>
      </div>
      <div class="ed-stats">
        <div class="ed-stat">
          <strong>{{ stats.productos }}</strong>
          <div class="ed-stat-label">Productos distintos</div>
          <div class="ed-stat-hint">Cuántos productos diferentes Dori llegó a mostrar en el chat.</div>
        </div>
        <div class="ed-stat">
          <strong>{{ stats.consultas }}</strong>
          <div class="ed-stat-label">Consultas con cuenta</div>
          <div class="ed-stat-hint">Veces que Dori mostró un producto a un cliente logueado. Una persona puede sumar varias.</div>
        </div>
        <div class="ed-stat">
          <strong>{{ stats.consultas_invitado }}</strong>
          <div class="ed-stat-label">Consultas de invitado</div>
          <div class="ed-stat-hint">Veces que Dori mostró un producto en un chat sin login.</div>
        </div>
        <div class="ed-stat">
          <strong>{{ stats.likes }}</strong>
          <div class="ed-stat-label">Me gusta (👍)</div>
          <div class="ed-stat-hint">Veces que tocaron 👍 en una tarjeta de Dori (web o app).</div>
        </div>
        <div class="ed-stat">
          <strong>{{ stats.carritos }}</strong>
          <div class="ed-stat-label">Al carrito desde Dori</div>
          <div class="ed-stat-hint">Veces que agregaron al carrito desde el chat, no desde el catálogo.</div>
        </div>
        <div class="ed-stat">
          <strong>{{ stats.stock_bajo }}</strong>
          <div class="ed-stat-label">A reponer</div>
          <div class="ed-stat-hint">Consultados con stock 10 o menos. Hay que ingresar mercadería.</div>
        </div>
      </div>
      <div class="ed-grid" *ngIf="items.length">
        <article class="ed-card" *ngFor="let p of items" [class.ed-card--alert]="alerta(p)">
          <img [src]="p.imagen_url || '/assets/img/no-image.png'" [alt]="p.nombre" />
          <div class="ed-body">
            <p class="ed-reponer" *ngIf="alerta(p)">⚠ Reponer · stock {{ p.stock }}</p>
            <h3>{{ p.nombre }}</h3>
            <p class="ed-meta">
              <span *ngIf="p.precio != null">S/ {{ p.precio | number:'1.2-2' }}</span>
              <span *ngIf="p.stock != null"> · stock {{ p.stock }}</span>
            </p>
            <div class="ed-kpis">
              <span>{{ p.consultas_cuenta || 0 }} con cuenta</span>
              <span>{{ p.consultas_invitado || 0 }} invitado</span>
              <span>👍 {{ p.likes }}</span>
              <span>👎 {{ p.dislikes }}</span>
              <span>🛒 {{ p.carritos }}</span>
            </div>
            <a class="btn btn-sm btn-dark mt-2" [routerLink]="['/panel-ed-k7m2/productos', p.id]">Ver en catálogo</a>
            <a class="btn btn-sm btn-outline-secondary mt-2 ms-1" *ngIf="alerta(p)" [routerLink]="['/panel-ed-k7m2/inventario']">Inventario</a>
          </div>
        </article>
      </div>
      <p class="text-muted" *ngIf="!items.length && !loading">
        Aún no hay productos consultados. Cuando un cliente pregunte a Dori y salgan tarjetas, aparecen aquí.
      </p>
    </div>
  `,
})
export class AsistenteInteresPage implements OnInit, OnDestroy {
  // Interés Dori: clicks a productos. "Consultas de invitado" = veces, no personas.
  private http = inject(HttpClient);
  items: Item[] = [];
  stats = { productos: 0, consultas: 0, consultas_invitado: 0, likes: 0, carritos: 0, stock_bajo: 0 };
  busy: string | null = null;
  loading = false;
  updatedAt = '';
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.cargar();
    this.timer = setInterval(() => this.cargar(true), 20000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  cargar(silencio = false) {
    if (!silencio) this.loading = true;
    this.http.get<{ items: Item[]; stats: any }>(`${environment.apiBaseUrl}/admin/asistente-interes`).subscribe({
      next: (r) => {
        this.items = r.items || [];
        this.stats = { ...this.stats, ...(r.stats || {}) };
        const d = new Date();
        const p = (n: number) => String(n).padStart(2, '0');
        this.updatedAt = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  alerta(p: Item) {
    return !!p.stock_bajo && (p.consultas || 0) > 0;
  }

  dl(ext: 'csv' | 'xlsx' | 'pdf') {
    this.busy = ext;
    this.http.get(`${environment.apiBaseUrl}/admin/asistente-interes.${ext}`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `interes_dori.${ext}`;
        a.click();
        URL.revokeObjectURL(a.href);
        this.busy = null;
      },
      error: () => { this.busy = null; },
    });
  }
}
