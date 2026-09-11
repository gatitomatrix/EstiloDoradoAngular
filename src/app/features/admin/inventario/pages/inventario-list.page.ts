import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { RealtimeService } from '../../../../core/services/realtime.service';
import { AdminInventarioService } from '../services/admin-inventario.service';
import { AdminProductosService, Producto } from '../../productos/services/admin-productos.service';
import { FechaPePipe } from '../../../../core/pipes/fecha-pe.pipe';
import { AdminAuthService } from '../../../../core/services/admin-auth.service';

@Component({
  standalone: true,
  selector: 'app-inventario-list',
  imports: [CommonModule, FormsModule, FechaPePipe],
  template: `
  <div class="p-3">
    <h2 class="mb-2">Inventario</h2>
    <p class="text-muted small mb-3">
      El stock de productos solo cambia aquí. Las ventas <strong>reservan</strong> unidades;
      la <strong>salida</strong> se confirma cuando el pedido se marca como entregado.
    </p>

    <div class="alert alert-warning py-2 ed-repo" *ngIf="criticos().length">
      <strong>Reposición:</strong>
      <span class="small text-muted">clic para registrar ingreso ·</span>
      <button
        type="button"
        class="ed-repo-chip"
        *ngFor="let c of criticos()"
        [class.ed-repo-chip--out]="(c.stock ?? 0) <= 0"
        (click)="openIngreso(c)"
        [title]="'Registrar ingreso de ' + c.nombre"
      >
        {{ c.nombre }} (#{{ c.id_producto }}) · {{ c.stock }}
      </button>
    </div>

    <form class="row g-2 mb-3 align-items-end" (ngSubmit)="buscar()">
      <div class="col-sm-3">
        <label class="form-label small">Producto (nombre o ID)</label>
        <input class="form-control" [(ngModel)]="q.search" name="search" placeholder="Ej. Hot Wheels o 18">
      </div>
      <div class="col-sm-2">
        <label class="form-label small">Tipo</label>
        <select class="form-select" [(ngModel)]="q.tipo" name="tipo">
          <option [ngValue]="undefined">Todos</option>
          <option value="entrada">Entrada</option>
          <option value="reserva">Reserva</option>
          <option value="salida">Salida</option>
          <option value="liberacion">Liberación</option>
          <option value="devolucion">Devolución</option>
          <option value="ajuste">Ajuste</option>
        </select>
      </div>
      <div class="col-sm-2">
        <label class="form-label small">Desde</label>
        <input type="date" class="form-control" [(ngModel)]="q.fecha_desde" name="desde">
      </div>
      <div class="col-sm-2">
        <label class="form-label small">Hasta</label>
        <input type="date" class="form-control" [(ngModel)]="q.fecha_hasta" name="hasta">
      </div>
      <div class="col-sm-2">
        <label class="form-label small">Resultados</label>
        <select class="form-select" [(ngModel)]="q.per_page" name="per_page">
          <option [ngValue]="-1">Todos</option>
          <option [ngValue]="25">25</option>
          <option [ngValue]="50">50</option>
        </select>
      </div>
      <div class="col-sm-4 d-flex gap-2">
        <button class="btn btn-dark">Filtrar</button>
        <button type="button" class="btn btn-warning" (click)="openModal('entrada')">Registrar ingreso</button>
        <button type="button" class="btn btn-outline-dark" (click)="openModal('ajuste')">Ajuste</button>
      </div>
    </form>

    <div class="table-responsive">
      <table class="table table-sm align-middle">
        <thead>
          <tr>
            <th>ID</th>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Motivo / ref.</th>
            <th>Empleado</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let m of rows()">
            <td>{{ m.id_movimiento }}</td>
            <td>{{ m.fecha | fechaPe:true }}</td>
            <td>{{ etiquetaTipo(m.tipo_movimiento) }}</td>
            <td>{{ m.producto_nombre }} <span class="text-muted">#{{ m.id_producto }}</span></td>
            <td>{{ m.cantidad }}</td>
            <td>
              {{ m.observacion || '—' }}
              <div class="small text-muted" *ngIf="m.referencia_tipo">
                {{ m.referencia_tipo }}<ng-container *ngIf="m.referencia_id"> #{{ m.referencia_id }}</ng-container>
              </div>
            </td>
            <td>{{ m.empleado_nombre || '—' }}</td>
          </tr>
          <tr *ngIf="!rows().length">
            <td colspan="7" class="text-muted">Sin movimientos en este filtro. Prueba “Todos” y deja las fechas vacías.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="modal-backdrop fade show" *ngIf="modalOpen"></div>
  <div class="modal d-block" tabindex="-1" *ngIf="modalOpen">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <form (ngSubmit)="submitMovimiento()">
          <div class="modal-header">
            <h5 class="modal-title">{{ modo === 'ajuste' ? 'Ajuste de inventario' : 'Registrar ingreso' }}</h5>
            <button type="button" class="btn-close" (click)="closeModal()"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted" *ngIf="modo === 'entrada'">
              Compra o llegada a tienda. Sube el stock y queda en el kardex como entrada.
            </p>
            <p class="small text-muted" *ngIf="modo === 'ajuste'">
              Merma, rotura o conteo físico. El motivo es obligatorio. Las salidas de venta se generan al marcar el pedido como entregado.
            </p>
            <div class="row g-3">
              <div class="col-md-8">
                <label class="form-label">Producto</label>
                <input
                  class="form-control"
                  [(ngModel)]="prodQuery"
                  name="prod_query"
                  autocomplete="off"
                  placeholder="Escribe nombre o ID"
                  (focus)="prodPickOpen = true"
                  (input)="onProdQuery()"
                />
                <div class="ed-pick" *ngIf="prodPickOpen && productosFiltrados().length">
                  <button type="button" class="ed-pick__item" *ngFor="let p of productosFiltrados()" (mousedown)="elegirProducto(p)">
                    <strong>#{{ p.id_producto }}</strong>
                    <span>{{ p.nombre }}</span>
                    <small>stock {{ p.stock }}</small>
                  </button>
                </div>
                <div class="small text-muted mt-1" *ngIf="productoElegido()">
                  Seleccionado: #{{ productoElegido()!.id_producto }} · {{ productoElegido()!.nombre }} (stock {{ productoElegido()!.stock }})
                </div>
              </div>
              <div class="col-md-4">
                <label class="form-label">Cantidad</label>
                <input type="number" class="form-control" [(ngModel)]="mov.cantidad" name="cantidad" required min="1">
              </div>
              <div class="col-md-4" *ngIf="modo === 'ajuste'">
                <label class="form-label">Sentido</label>
                <select class="form-select" [(ngModel)]="mov.sentido" name="sentido">
                  <option value="-">Merma / baja</option>
                  <option value="+">Sobra / alta</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label">Fecha</label>
                <input type="date" class="form-control" [(ngModel)]="mov.fecha" name="fecha">
              </div>
              <div class="col-md-8" *ngIf="modo === 'entrada'">
                <label class="form-label">Referencia de compra</label>
                <input type="text" class="form-control" [(ngModel)]="mov.referencia_compra" name="referencia_compra"
                  placeholder="Ej. Factura F001-123 o guía (opcional)">
              </div>
              <div class="col-12">
                <label class="form-label">Motivo</label>
                <input type="text" class="form-control" [(ngModel)]="mov.observacion" name="observacion"
                  [placeholder]="modo === 'ajuste' ? 'Ej. rotura, conteo físico' : 'Ej. compra a proveedor'">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-dark" [disabled]="saving || !mov.id_producto || !mov.cantidad">Guardar</button>
            <button type="button" class="btn btn-outline-secondary" (click)="closeModal()">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5); }
    .modal { position: fixed; inset: 0; overflow-y: auto; }
    .ed-repo { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .ed-repo-chip {
      border: 1px solid #E8C547;
      background: #FFF8E6;
      color: #5C4A12;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .ed-repo-chip:hover { background: #C9A227; color: #1a1408; }
    .ed-repo-chip--out {
      border-color: #E2A0A0;
      background: #FDECEC;
      color: #8B1E1E;
    }
    .ed-repo-chip--out:hover { background: #8B1E1E; color: #fff; }
    .ed-pick {
      max-height: 220px; overflow: auto; margin-top: 4px;
      border: 1px solid #E7DAC6; border-radius: 8px; background: #fff;
    }
    .ed-pick__item {
      display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap;
      width: 100%; text-align: left; border: 0; border-bottom: 1px solid #f3e6d0;
      background: transparent; padding: 8px 10px; cursor: pointer;
    }
    .ed-pick__item:last-child { border-bottom: 0; }
    .ed-pick__item:hover { background: #FFF8E6; }
    .ed-pick__item small { color: #6b5d4d; margin-left: auto; }
  `]
})
export class InventarioListPage implements OnInit {
  // Kardex. Entrada = compra. Ajuste = merma/conteo. La venta sale al marcar Entregado en Pedidos.
  private api = inject(AdminInventarioService);
  private rt  = inject(RealtimeService);
  private prodApi = inject(AdminProductosService);
  private auth = inject(AdminAuthService);

  q: any = { page: 1, per_page: 25, tipo: undefined, fecha_desde: undefined, fecha_hasta: undefined, search: '' };
  rows = signal<any[]>([]);
  criticos = signal<any[]>([]);
  productos = signal<Producto[]>([]);
  prodQuery = '';
  prodPickOpen = false;

  modalOpen = false;
  saving = false;
  modo: 'entrada' | 'ajuste' = 'entrada';
  mov: any = this.emptyMov();

  ngOnInit() {
    this.buscar();
    this.cargarProductos();
    this.rt.connectSSE();
    this.rt.onStockUpdated().subscribe(() => { this.buscar(); this.cargarProductos(); });
    this.rt.onStockAlertLow().subscribe(() => { this.buscar(); });
  }

  etiquetaTipo(t: string) {
    const map: Record<string, string> = {
      entrada: 'Entrada',
      reserva: 'Reserva (pedido)',
      salida: 'Salida (entregado)',
      liberacion: 'Liberación',
      devolucion: 'Devolución',
      ajuste: 'Ajuste',
    };
    return map[t] || t;
  }

  cargarProductos() {
    this.prodApi.list({ per_page: -1, sort: 'nombre', order: 'asc' })
      .subscribe(res => this.productos.set(res?.data ?? res ?? []));
  }

  buscar() {
    const params = {
      page: this.q.page,
      per_page: this.q.per_page,
      tipo_movimiento: this.q.tipo,
      desde: this.q.fecha_desde,
      hasta: this.q.fecha_hasta,
      q: (this.q.search || '').trim() || undefined,
    };
    this.api.list(params).subscribe(res => {
      this.rows.set(res?.data ?? []);
      this.criticos.set(res?.criticos ?? []);
    });
  }

  emptyMov() {
    return { id_producto: undefined, cantidad: undefined, fecha: this.hoy(), observacion: '', sentido: '-', referencia_compra: '' };
  }

  hoy() {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  productosFiltrados(): Producto[] {
    const q = (this.prodQuery || '').trim().toLowerCase();
    const list = this.productos();
    if (!q) return list.slice(0, 12);
    return list.filter((p) => {
      const id = String(p.id_producto);
      const name = (p.nombre || '').toLowerCase();
      return id === q || id.startsWith(q) || name.includes(q);
    }).slice(0, 12);
  }

  productoElegido(): Producto | undefined {
    const id = Number(this.mov?.id_producto);
    if (!id) return undefined;
    return this.productos().find((p) => p.id_producto === id);
  }

  onProdQuery() {
    this.prodPickOpen = true;
    const q = (this.prodQuery || '').trim();
    if (/^\d+$/.test(q)) {
      const hit = this.productos().find((p) => String(p.id_producto) === q);
      if (hit) this.mov.id_producto = hit.id_producto;
    }
  }

  elegirProducto(p: Producto) {
    this.mov.id_producto = p.id_producto;
    this.prodQuery = `#${p.id_producto} · ${p.nombre}`;
    this.prodPickOpen = false;
  }

  openModal(modo: 'entrada' | 'ajuste') {
    this.modo = modo;
    this.mov = this.emptyMov();
    this.prodQuery = '';
    this.prodPickOpen = true;
    this.modalOpen = true;
  }

  openIngreso(c: { id_producto?: number; id?: number; nombre?: string }) {
    this.modo = 'entrada';
    this.mov = this.emptyMov();
    this.mov.id_producto = c.id_producto ?? c.id;
    this.mov.observacion = c.nombre ? `Reposición · ${c.nombre}` : 'Reposición';
    const p = this.productoElegido();
    this.prodQuery = p ? `#${p.id_producto} · ${p.nombre}` : (c.nombre || '');
    this.prodPickOpen = false;
    this.modalOpen = true;
  }
  closeModal() { this.modalOpen = false; }

  submitMovimiento() {
    if (!this.mov?.id_producto || !this.mov?.cantidad) return;
    if (this.modo === 'ajuste' && !(this.mov.observacion || '').trim()) {
      alert('En un ajuste el motivo es obligatorio.');
      return;
    }
    this.saving = true;
    const qty = Math.abs(Number(this.mov.cantidad));
    const motivo = this.mov.observacion?.trim() || (this.modo === 'entrada' ? 'Ingreso de mercadería' : 'Ajuste');
    const ref = (this.mov.referencia_compra || '').trim();
    const payload = {
      id_producto: Number(this.mov.id_producto),
      cantidad: this.modo === 'ajuste' && this.mov.sentido === '-' ? -qty : qty,
      observacion: this.modo === 'entrada' && ref ? `${motivo} · Ref. compra: ${ref}` : motivo,
      referencia_tipo: (this.modo === 'entrada' ? 'compra' : 'ajuste') as 'compra' | 'ajuste',
      fecha: this.mov.fecha || undefined,
      id_empleado: this.auth.getEmpleadoId() ?? undefined,
    };
    const req$ = this.modo === 'entrada' ? this.api.entrada(payload) : this.api.ajuste(payload);
    req$.subscribe({
      next: () => {
        this.saving = false;
        this.closeModal();
        this.buscar();
        this.cargarProductos();
      },
      error: (e) => {
        this.saving = false;
        alert(e?.error?.message || 'No se pudo guardar el movimiento.');
      }
    });
  }
}
