import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

type LogItem = {
  id: number;
  mensaje: string;
  tipo: string;
  n_productos: number;
  whatsapp: boolean | number;
  driver?: string;
  created_at: string;
};

@Component({
  standalone: true,
  selector: 'app-asistente-logs',
  imports: [CommonModule],
  template: `
    <div class="p-3">
      <h2 class="ed-page-title">Consultas Dori</h2>
      <p class="text-muted">
        Preguntas de clientes en el chat (sin saludos ni “gracias”). Sirve para ver qué buscan y qué hay que atender por WhatsApp.
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
            <th>Tipo</th>
            <th>Productos</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of items">
            <td class="text-nowrap">{{ r.created_at | date:'short' }}</td>
            <td>{{ r.mensaje }}</td>
            <td>
              <span *ngIf="r.whatsapp" class="badge bg-success">WhatsApp</span>
              <span *ngIf="r.tipo === 'sin_producto' && !r.whatsapp" class="badge bg-warning text-dark">Sin catálogo</span>
              <span *ngIf="r.tipo === 'catalogo'" class="badge bg-secondary">Catálogo</span>
            </td>
            <td>{{ r.n_productos }}</td>
          </tr>
          <tr *ngIf="!items.length">
            <td colspan="4" class="text-muted">Aún no hay consultas. Escribe algo en Dori (tienda) y recarga esta página.</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
})
export class AsistenteLogsPage implements OnInit {
  private http = inject(HttpClient);
  items: LogItem[] = [];
  stats = { total: 0, sin_producto: 0, whatsapp: 0 };

  ngOnInit() {
    this.http.get<{ items: LogItem[]; stats: { total: number; sin_producto: number; whatsapp: number } }>(`${environment.apiBaseUrl}/admin/asistente-logs`).subscribe({
      next: (r) => {
        this.items = r.items || [];
        this.stats = r.stats || this.stats;
      },
      error: () => {},
    });
  }
}
