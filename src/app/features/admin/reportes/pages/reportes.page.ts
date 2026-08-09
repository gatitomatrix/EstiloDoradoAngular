import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminReportesService } from '../../../../core/services/admin-reportes.service';

type ReportKey = 'clientes' | 'productos' | 'pedidos' | 'inventario';
type ReportExt = 'csv' | 'xlsx' | 'pdf';

interface ReportGroup {
  key: ReportKey;
  label: string;
  desc: string;
  icon: string;
  accent: string;
}

@Component({
  standalone: true,
  selector: 'app-reportes',
  imports: [CommonModule],
  template: `
  <div class="ed-rep">
    <header class="ed-rep-head">
      <div>
        <h2 class="ed-page-title">Reportes</h2>
        <p class="ed-page-sub">
          Descarga listados del negocio en CSV, Excel (XLSX) o PDF.
          Úsalos para contabilidad, inventario o sustentación.
        </p>
      </div>
    </header>

    <div class="ed-rep-grid">
      <article class="ed-rep-card" *ngFor="let g of groups" [style.--accent]="g.accent">
        <div class="ed-rep-card-top">
          <span class="ed-rep-icon" aria-hidden="true">{{ g.icon }}</span>
          <div>
            <h3 class="ed-rep-card-title">{{ g.label }}</h3>
            <p class="ed-rep-card-desc">{{ g.desc }}</p>
          </div>
        </div>

        <div class="ed-rep-actions" role="group" [attr.aria-label]="'Formatos de ' + g.label">
          <button
            type="button"
            class="ed-fmt ed-fmt--csv"
            [disabled]="busyKey() === g.key + ':csv'"
            (click)="dl(g.key, 'csv')"
          >
            <span class="ed-fmt-label">CSV</span>
            <span class="ed-fmt-hint">Excel / hojas</span>
            <span class="ed-fmt-spin" *ngIf="busyKey() === g.key + ':csv'">…</span>
          </button>

          <button
            type="button"
            class="ed-fmt ed-fmt--xlsx"
            [disabled]="busyKey() === g.key + ':xlsx'"
            (click)="dl(g.key, 'xlsx')"
          >
            <span class="ed-fmt-label">Excel</span>
            <span class="ed-fmt-hint">.xlsx</span>
            <span class="ed-fmt-spin" *ngIf="busyKey() === g.key + ':xlsx'">…</span>
          </button>

          <button
            type="button"
            class="ed-fmt ed-fmt--pdf"
            [disabled]="busyKey() === g.key + ':pdf'"
            (click)="dl(g.key, 'pdf')"
          >
            <span class="ed-fmt-label">PDF</span>
            <span class="ed-fmt-hint">Imprimible</span>
            <span class="ed-fmt-spin" *ngIf="busyKey() === g.key + ':pdf'">…</span>
          </button>
        </div>
      </article>
    </div>

    <div
      class="ed-rep-toast"
      *ngIf="msg()"
      [class.ed-rep-toast--ok]="msgOk()"
      [class.ed-rep-toast--err]="!msgOk()"
      role="status"
    >
      {{ msg() }}
    </div>
  </div>
  `,
  styles: [`
    .ed-rep { max-width: 1100px; }

    .ed-rep-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.1rem;
    }

    .ed-rep-card {
      background: #FFFEFA;
      border: 1px solid #E7DAC6;
      border-radius: 1.05rem;
      padding: 1.15rem 1.2rem 1.2rem;
      box-shadow: 0 10px 28px rgba(32, 22, 11, 0.07);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      position: relative;
      overflow: hidden;
    }
    .ed-rep-card::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 4px;
      background: var(--accent, #D4AF37);
    }

    .ed-rep-card-top {
      display: flex;
      gap: .85rem;
      align-items: flex-start;
    }
    .ed-rep-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: .75rem;
      display: grid;
      place-items: center;
      font-size: 1.2rem;
      background: color-mix(in srgb, var(--accent, #D4AF37) 18%, #fff);
      flex-shrink: 0;
    }
    .ed-rep-card-title {
      margin: 0 0 .25rem;
      font-size: 1.05rem;
      font-weight: 800;
      color: #2D2418;
    }
    .ed-rep-card-desc {
      margin: 0;
      font-size: .86rem;
      color: #8A7B65;
      line-height: 1.4;
    }

    .ed-rep-actions {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: .45rem;
    }

    .ed-fmt {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: .1rem;
      min-height: 3.4rem;
      border-radius: .7rem;
      border: 1.5px solid #E7DAC6;
      background: #fff;
      cursor: pointer;
      padding: .45rem .3rem;
      transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease, background .12s ease;
      position: relative;
    }
    .ed-fmt:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 14px rgba(32, 22, 11, 0.1);
    }
    .ed-fmt:disabled {
      opacity: .65;
      cursor: wait;
    }
    .ed-fmt-label {
      font-size: .82rem;
      font-weight: 800;
      letter-spacing: .02em;
    }
    .ed-fmt-hint {
      font-size: .68rem;
      color: #8A7B65;
      font-weight: 500;
    }
    .ed-fmt-spin {
      position: absolute;
      top: 4px;
      right: 6px;
      font-size: .75rem;
      color: #8A7B65;
    }

    .ed-fmt--csv {
      border-color: #D4AF37;
      background: linear-gradient(180deg, #FFF8E6 0%, #FFF 100%);
    }
    .ed-fmt--csv .ed-fmt-label { color: #8A6A12; }

    .ed-fmt--xlsx {
      border-color: #2E7D4F;
      background: linear-gradient(180deg, #EEF8F1 0%, #FFF 100%);
    }
    .ed-fmt--xlsx .ed-fmt-label { color: #1B5E38; }

    .ed-fmt--pdf {
      border-color: #B42318;
      background: linear-gradient(180deg, #FDF0EF 0%, #FFF 100%);
    }
    .ed-fmt--pdf .ed-fmt-label { color: #912018; }

    .ed-rep-toast {
      margin-top: 1.25rem;
      padding: .85rem 1rem;
      border-radius: .75rem;
      font-size: .9rem;
      font-weight: 600;
    }
    .ed-rep-toast--ok {
      background: #EEF8F1;
      border: 1px solid #A6D8B5;
      color: #1B5E38;
    }
    .ed-rep-toast--err {
      background: #FFF6E0;
      border: 1px solid #E8C547;
      color: #5C4A12;
    }

    @media (max-width: 420px) {
      .ed-rep-actions { grid-template-columns: 1fr; }
    }
  `],
})
export class ReportesPage {
  private api = inject(AdminReportesService);

  msg = signal<string | undefined>(undefined);
  msgOk = signal(true);
  busyKey = signal<string | null>(null);

  groups: ReportGroup[] = [
    {
      key: 'clientes',
      label: 'Clientes',
      desc: 'Registro de clientes: contacto, correo y fecha de alta.',
      icon: '👥',
      accent: '#D4AF37',
    },
    {
      key: 'productos',
      label: 'Productos',
      desc: 'Catálogo con precios, stock y estado de cada ítem.',
      icon: '🏷️',
      accent: '#3B82F6',
    },
    {
      key: 'pedidos',
      label: 'Pedidos',
      desc: 'Órdenes con cliente, estado, total y forma de pago.',
      icon: '🛒',
      accent: '#2E7D4F',
    },
    {
      key: 'inventario',
      label: 'Inventario',
      desc: 'Movimientos de stock y empleado responsable.',
      icon: '📦',
      accent: '#7C3AED',
    },
  ];

  dl(tipo: ReportKey, ext: ReportExt) {
    const key = `${tipo}:${ext}`;
    this.busyKey.set(key);
    this.msg.set(undefined);

    const map = {
      clientes: this.api.downloadClientes.bind(this.api),
      productos: this.api.downloadProductos.bind(this.api),
      pedidos: this.api.downloadPedidos.bind(this.api),
      inventario: this.api.downloadInventario.bind(this.api),
    };

    map[tipo](ext).subscribe({
      next: (blob) => {
        // Si el backend devolvió JSON de error con status 200 raro, o blob vacío
        if (blob.type?.includes('application/json')) {
          this.busyKey.set(null);
          this.msgOk.set(false);
          this.msg.set('El servidor respondió un error. Revisa Laravel y permisos de rol ADMIN.');
          return;
        }
        this.downloadBlob(blob, `reporte_${tipo}.${ext}`);
        this.busyKey.set(null);
        this.msgOk.set(true);
        this.msg.set(`Descarga lista: reporte_${tipo}.${ext}`);
      },
      error: async (err) => {
        this.busyKey.set(null);
        this.msgOk.set(false);
        let detail = '';
        try {
          const b = err?.error;
          if (b instanceof Blob) {
            const text = await b.text();
            const j = JSON.parse(text);
            detail = j?.error?.message || j?.message || '';
          }
        } catch {
          /* ignore */
        }
        this.msg.set(
          detail ||
            `No se pudo descargar ${ext.toUpperCase()} de ${tipo}. Verifica que Laravel esté en :8000 y que tu usuario tenga rol ADMIN.`,
        );
      },
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
  }
}
