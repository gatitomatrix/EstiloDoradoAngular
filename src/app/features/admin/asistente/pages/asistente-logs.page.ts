import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

type ProdChip = {
  id?: number;
  nombre: string;
  precio?: number | null;
  stock?: number | null;
  imagen_url?: string | null;
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
};

@Component({
  standalone: true,
  selector: 'app-asistente-logs',
  imports: [CommonModule],
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
      background: #fffaf2; border-radius: 16px; max-width: 420px; width: 100%;
      box-shadow: 0 16px 48px rgba(0,0,0,.25); overflow: hidden;
    }
    .ed-modal img { width: 100%; height: 220px; object-fit: cover; background: #eee; }
    .ed-modal-body { padding: 16px 18px 18px; }
    .ed-modal h3 { margin: 0 0 8px; font-size: 1.15rem; }
  `],
  template: `
    <div class="p-3">
      <h2 class="ed-page-title">Consultas Dori</h2>
      <p class="text-muted">
        Preguntas de clientes en el chat (sin saludos ni “gracias”). Clic en un producto para verlo.
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
            <th>Pregunta</th>
            <th>Detalle</th>
            <th>Tipo</th>
            <th>N.º</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of items">
            <td class="text-nowrap">{{ r.created_at }}</td>
            <td>{{ r.mensaje }}</td>
            <td>
              <div *ngIf="r.queja_label"><strong>{{ r.queja_label }}</strong></div>
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
            <td colspan="5" class="text-muted">Aún no hay consultas. Escribe algo en Dori (tienda) y recarga esta página.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="ed-modal-bg" *ngIf="open" (click)="open = false">
      <div class="ed-modal" (click)="$event.stopPropagation()">
        <img *ngIf="open.imagen_url" [src]="open.imagen_url" [alt]="open.nombre" />
        <div class="ed-modal-body">
          <h3>{{ open.nombre }}</h3>
          <p class="mb-1" *ngIf="open.precio != null">Precio: <strong>S/ {{ open.precio }}</strong></p>
          <p class="mb-2" *ngIf="open.stock != null">Stock: {{ open.stock }}</p>
          <p class="small text-muted" *ngIf="open.id">Código interno #{{ open.id }}</p>
          <button type="button" class="btn btn-sm btn-dark" (click)="open = false">Cerrar</button>
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

  openProd(p: ProdChip) {
    this.open = { ...p };
    const id = Number(p.id || 0);
    if (id < 1) return;
    this.http.get<any>(`${environment.apiBaseUrl}/admin/productos/${id}`).subscribe({
      next: (prod) => {
        if (!this.open || Number(this.open.id) !== id) return;
        this.open = {
          id,
          nombre: prod.nombre || p.nombre,
          precio: prod.precio_venta ?? p.precio,
          stock: prod.stock ?? p.stock,
          imagen_url: prod.imagen_url || p.imagen_url,
        };
      },
      error: () => {},
    });
  }
}
