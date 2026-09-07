import { Component, OnInit, inject } from '@angular/core';
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
  `],
  template: `
    <div class="p-3">
      <h2 class="ed-page-title">Interés Dori</h2>
      <p class="text-muted">
        Ranking de productos que Dori mostró. Las cifras grandes son de <strong>clientes con cuenta</strong>
        (no se mezclan con invitados). “Invitado” es chat sin login.
        En naranja: consultados con stock ≤ 10 (reponer).
      </p>
      <div class="d-flex gap-3 mb-3 flex-wrap align-items-center">
        <div class="card p-3 ed-stat"><strong>{{ stats.productos }}</strong><div class="small">Productos</div></div>
        <div class="card p-3 ed-stat"><strong>{{ stats.consultas }}</strong><div class="small">Consultas (cuenta)</div></div>
        <div class="card p-3 ed-stat"><strong>{{ stats.consultas_invitado }}</strong><div class="small">Invitados</div></div>
        <div class="card p-3 ed-stat"><strong>{{ stats.likes }}</strong><div class="small">Me gusta</div></div>
        <div class="card p-3 ed-stat"><strong>{{ stats.carritos }}</strong><div class="small">Al carrito</div></div>
        <div class="card p-3 ed-stat" *ngIf="stats.stock_bajo"><strong>{{ stats.stock_bajo }}</strong><div class="small">A reponer</div></div>
        <div class="ms-auto d-flex gap-1">
          <button type="button" class="btn btn-sm btn-outline-secondary" (click)="dl('csv')" [disabled]="!!busy">CSV</button>
          <button type="button" class="btn btn-sm btn-outline-success" (click)="dl('xlsx')" [disabled]="!!busy">Excel</button>
          <button type="button" class="btn btn-sm btn-outline-danger" (click)="dl('pdf')" [disabled]="!!busy">PDF</button>
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
              <span>{{ p.consultas_cuenta || 0 }} cuenta</span>
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
      <p class="text-muted" *ngIf="!items.length">
        Aún no hay productos consultados. Cuando un cliente pregunte a Dori y salgan tarjetas, aparecen aquí.
      </p>
    </div>
  `,
})
export class AsistenteInteresPage implements OnInit {
  private http = inject(HttpClient);
  items: Item[] = [];
  stats = { productos: 0, consultas: 0, consultas_invitado: 0, likes: 0, carritos: 0, stock_bajo: 0 };
  busy: string | null = null;

  ngOnInit() {
    this.http.get<{ items: Item[]; stats: typeof this.stats }>(`${environment.apiBaseUrl}/admin/asistente-interes`).subscribe({
      next: (r) => {
        this.items = r.items || [];
        this.stats = { ...this.stats, ...(r.stats || {}) };
      },
      error: () => {},
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
