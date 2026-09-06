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
  likes: number;
  dislikes: number;
  carritos: number;
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
    .ed-stat { min-width: 120px; }
  `],
  template: `
    <div class="p-3">
      <h2 class="ed-page-title">Interés Dori</h2>
      <p class="text-muted">
        Ranking de productos que Dori mostró en el chat de la tienda.
        “Veces mostrados” es cuántas conversaciones los recomendó.
        El cliente puede marcar 👍 o 👎 en la tarjeta; “Agregados al carrito” es cuando dijo que sí en el chat.
        Sirve para ver qué se consulta más y qué conviene destacar o reponer.
      </p>
      <div class="d-flex gap-3 mb-3 flex-wrap">
        <div class="card p-3 ed-stat"><strong>{{ stats.productos }}</strong><div class="small">Productos</div></div>
        <div class="card p-3 ed-stat"><strong>{{ stats.consultas }}</strong><div class="small">Veces mostrados</div></div>
        <div class="card p-3 ed-stat"><strong>{{ stats.likes }}</strong><div class="small">Me gusta</div></div>
        <div class="card p-3 ed-stat"><strong>{{ stats.carritos }}</strong><div class="small">Agregados al carrito</div></div>
      </div>
      <div class="ed-grid" *ngIf="items.length">
        <article class="ed-card" *ngFor="let p of items">
          <img [src]="p.imagen_url || '/assets/img/no-image.png'" [alt]="p.nombre" />
          <div class="ed-body">
            <h3>{{ p.nombre }}</h3>
            <p class="ed-meta">
              <span *ngIf="p.precio != null">S/ {{ p.precio | number:'1.2-2' }}</span>
              <span *ngIf="p.stock != null"> · stock {{ p.stock }}</span>
            </p>
            <div class="ed-kpis">
              <span>{{ p.consultas }} consultas</span>
              <span>👍 {{ p.likes }}</span>
              <span>👎 {{ p.dislikes }}</span>
              <span>🛒 {{ p.carritos }}</span>
            </div>
            <a class="btn btn-sm btn-dark mt-2" [routerLink]="['/panel-ed-k7m2/productos', p.id]">Ver en catálogo</a>
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
  stats = { productos: 0, consultas: 0, likes: 0, carritos: 0 };

  ngOnInit() {
    this.http.get<{ items: Item[]; stats: { productos: number; consultas: number; likes: number; carritos: number } }>(`${environment.apiBaseUrl}/admin/asistente-interes`).subscribe({
      next: (r) => {
        this.items = r.items || [];
        this.stats = r.stats || this.stats;
      },
      error: () => {},
    });
  }
}
