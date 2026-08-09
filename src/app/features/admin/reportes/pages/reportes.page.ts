import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminReportesService } from '../../../../core/services/admin-reportes.service';

@Component({
  standalone: true,
  selector: 'app-reportes',
  imports: [CommonModule],
  template: `
  <div>
    <h2 class="ed-page-title">Reportes</h2>
    <p class="ed-page-sub">
      Exporta listados de la tienda para respaldo, contabilidad o análisis.
      Hoy el backend genera <strong>CSV</strong> (Excel lo abre bien). XLSX y PDF aún no están en el servidor.
    </p>

    <div class="ed-report-grid">
      <div class="ed-report-card" *ngFor="let g of groups">
        <div class="ed-report-card-title">{{ g.label }}</div>
        <p class="ed-report-card-desc">{{ g.desc }}</p>
        <div class="ed-report-actions">
          <button type="button" class="ed-report-btn ed-report-btn--primary" (click)="dl(g.key, 'csv')">
            Descargar CSV
          </button>
          <button type="button" class="ed-report-btn ed-report-btn--muted" (click)="dl(g.key, 'xlsx')" title="Pendiente en backend">
            XLSX
          </button>
          <button type="button" class="ed-report-btn ed-report-btn--muted" (click)="dl(g.key, 'pdf')" title="Pendiente en backend">
            PDF
          </button>
        </div>
      </div>
    </div>

    <div class="ed-alert-stock mt-3" *ngIf="msg()" style="margin-top:1rem">{{ msg() }}</div>
  </div>
  `,
  styles: [`
    .ed-report-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1rem;
    }
    .ed-report-card {
      background: #FFFEFA;
      border: 1px solid #E7DAC6;
      border-radius: 1rem;
      padding: 1.1rem 1.15rem;
      box-shadow: 0 8px 24px rgba(32, 22, 11, 0.06);
    }
    .ed-report-card-title {
      font-weight: 800;
      color: #2D2418;
      margin-bottom: .35rem;
    }
    .ed-report-card-desc {
      font-size: .85rem;
      color: #8A7B65;
      margin: 0 0 .9rem;
      min-height: 2.4em;
    }
    .ed-report-actions {
      display: flex;
      flex-wrap: wrap;
      gap: .45rem;
    }
    .ed-report-btn {
      border-radius: .5rem;
      padding: .4rem .7rem;
      font-size: .82rem;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .ed-report-btn--primary {
      background: linear-gradient(180deg, #E8C547, #D4AF37);
      border-color: #BE9830;
      color: #1A1208;
    }
    .ed-report-btn--muted {
      background: #fff;
      border-color: #E7DAC6;
      color: #8A7B65;
    }
    .ed-report-btn--muted:hover { border-color: #D4AF37; color: #2D2418; }
  `],
})
export class ReportesPage {
  private api = inject(AdminReportesService);
  msg = signal<string | undefined>(undefined);

  groups: Array<{
    key: 'clientes' | 'productos' | 'pedidos' | 'inventario';
    label: string;
    desc: string;
  }> = [
    { key: 'clientes', label: 'Clientes', desc: 'Lista de clientes registrados (nombre, contacto, fecha).' },
    { key: 'productos', label: 'Productos', desc: 'Catálogo con precios y stock actual.' },
    { key: 'pedidos', label: 'Pedidos', desc: 'Órdenes con estado, total y fecha.' },
    { key: 'inventario', label: 'Inventario', desc: 'Movimientos de entrada/salida y responsable.' },
  ];

  dl(tipo: 'productos' | 'pedidos' | 'inventario' | 'clientes', ext: 'csv' | 'xlsx' | 'pdf') {
    this.msg.set(undefined);
    const map = {
      clientes: this.api.downloadClientes.bind(this.api),
      productos: this.api.downloadProductos.bind(this.api),
      pedidos: this.api.downloadPedidos.bind(this.api),
      inventario: this.api.downloadInventario.bind(this.api),
    };
    map[tipo](ext).subscribe({
      next: (blob) => this.downloadBlob(blob, `reporte_${tipo}.${ext}`),
      error: () =>
        this.msg.set(
          ext === 'csv'
            ? 'No se pudo descargar el CSV. Revisa que Laravel esté corriendo y estés logueado como admin.'
            : `El formato ${ext.toUpperCase()} aún no está implementado en el backend. Usa CSV por ahora.`,
        ),
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
    this.msg.set(`Descarga lista: ${filename}`);
  }
}
