import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';

type ProdChip = {
  id?: number;
  nombre: string;
  precio?: number | null;
  stock?: number | null;
  imagen_url?: string | null;
  descripcion?: string | null;
};

type LogItem = {
  id: number;
  mensaje: string;
  tipo: string;
  n_productos: number;
  whatsapp: boolean | number;
  productos?: string | null;
  productos_items?: ProdChip[];
  queja_tipo?: string | null;
  queja_label?: string | null;
  urgencia?: boolean | number;
  driver?: string;
  created_at: string;
  id_cliente?: number | null;
  cliente_nombre?: string | null;
  cliente_email?: string | null;
  celular?: string | null;
  celular_fmt?: string | null;
  wa_url?: string | null;
};

@Component({
  standalone: true,
  selector: 'app-asistente-logs',
  imports: [CommonModule, RouterLink],
  styles: [`
    .ed-chip {
      display: inline-block;
      margin: 0 6px 6px 0;
      padding: 4px 10px;
      border: 0;
      border-radius: 999px;
      background: #3d2a12;
      color: #f6e7c8;
      font-size: 12px;
      cursor: pointer;
    }
    .ed-chip:hover { filter: brightness(1.15); }
    .ed-modal-bg {
      position: fixed; inset: 0; background: rgba(20,12,4,.55);
      z-index: 80; display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .ed-modal {
      background: #fffaf2; border-radius: 16px; max-width: 440px; width: 100%;
      box-shadow: 0 16px 48px rgba(0,0,0,.25); overflow: hidden;
    }
    .ed-modal img { width: 100%; height: 220px; object-fit: cover; background: #eee; }
    .ed-modal-body { padding: 16px 18px 18px; }
    .ed-modal h3 { margin: 0 0 8px; font-size: 1.15rem; }
    .ed-modal .desc { font-size: 13px; color: #5c4a32; white-space: pre-wrap; }
    .ed-wa { display: inline-block; margin: 4px 8px 8px 0; font-weight: 600; color: #128c7e; text-decoration: underline; }
    .ed-queja-meta { font-size: 13px; color: #5c4a32; margin: 0 0 8px; }
  `],
  template: `
    <div class="p-3">
      <h2 class="ed-page-title">Consultas Dori</h2>
      <p class="text-muted">
        Las quejas y el WhatsApp van aquí. El ranking de productos consultados está en
        <a routerLink="/admin/interes-dori">Interés Dori</a>.
      </p>
      <div class="d-flex gap-3 mb-3 flex-wrap">
        <div class="card p-3"><strong>{{ stats.total }}</strong><div class="small">Consultas</div></div>
        <div class="card p-3"><strong>{{ stats.sin_producto }}</strong><div class="small">Sin producto en catálogo</div></div>
        <div class="card p-3"><strong>{{ stats.whatsapp }}</strong><div class="small">Pasadas a WhatsApp</div></div>
      </div>
      <table class="table table-sm bg-white">
        <thead>
          <tr>
            <th>Cuándo</th>
            <th>Cliente</th>
            <th>Pregunta</th>
            <th>Detalle</th>
            <th>Tipo</th>
            <th>N.º</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of items" (click)="openQueja(r)" style="cursor:pointer">
            <td class="text-nowrap">{{ r.created_at }}</td>
            <td>
              <div *ngIf="r.cliente_nombre">{{ r.cliente_nombre }}</div>
              <small class="text-muted" *ngIf="r.cliente_email">{{ r.cliente_email }}</small>
              <span *ngIf="!r.cliente_nombre" class="text-muted">Invitado</span>
            </td>
            <td>{{ r.mensaje }}</td>
            <td (click)="$event.stopPropagation()">
              <div *ngIf="r.queja_label"><strong>{{ r.queja_label }}</strong></div>
              <a *ngIf="r.wa_url" class="ed-wa" [href]="r.wa_url" target="_blank" rel="noopener">{{ r.celular_fmt || 'WhatsApp' }}</a>
              <button
                type="button"
                class="ed-chip"
                *ngFor="let p of chips(r)"
                (click)="openProd(p)"
              >{{ p.nombre }}</button>
            </td>
            <td>
              <span *ngIf="r.whatsapp" class="badge bg-success">WhatsApp</span>
              <span *ngIf="r.tipo === 'sin_producto' && !r.whatsapp" class="badge bg-warning text-dark">Sin catálogo</span>
              <span *ngIf="r.tipo === 'catalogo'" class="badge bg-secondary">Catálogo</span>
            </td>
            <td>{{ r.n_productos }}</td>
          </tr>
          <tr *ngIf="!items.length">
            <td colspan="6" class="text-muted">Aún no hay consultas. Escribe algo en Dori (tienda) y recarga esta página.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="ed-modal-bg" *ngIf="queja" (click)="close()">
      <div class="ed-modal" (click)="$event.stopPropagation()">
        <div class="ed-modal-body">
          <h3>{{ queja.queja_label || 'Consulta' }}</h3>
          <p class="ed-queja-meta" *ngIf="queja.cliente_nombre">
            <strong>{{ queja.cliente_nombre }}</strong>
            <span *ngIf="queja.cliente_email"> · {{ queja.cliente_email }}</span>
          </p>
          <p class="ed-queja-meta" *ngIf="!queja.cliente_nombre">Cliente no identificado (invitado).</p>
          <p class="desc mb-2">{{ queja.mensaje }}</p>
          <p class="mb-2" *ngIf="queja.wa_url">
            Celular:
            <a class="ed-wa" [href]="queja.wa_url" target="_blank" rel="noopener">{{ queja.celular_fmt }}</a>
          </p>
          <div class="d-flex gap-2">
            <a *ngIf="queja.wa_url" class="btn btn-sm btn-success" [href]="queja.wa_url" target="_blank" rel="noopener">Abrir WhatsApp</a>
            <button type="button" class="btn btn-sm btn-outline-secondary" (click)="close()">Cerrar</button>
          </div>
        </div>
      </div>
    </div>

    <div class="ed-modal-bg" *ngIf="open" (click)="close()">
      <div class="ed-modal" (click)="$event.stopPropagation()">
        <img *ngIf="open.imagen_url" [src]="open.imagen_url" [alt]="open.nombre" />
        <div class="ed-modal-body">
          <h3>{{ open.nombre }}</h3>
          <p class="mb-1" *ngIf="open.precio != null">Precio: <strong>S/ {{ open.precio }}</strong></p>
          <p class="mb-2" *ngIf="open.stock != null">Stock: {{ open.stock }}</p>
          <p class="desc mb-2" *ngIf="open.descripcion">{{ open.descripcion }}</p>
          <p class="small text-muted" *ngIf="loading">Cargando ficha…</p>
          <div class="d-flex gap-2">
            <a
              *ngIf="open.id"
              class="btn btn-sm btn-dark"
              [routerLink]="['/admin/productos', open.id]"
              (click)="close()"
            >Ver en catálogo</a>
            <button type="button" class="btn btn-sm btn-outline-secondary" (click)="close()">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AsistenteLogsPage implements OnInit {
  private http = inject(HttpClient);
  items: LogItem[] = [];
  stats = { total: 0, sin_producto: 0, whatsapp: 0 };
  open: ProdChip | null = null;
  queja: LogItem | null = null;
  loading = false;

  ngOnInit() {
    this.http.get<{ items: LogItem[]; stats: { total: number; sin_producto: number; whatsapp: number } }>(`${environment.apiBaseUrl}/admin/asistente-logs`).subscribe({
      next: (r) => {
        this.items = r.items || [];
        this.stats = r.stats || this.stats;
      },
      error: () => {},
    });
  }

  chips(r: LogItem): ProdChip[] {
    if (r.productos_items?.length) return r.productos_items;
    if (!r.productos) return [];
    return r.productos.split(/,\s*/).filter(Boolean).map((nombre) => ({ nombre }));
  }

  close() {
    this.open = null;
    this.queja = null;
    this.loading = false;
  }

  openQueja(r: LogItem) {
    this.queja = r;
  }

  openProd(p: ProdChip) {
    this.open = { ...p };
    this.loading = true;
    const id = Number(p.id || 0);
    if (id > 0) {
      this.http.get<any>(`${environment.apiBaseUrl}/admin/productos/${id}`).subscribe({
        next: (prod) => this.applyProd(prod, p),
        error: () => { this.loading = false; this.lookupByName(p.nombre); },
      });
      return;
    }
    this.lookupByName(p.nombre);
  }

  private lookupByName(nombre: string) {
    this.http.get<any>(`${environment.apiBaseUrl}/admin/productos`, { params: { q: nombre, per_page: 20 } }).subscribe({
      next: (res) => {
        const list: any[] = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        const n = nombre.trim().toLowerCase();
        const hit = list.find((x) => String(x.nombre || '').trim().toLowerCase() === n) || list[0];
        if (hit) this.applyProd(hit, { nombre });
        else this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  private applyProd(prod: any, fallback: ProdChip) {
    this.loading = false;
    if (!this.open) return;
    this.open = {
      id: Number(prod.id_producto ?? prod.id ?? fallback.id ?? 0) || undefined,
      nombre: prod.nombre || fallback.nombre,
      precio: prod.precio_venta ?? fallback.precio,
      stock: prod.stock ?? fallback.stock,
      imagen_url: prod.imagen_url || fallback.imagen_url,
      descripcion: prod.descripcion || null,
    };
  }
}
