import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminClientesService } from '../services/admin-clientes.service';

@Component({
  standalone: true,
  selector: 'app-cliente-detail',
  imports: [CommonModule, RouterLink],
  styles: [`
    .ed-ficha { max-width: 820px; }
    .ed-pedido { display: flex; gap: 12px; padding: 12px 0; border-top: 1px solid #ead9c0; }
    .ed-pedido img { width: 64px; height: 64px; object-fit: cover; border-radius: 8px; background: #eee; flex-shrink: 0; }
    .ed-badge { background: #3d2a12; color: #f6e7c8; border-radius: 999px; padding: 2px 8px; font-size: 11px; }
    .ed-muted { color: #6b5a43; }
  `],
  template: `
    <div class="p-3 ed-ficha">
      <a routerLink="/panel-ed-k7m2/clientes" class="small text-decoration-none">← Volver a clientes</a>
      <h2 class="mt-2">Datos del cliente</h2>
      <p class="small text-muted">Solo consulta. Los datos de cuenta los actualiza el cliente en la tienda.</p>

      <p *ngIf="error" class="text-danger">{{ error }}</p>
      <p *ngIf="loading" class="text-muted">Cargando…</p>

      <ng-container *ngIf="c && !loading">
        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label">Nombre</label>
            <input class="form-control" [value]="c.nombre || '—'" readonly>
          </div>
          <div class="col-md-6">
            <label class="form-label">Apellido</label>
            <input class="form-control" [value]="c.apellido || '—'" readonly>
          </div>
          <div class="col-md-6">
            <label class="form-label">Teléfono</label>
            <input class="form-control" [value]="c.telefono || '—'" readonly>
          </div>
          <div class="col-md-6">
            <label class="form-label">Email</label>
            <input class="form-control" [value]="c.email || '—'" readonly>
          </div>
          <div class="col-12">
            <label class="form-label">Dirección</label>
            <input class="form-control" [value]="c.direccion || '—'" readonly>
          </div>
          <div class="col-md-6">
            <label class="form-label">Fecha registro</label>
            <input class="form-control" [value]="fmtFecha(c.created_at)" readonly>
          </div>
          <div class="col-md-6">
            <label class="form-label">Compras pagadas</label>
            <input class="form-control" [value]="(c.n_pedidos || 0) + ' · S/ ' + (c.total_gastado || '0.00')" readonly>
          </div>
        </div>

        <h3 class="h5 mt-4">Pedidos
          <span class="ed-badge" *ngIf="(c.n_pedidos || 0) >= 3">Frecuente</span>
        </h3>
        <p class="ed-muted small" *ngIf="!(c.pedidos || []).length">Aún no tiene pedidos.</p>
        <div *ngFor="let p of c.pedidos || []" class="ed-pedido">
          <img *ngIf="p.items?.[0]?.imagen_url" [src]="p.items[0].imagen_url" alt="" />
          <div>
            <strong>Pedido #{{ p.id_pedido }}</strong>
            <div class="small text-muted">{{ p.fecha }} · S/ {{ p.total }} · {{ p.estado }}</div>
            <div class="small">{{ itemsTxt(p) }}</div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
})
export class ClienteDetailPage implements OnInit {
  private api = inject(AdminClientesService);
  private route = inject(ActivatedRoute);
  c: any = null;
  loading = true;
  error: string | null = null;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id') || 0);
    if (id < 1) {
      this.loading = false;
      this.error = 'Cliente no válido.';
      return;
    }
    this.api.detail(id).subscribe({
      next: (x) => {
        this.c = x;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo cargar el cliente.';
      },
    });
  }

  itemsTxt(p: any): string {
    return (p.items || []).map((i: any) => `${i.nombre} × ${i.cantidad}`).join(', ');
  }

  fmtFecha(raw?: string) {
    if (!raw) return '—';
    const s = String(raw).trim();
    const m = s.replace('T', ' ').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ ](\d{2}):(\d{2}))?/);
    if (m) return m[4] ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : `${m[3]}/${m[2]}/${m[1]}`;
    return s;
  }
}
