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
    <h2 class="mb-3">Inventario</h2>

    <form class="row g-2 mb-3 align-items-end" (ngSubmit)="buscar()">
      <div class="col-sm-2">
        <label class="form-label small">Tipo</label>
        <select class="form-select" [(ngModel)]="q.tipo" name="tipo">
          <option [ngValue]="undefined">Todos</option>
          <option value="entrada">Entrada</option>
          <option value="salida">Salida</option>
        </select>
      </div>
      <div class="col-sm-3">
        <label class="form-label small">Desde</label>
        <input type="date" class="form-control" [(ngModel)]="q.fecha_desde" name="desde">
      </div>
      <div class="col-sm-3">
        <label class="form-label small">Hasta</label>
        <input type="date" class="form-control" [(ngModel)]="q.fecha_hasta" name="hasta">
      </div>
      <div class="col-sm-2">
        <label class="form-label small">Resultados</label>
        <select class="form-select" [(ngModel)]="q.per_page" name="per_page">
          <option [ngValue]="-1">Todos</option>
          <option [ngValue]="10">10</option>
          <option [ngValue]="25">25</option>
          <option [ngValue]="50">50</option>
          <option [ngValue]="100">100</option>
        </select>
      </div>
      <div class="col-sm-2 d-flex gap-2">
        <button class="btn btn-dark flex-fill">Filtrar</button>
        <button type="button" class="btn btn-outline-dark" (click)="openModal()">Ajustar</button>
      </div>
    </form>

    <div class="table-responsive">
      <table class="table table-sm align-middle">
        <thead>
          <tr>
            <th>ID</th>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>ID Prod.</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Ref</th>
            <th>Empleado</th>
            <th>Roles</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let m of rows()">
            <td>{{ m.id_movimiento }}</td>
            <td>{{ m.fecha | date:'short' }}</td>
            <td class="text-capitalize">{{ m.tipo_movimiento }}</td>
            <td>{{ m.id_producto }}</td>
            <td>{{ m.producto_nombre }}</td>
            <td>{{ m.cantidad }}</td>
            <td>
              {{ m.referencia_tipo || '-' }}
              <ng-container *ngIf="m.referencia_id"> #{{ m.referencia_id }}</ng-container>
            </td>
            <td>{{ m.empleado_nombre || '-' }}</td>
            <td>{{ (m.empleado_roles || '').split(',').join(', ') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="small text-muted">Realtime stock ticks: {{tick()}}</div>
  </div>

  <!-- Modal simple (Bootstrap-like) -->
  <div class="modal-backdrop fade show" *ngIf="modalOpen"></div>
  <div class="modal d-block" tabindex="-1" *ngIf="modalOpen">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <form (ngSubmit)="submitMovimiento()">
          <div class="modal-header">
            <h5 class="modal-title">Actualizar inventario</h5>
            <button type="button" class="btn-close" (click)="closeModal()"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Producto</label>
                <select class="form-select" [(ngModel)]="mov.id_producto" name="id_producto" required (change)="syncProductoId()">
                  <option [ngValue]="undefined">Seleccione...</option>
                  <option *ngFor="let p of productos()" [ngValue]="p.id_producto">{{ p.nombre }}</option>
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label">ID</label>
                <input class="form-control" [value]="mov.id_producto || ''" readonly>
              </div>
              <div class="col-md-4">
                <label class="form-label">Tipo</label>
                <select class="form-select" [(ngModel)]="mov.tipo" name="tipo" required>
                  <option [ngValue]="undefined">Seleccione...</option>
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                </select>
              </div>

              <div class="col-md-3">
                <label class="form-label">Cantidad</label>
                <input type="number" class="form-control" [(ngModel)]="mov.cantidad" name="cantidad" required>
              </div>
              <div class="col-md-3">
                <label class="form-label">Fecha</label>
                <input type="date" class="form-control" [(ngModel)]="mov.fecha" name="fecha">
              </div>
              <div class="col-md-6">
                <label class="form-label">Observación</label>
                <input type="text" class="form-control" [(ngModel)]="mov.observacion" name="observacion" placeholder="Opcional">
              </div>

              <div class="col-md-4">
                <label class="form-label">Referencia tipo</label>
                <select class="form-select" [(ngModel)]="mov.referencia_tipo" name="referencia_tipo">
                  <option [ngValue]="undefined">-</option>
                  <option value="pedido">pedido</option>
                  <option value="ajuste">ajuste</option>
                  <option value="otro">otro</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label">Referencia ID</label>
                <input type="number" class="form-control" [(ngModel)]="mov.referencia_id" name="referencia_id" placeholder="N° pedido u otro">
              </div>

              <div class="col-md-4">
                <label class="form-label">Rol</label>
                <select class="form-select" [(ngModel)]="mov.rol" name="rol" (change)="syncEmpleadoId()">
                  <option [ngValue]="undefined">Seleccione...</option>
                  <option *ngFor="let r of roles" [ngValue]="r.value">{{ r.label }}</option>
                </select>
              </div>
              <div class="col-md-3">
                <label class="form-label">ID empleado</label>
                <input type="number" class="form-control" [(ngModel)]="mov.id_empleado" name="id_empleado" readonly>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-dark" [disabled]="saving || !mov.id_producto || !mov.tipo || !mov.cantidad">Aplicar</button>
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

  q: any = { page: 1, per_page: -1, tipo: undefined, fecha_desde: undefined, fecha_hasta: undefined };
  rows = signal<any[]>([]);
  tick = signal(0);

  productos = signal<Producto[]>([]);

  // Modal state
  modalOpen = false;
  saving = false;
  mov: any = {
    id_producto: undefined,
    tipo: undefined as 'entrada'|'salida'|undefined,
    cantidad: undefined,
    fecha: undefined as string | undefined,
    observacion: '',
    referencia_tipo: undefined as 'pedido'|'ajuste'|'otro'|undefined,
    referencia_id: undefined as number | undefined,
    rol: undefined as 'ADMIN'|'STOCK'|undefined,
    id_empleado: undefined as number | undefined,
  };

  roles = [
    { label: 'ADMIN', value: 'ADMIN', id: 1 },
    { label: 'STOCK', value: 'STOCK', id: 3 },
  ];

  ngOnInit() {
    this.buscar();
    this.cargarProductos();
    this.rt.connectSSE();
    this.rt.onStockUpdated().subscribe(() => { this.tick.update(v => v + 1); this.buscar(); });
    this.rt.onStockAlertLow().subscribe(() => { this.tick.update(v => v + 1); this.buscar(); });
  }

  cargarProductos() {
    // Trae todos los productos para el combo
    this.prodApi.list({ per_page: -1, sort: 'nombre', order: 'asc' })
      .subscribe(res => this.productos.set(res?.data ?? res ?? []));
  }

  buscar() {
    const params = {
      page: this.q.page,
      per_page: this.q.per_page,           // -1 => backend trae todo
      tipo_movimiento: this.q.tipo,
      desde: this.q.fecha_desde,
      hasta: this.q.fecha_hasta
    };
    this.api.list(params).subscribe(res => this.rows.set(res?.data ?? []));
  }

  openModal() {
    this.resetMov();
    this.modalOpen = true;
  }
  closeModal() {
    this.modalOpen = false;
  }
  resetMov() {
    this.mov = {
      id_producto: undefined,
      tipo: undefined,
      cantidad: undefined,
      fecha: undefined,
      observacion: '',
      referencia_tipo: undefined,
      referencia_id: undefined,
      rol: undefined,
      id_empleado: undefined,
    };
  }
  syncProductoId() {
    // ya está en mov.id_producto; este método queda por si quieres lógica adicional
  }
  syncEmpleadoId() {
    const found = this.roles.find(r => r.value === this.mov.rol);
    this.mov.id_empleado = found ? found.id : undefined;
  }

  submitMovimiento() {
    if (!this.mov?.id_producto || !this.mov?.tipo || !this.mov?.cantidad) return;

    this.saving = true;

    const basePayload = {
      id_producto: Number(this.mov.id_producto),
      cantidad: Number(this.mov.cantidad),
      observacion: this.mov.observacion?.trim() || undefined,
      referencia_tipo: this.mov.referencia_tipo || undefined,
      referencia_id: this.mov.referencia_id ? Number(this.mov.referencia_id) : undefined,
      fecha: this.mov.fecha || undefined,
      id_empleado: this.mov.id_empleado || undefined,
    };

    const req$ = this.mov.tipo === 'entrada'
      ? this.api.entrada(basePayload)
      : this.api.salida(basePayload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.closeModal();
        this.buscar();
      },
      error: (e) => {
        this.saving = false;
        console.error(e);
        alert('No se pudo aplicar el movimiento.');
      }
    });
  }
}
