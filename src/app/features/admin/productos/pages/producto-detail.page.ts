import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminProductosService, Producto } from '../services/admin-productos.service';

@Component({
  standalone: true,
  selector: 'app-producto-detail',
  imports: [CommonModule, RouterLink],
  styles: [`
    .ed-detail { max-width: 860px; }
    .ed-detail img {
      width: 100%; max-height: 320px; object-fit: cover;
      border-radius: 12px; background: #eee;
    }
    .ed-k { color: #6c757d; font-size: .85rem; }
  `],
  template: `
    <div class="p-3 ed-detail">
      <div class="mb-3 d-flex gap-2 flex-wrap">
        <a routerLink="/admin/consultas-dori" class="btn btn-sm btn-outline-secondary">← Consultas Dori</a>
        <a routerLink="/admin/productos" class="btn btn-sm btn-outline-secondary">Catálogo</a>
      </div>

      <p *ngIf="err()" class="text-danger">{{ err() }}</p>
      <p *ngIf="!prod() && !err()">Cargando…</p>

      <ng-container *ngIf="prod() as p">
        <div class="row g-4">
          <div class="col-md-5">
            <img [src]="p.imagen_url || 'assets/img/no-image.png'" [alt]="p.nombre" />
          </div>
          <div class="col-md-7">
            <h2 class="ed-page-title mb-1">{{ p.nombre }}</h2>
            <p class="ed-k mb-2">Código interno #{{ p.id_producto }}</p>
            <p>{{ p.descripcion || 'Sin descripción' }}</p>
            <p class="mb-1"><strong>S/ {{ p.precio_venta }}</strong> · Stock {{ p.stock }}</p>
            <p class="mb-1" *ngIf="p.etiquetas"><span class="ed-k">Etiquetas:</span> {{ p.etiquetas }}</p>
            <p class="mb-3"><span class="badge" [class.bg-success]="p.estado==='activo'" [class.bg-secondary]="p.estado!=='activo'">{{ p.estado }}</span></p>
            <button type="button" class="btn btn-dark" (click)="editar(p.id_producto)">Editar en catálogo</button>
          </div>
        </div>
      </ng-container>
    </div>
  `,
})
export class ProductoDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(AdminProductosService);

  prod = signal<Producto | null>(null);
  err = signal('');

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.err.set('Producto no válido');
      return;
    }
    this.api.get(id).subscribe({
      next: (p) => this.prod.set(p),
      error: () => this.err.set('No se encontró el producto.'),
    });
  }

  editar(id: number) {
    this.router.navigate(['/admin/productos'], { queryParams: { editar: id } });
  }
}
