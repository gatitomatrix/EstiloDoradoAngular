import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { RealtimeService } from '../../../../core/services/realtime.service';
import { AdminInventarioService } from '../services/admin-inventario.service';
import { AdminProductosService, Producto } from '../../productos/services/admin-productos.service';

@Component({
  standalone: true,
  selector: 'app-inventario-list',
  imports: [CommonModule, FormsModule],
  template: `
  <div class="p-3">
    <h2 class="mb-2">Inventario</h2>
    <p class="text-muted small mb-3">
      El stock de productos solo cambia aquí. Las ventas <strong>reservan</strong> unidades;
      la <strong>salida</strong> se confirma cuando el pedido se marca como entregado.
    </p>

    <div class="alert alert-warning py-2" *ngIf="criticos().length">
      <strong>Reposición:</strong>
      <span *ngFor="let c of criticos(); let last = last">
        {{ c.nombre }} ({{ c.stock }})<span *ngIf="!last"> · </span>
      </span>
    </div>

    <form class="row g-2 mb-3 align-items-end" (ngSubmit)="buscar()">
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
            <td>{{ m.fecha | date:'short' }}</td>
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
                <select class="form-select" [(ngModel)]="mov.id_producto" name="id_producto" required>
                  <option [ngValue]="undefined">Seleccione...</option>
                  <option *ngFor="let p of productos()" [ngValue]="p.id_producto">{{ p.nombre }} (stock {{ p.stock }})</option>
                </select>
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
  `]
})
export class InventarioListPage implements OnInit {
  private api = inject(AdminInventarioService);
  private rt  = inject(RealtimeService);
  private prodApi = inject(AdminProductosService);

  q: any = { page: 1, per_page: 25, tipo: undefined, fecha_desde: undefined, fecha_hasta: undefined };
  rows = signal<any[]>([]);
  criticos = signal<any[]>([]);
  productos = signal<Producto[]>([]);

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
      hasta: this.q.fecha_hasta
    };
    this.api.list(params).subscribe(res => {
      this.rows.set(res?.data ?? []);
      this.criticos.set(res?.criticos ?? []);
    });
  }

  emptyMov() {
    return { id_producto: undefined, cantidad: undefined, fecha: undefined, observacion: '', sentido: '-' };
  }

  openModal(modo: 'entrada' | 'ajuste') {
    this.modo = modo;
    this.mov = this.emptyMov();
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
    const payload = {
      id_producto: Number(this.mov.id_producto),
      cantidad: this.modo === 'ajuste' && this.mov.sentido === '-' ? -qty : qty,
      observacion: this.mov.observacion?.trim() || (this.modo === 'entrada' ? 'Ingreso de mercadería' : 'Ajuste'),
      referencia_tipo: (this.modo === 'entrada' ? 'compra' : 'ajuste') as 'compra' | 'ajuste',
      fecha: this.mov.fecha || undefined,
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
