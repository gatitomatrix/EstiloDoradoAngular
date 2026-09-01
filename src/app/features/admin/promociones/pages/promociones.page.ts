import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { UiService } from '../../../../core/services/ui.service';

@Component({
  selector: 'ed-promociones-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="ed-promo">
      <h2>Promociones</h2>
      <p class="lead">
        Activa un descuento de temporada para toda la tienda (la cinta de la web)
        o deja 0% y usa el % por producto en Catálogo → Productos.
      </p>

      <div class="card p-4" *ngIf="form as f">
        <div class="form-check form-switch mb-3">
          <input class="form-check-input" type="checkbox" id="act" [(ngModel)]="f.activo" />
          <label class="form-check-label" for="act">Campaña activa</label>
        </div>
        <div class="mb-3">
          <label class="form-label">Título interno</label>
          <input class="form-control" [(ngModel)]="f.titulo" maxlength="120" />
        </div>
        <div class="mb-3">
          <label class="form-label">Texto de la cinta (web)</label>
          <input class="form-control" [(ngModel)]="f.texto_cinta" maxlength="255"
            placeholder="Ej. ¡35% de descuento en arreglos florales por primavera!" />
        </div>
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label">Porcentaje %</label>
            <input class="form-control" type="number" min="0" max="90" step="1" [(ngModel)]="f.porcentaje" />
          </div>
          <div class="col-md-4">
            <label class="form-label">Desde</label>
            <input class="form-control" type="date" [(ngModel)]="f.fecha_inicio" />
          </div>
          <div class="col-md-4">
            <label class="form-label">Hasta</label>
            <input class="form-control" type="date" [(ngModel)]="f.fecha_fin" />
          </div>
        </div>
        <p class="small text-muted mt-3 mb-0">
          Si un producto tiene su propio %, se aplica el mayor entre el producto y esta campaña.
          Culqi cobra el precio ya rebajado. Precio de lista no se modifica.
        </p>
        <button class="btn btn-dark mt-3" type="button" [disabled]="saving()" (click)="save()">
          {{ saving() ? 'Guardando…' : 'Guardar promoción' }}
        </button>
      </div>
    </section>
  `,
  styles: [`
    .ed-promo { max-width: 720px; }
    .ed-promo h2 { font-family: Georgia, serif; color: #2D2418; }
    .lead { color: #5c4e3a; }
    .card { background: #fffaf2; border: 1px solid #e7dac6; border-radius: 12px; }
  `],
})
export class PromocionesPage implements OnInit {
  private http = inject(HttpClient);
  private ui = inject(UiService);
  private base = `${environment.apiBaseUrl}/admin/promocion`;
  form: {
    titulo: string;
    texto_cinta: string;
    porcentaje: number;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    activo: boolean;
  } | null = null;
  saving = signal(false);

  ngOnInit() {
    this.http.get<any>(this.base).subscribe({
      next: (r) => {
        this.form = {
          titulo: r.titulo || 'Campaña de temporada',
          texto_cinta: r.texto_cinta || '',
          porcentaje: Number(r.porcentaje || 0),
          fecha_inicio: r.fecha_inicio ? String(r.fecha_inicio).slice(0, 10) : null,
          fecha_fin: r.fecha_fin ? String(r.fecha_fin).slice(0, 10) : null,
          activo: !!r.activo,
        };
      },
      error: () => this.ui.err('No se pudo cargar la promoción. ¿php artisan migrate?'),
    });
  }

  save() {
    if (!this.form) return;
    this.saving.set(true);
    this.http.put(this.base, this.form).subscribe({
      next: () => { this.saving.set(false); this.ui.ok('Promoción guardada'); },
      error: (e) => {
        this.saving.set(false);
        this.ui.err(e?.error?.message || 'No se pudo guardar');
      },
    });
  }
}
