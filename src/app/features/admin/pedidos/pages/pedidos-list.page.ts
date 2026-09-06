import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { AdminPedidosService } from '../services/admin-pedidos.service';
import { AdminClientesService } from '../../clientes/services/admin-clientes.service';
import { AdminProductosService } from '../../productos/services/admin-productos.service';
// ✅ para llenar el combo de productos


@Component({
  standalone: true,
  selector: 'app-pedidos-list',
  imports: [CommonModule, FormsModule],
  template: `
  <div class="p-3">
    <h2 class="mb-3">Pedidos</h2>

    <!-- Filtros -->
    <form class="row g-2 mb-3 align-items-end" (ngSubmit)="buscar()">
      <div class="col-sm-3">
        <label class="form-label small">Nombre cliente (exacto)</label>
        <div class="input-group">
          <span class="input-group-text"><i class="pi pi-user"></i></span>
          <input class="form-control" [(ngModel)]="q.cliente" name="cliente" placeholder="Ej. Juan Jose">
        </div>
      </div>

      <div class="col-sm-2">
        <label class="form-label small">Estado</label>
        <select class="form-select" [(ngModel)]="q.estado" name="estado">
          <option [ngValue]="undefined">Todos</option>
          <option *ngFor="let e of estados" [ngValue]="e">{{e}}</option>
        </select>
      </div>

      <div class="col-sm-2">
        <label class="form-label small">Forma pago</label>
        <select class="form-select" [(ngModel)]="q.forma_pago" name="forma_pago">
          <option [ngValue]="undefined">Todas</option>
          <option *ngFor="let f of formasPago" [ngValue]="f">{{f}}</option>
        </select>
      </div>

      <div class="col-sm-2">
        <label class="form-label small">Desde</label>
        <input type="date" class="form-control" [(ngModel)]="q.fecha_desde" name="fecha_desde">
      </div>
      <div class="col-sm-2">
        <label class="form-label small">Hasta</label>
        <input type="date" class="form-control" [(ngModel)]="q.fecha_hasta" name="fecha_hasta">
      </div>

      <div class="col-sm-1">
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
      </div>
    </form>

    <!-- Tabla pedidos -->
    <div class="table-responsive">
      <table class="table table-sm align-middle">
        <thead>
          <tr>
            <th>Id</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Estado</th>
            <th>Forma pago</th>
            <th>Dirección entrega</th>
            <th>Producto</th>
            <th>Total</th>
            <th>Tipo CPE</th>
            <th>PDF</th>
            <th style="width:120px"></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngIf="!rows().length">
            <td colspan="11" class="text-center text-muted py-4">
              No hay pedidos con estos filtros.
            </td>
          </tr>
          <tr *ngFor="let p of rows()">
            <td>#{{p.id_pedido}}</td>
            <td>{{ toDDMMYYYY(p.fecha_pedido) }}</td>
            <td>{{ shortCliente(p.cliente_nombre) }}</td>
            <td>
              <span class="badge"
                [class.text-bg-secondary]="p.estado==='pendiente'"
                [class.text-bg-success]="p.estado==='pagado'"
                [class.text-bg-primary]="p.estado==='enviado'"
                [class.text-bg-info]="p.estado==='entregado'"
                [class.text-bg-danger]="p.estado==='cancelado'">
                {{p.estado}}
              </span>
            </td>
            <td class="text-capitalize">{{ p.forma_pago || '-' }}</td>
            <td class="text-truncate" style="max-width:280px" [title]="p.direccion_entrega || '-'">{{ p.direccion_entrega || '-' }}</td>
            <td>
              <div class="d-flex align-items-center gap-2" *ngIf="p.items?.length; else sinProd">
                <img [src]="p.items[0].imagen_url || 'assets/img/no-image.png'" alt=""
                     style="width:40px;height:40px;object-fit:cover;border-radius:6px;border:1px solid #eee">
                <div style="min-width:0">
                  <div class="text-truncate" style="max-width:180px" [title]="p.producto_label">{{ p.items[0].nombre }} ×{{ p.items[0].cantidad }}</div>
                  <div class="small text-muted">
                    {{ p.items[0].categoria || '—' }}
                    <span *ngIf="p.items.length>1"> · +{{ p.items.length-1 }} más</span>
                  </div>
                </div>
              </div>
              <ng-template #sinProd><span class="text-muted">—</span></ng-template>
            </td>
            <td>{{ p.total | number:'1.2-2' }}</td>
            <td>{{ p.comprobante_tipo || '-' }}</td>
            <td>
              <a *ngIf="p.pdf_url" [href]="p.pdf_url" target="_blank" class="link-warning">
                <i class="pi pi-download"></i> Descargar
              </a>
              <span *ngIf="!p.pdf_url" class="text-muted">—</span>
            </td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-secondary" (click)="openEditar(p)" title="Editar / cancelar"><i class="pi pi-pencil"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Paginación simple -->
    <div class="d-flex justify-content-between">
      <div>Mostrando {{rows().length}} / {{total()}} resultados</div>
      <div class="btn-group" *ngIf="q.per_page>0">
        <button class="btn btn-outline-secondary" (click)="pageDown()" [disabled]="q.page<=1">«</button>
        <button class="btn btn-outline-secondary" disabled>pág. {{q.page}}</button>
        <button class="btn btn-outline-secondary" (click)="pageUp()" [disabled]="q.page>=totalPages()">»</button>
      </div>
    </div>
  </div>

  <!-- Modal EDITAR (sin cambios funcionales) -->
  <div class="modal-backdrop fade show" *ngIf="editOpen"></div>
  <div class="modal d-block" tabindex="-1" *ngIf="editOpen">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <form (ngSubmit)="guardarEdicion()">
          <div class="modal-header">
            <h5 class="modal-title">Editar pedido</h5>
            <button type="button" class="btn-close" (click)="closeEditar()"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-3">
                <label class="form-label">ID</label>
                <input class="form-control" [value]="edit.id_pedido || ''" readonly>
              </div>
              <div class="col-md-9">
                <label class="form-label">Cliente</label>
                <input class="form-control" [value]="edit.cliente_nombre || ''" readonly>
              </div>

              <div class="col-md-4">
                <label class="form-label">Fecha pedido</label>
                <input type="date" class="form-control" [(ngModel)]="edit.fecha_pedido" name="e_fecha" required>
              </div>

              <div class="col-md-4">
                <label class="form-label">Estado</label>
                <select class="form-select" [(ngModel)]="edit.estado" name="e_estado" required>
                  <option *ngFor="let e of estados" [ngValue]="e">{{e}}</option>
                </select>
              </div>

              <div class="col-md-4">
                <label class="form-label">Forma pago</label>
                <select class="form-select" [(ngModel)]="edit.forma_pago" name="e_pago">
                  <option [ngValue]="undefined">—</option>
                  <option *ngFor="let f of formasPago" [ngValue]="f">{{f}}</option>
                </select>
              </div>

              <div class="col-12">
                <label class="form-label">Dirección entrega</label>
                <input class="form-control" [value]="edit.direccion_entrega || '-'" readonly>
              </div>
              <div class="col-12" *ngIf="edit.items?.length">
                <label class="form-label">Productos a entregar</label>
                <div class="d-flex flex-column gap-2">
                  <div class="d-flex align-items-center gap-2 p-2 border rounded" *ngFor="let it of edit.items">
                    <img [src]="it.imagen_url || 'assets/img/no-image.png'" alt=""
                         style="width:56px;height:56px;object-fit:cover;border-radius:8px">
                    <div>
                      <div class="fw-semibold">{{ it.nombre }}</div>
                      <div class="small text-muted">{{ it.categoria || 'Sin categoría' }} · {{ it.cantidad }} und.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" [disabled]="savingEdit">Guardar</button>
            <button type="button" class="btn btn-outline-secondary" (click)="closeEditar()">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Modal CREAR (mejora: combo clientes OK + tabla de productos + total auto) -->
  <div class="modal-backdrop fade show" *ngIf="createOpen"></div>
  <div class="modal d-block" tabindex="-1" *ngIf="createOpen">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <form (ngSubmit)="crear()">
          <div class="modal-header">
            <h5 class="modal-title">Crear pedido</h5>
            <button type="button" class="btn-close" (click)="closeCrear()"></button>
          </div>

          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Cliente</label>
                <select class="form-select" [(ngModel)]="nuevo.id_cliente" name="c_cliente" required>
                  <option [ngValue]="undefined">Seleccione...</option>
                  <option *ngFor="let c of clientes()" [ngValue]="c.id_cliente">
                    {{ c.nombre }} {{ c.apellido }}
                  </option>
                </select>
              </div>
              <div class="col-md-3">
                <label class="form-label">ID cliente</label>
                <input class="form-control" [value]="nuevo.id_cliente || ''" readonly>
              </div>
              <div class="col-md-3">
                <label class="form-label">Fecha pedido</label>
                <input type="date" class="form-control" [(ngModel)]="nuevo.fecha_pedido" name="c_fecha" required>
              </div>

              <div class="col-md-4">
                <label class="form-label">Estado</label>
                <select class="form-select" [(ngModel)]="nuevo.estado" name="c_estado" required>
                  <option *ngFor="let e of estados" [ngValue]="e">{{e}}</option>
                </select>
              </div>

              <div class="col-md-4">
                <label class="form-label">Total</label>
                <!-- 🔒 ahora se calcula automáticamente -->
                <input type="number" step="0.01" class="form-control" [(ngModel)]="nuevo.total" name="c_total" readonly>
              </div>

              <div class="col-md-4">
                <label class="form-label">Forma pago</label>
                <select class="form-select" [(ngModel)]="nuevo.forma_pago" name="c_pago">
                  <option [ngValue]="undefined">—</option>
                  <option *ngFor="let f of formasPago" [ngValue]="f">{{f}}</option>
                </select>
              </div>

              <div class="col-12">
                <label class="form-label">Dirección entrega</label>
                <input class="form-control" [(ngModel)]="nuevo.direccion_entrega" name="c_dir">
              </div>

              <div class="col-md-4">
                <label class="form-label">Comprobante tipo</label>
                <select class="form-select" [(ngModel)]="nuevo.comprobante_tipo" name="c_tipo">
                  <option [ngValue]="undefined">—</option>
                  <option *ngFor="let t of cpeTipos" [ngValue]="t">{{t}}</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label">Serie</label>
                <input class="form-control" [(ngModel)]="nuevo.comprobante_serie" name="c_serie">
              </div>
              <div class="col-md-4">
                <label class="form-label">Número</label>
                <input type="number" class="form-control" [(ngModel)]="nuevo.comprobante_numero" name="c_num">
              </div>
            </div>

            <hr class="my-3">

            <!-- Agregar productos -->
            <div class="row g-2 align-items-end">
              <div class="col-md-9">
                <label class="form-label">Agregar productos</label>
                <select class="form-select" [(ngModel)]="prodSel" name="c_prod">
                  <option [ngValue]="undefined">— Seleccione un producto —</option>
                  <option *ngFor="let p of productos()" [ngValue]="p.id_producto">
                    #{{p.id_producto}} — {{p.nombre}} (S/ {{p.precio_venta | number:'1.2-2'}})
                  </option>
                </select>
              </div>
              <div class="col-md-3 d-grid">
                <button class="btn btn-outline-dark" type="button" (click)="agregarProd()">Agregar</button>
              </div>
            </div>

            <div class="table-responsive mt-2 mini-table">
              <table class="table table-sm align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th style="width:72px">ID</th>
                    <th>Producto</th>
                    <th class="text-end" style="width:100px">Cant</th>
                    <th class="text-end" style="width:120px">P. Unit</th>
                    <th class="text-end" style="width:120px">Sub Total</th>
                    <th style="width:54px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let d of detalles; let i = index">
                    <td>#{{ d.id_producto }}</td>
                    <td>{{ d.nombre }}</td>
                    <td class="text-end">
                      <div class="btn-group btn-group-sm float-end">
                        <button type="button" class="btn btn-outline-secondary" (click)="decCant(i)">−</button>
                        <button type="button" class="btn btn-light" disabled>{{ d.cantidad }}</button>
                        <button type="button" class="btn btn-outline-secondary" (click)="incCant(i)">+</button>
                      </div>
                    </td>
                    <td class="text-end">S/ {{ d.precio_unitario | number:'1.2-2' }}</td>
                    <td class="text-end">S/ {{ (d.cantidad * d.precio_unitario) | number:'1.2-2' }}</td>
                    <td class="text-center">
                      <button type="button" class="btn btn-sm btn-outline-danger" (click)="removeDet(i)">
                        <i class="pi pi-trash"></i>
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="!detalles.length">
                    <td colspan="6" class="text-center text-muted">No hay productos agregados.</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

          <div class="modal-footer">
            <button class="btn btn-success" [disabled]="savingCreate">Crear</button>
            <button type="button" class="btn btn-outline-secondary" (click)="closeCrear()">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5); }
    .modal { position: fixed; inset: 0; overflow-y: auto; }
    .text-truncate{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    /* mini tabla con scroll vertical suave cuando crece */
    .mini-table { max-height: 220px; overflow: auto; border: 1px solid #eee; border-radius: .25rem; }
  `]
})
export class PedidosListPage implements OnInit {
  private api = inject(AdminPedidosService);
  private clientesApi = inject(AdminClientesService);
  private prodsApi = inject(AdminProductosService);
  private route = inject(ActivatedRoute);

  // Filtros
  q: any = {
    page: 1,
    per_page: 10,
    cliente: undefined as string | undefined,
    estado: undefined as string | undefined,
    forma_pago: undefined as string | undefined,
    fecha_desde: undefined as string | undefined,
    fecha_hasta: undefined as string | undefined,
  };

  estados = ['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'];
  formasPago = ['tarjeta', 'yape', 'efectivo'];
  cpeTipos = ['FA','BO','EF'];

  rows = signal<any[]>([]);
  total = signal(0);

  // Clientes / Productos
  clientes = signal<any[]>([]);
  productos = signal<any[]>([]);

  // Editar
  editOpen = false;
  savingEdit = false;
  edit: any = {};

  // Crear
  createOpen = false;
  savingCreate = false;
  nuevo: any = {};
  // ✅ selección de productos
  prodSel: number | undefined;
  detalles: Array<{ id_producto:number; nombre:string; cantidad:number; precio_unitario:number; }> = [];

  ngOnInit() {
    // Deep-link desde KPIs del dashboard: ?estado=&fecha_desde=&fecha_hasta=
    this.route.queryParamMap.subscribe((qp) => {
      const estado = qp.get('estado');
      const fd = qp.get('fecha_desde');
      const fh = qp.get('fecha_hasta');
      if (estado) this.q.estado = estado;
      if (fd) this.q.fecha_desde = fd;
      if (fh) this.q.fecha_hasta = fh;
      this.q.page = 1;
      this.buscar();
    });

    this.clientesApi.list({ per_page: 1000, page: 1 }).subscribe({
      next: (res) => this.clientes.set(res?.data ?? res ?? []),
      error: (e) => this.alertHttp(e, 'No se pudieron cargar los clientes'),
    });

    this.prodsApi.list({ per_page: -1, page: 1, sort: 'nombre', order: 'asc' }).subscribe({
      next: (res) => this.productos.set(res?.data ?? res ?? []),
      error: (e) => this.alertHttp(e, 'No se pudieron cargar los productos'),
    });
  }

  // === Tabla / Paginación ===
  buscar() {
    this.api.list({ ...this.q }).subscribe({
      next: (res) => {
        const data = res?.data ?? [];
        this.rows.set(data);
        this.total.set(res?.meta?.total ?? res?.total ?? data.length);
      },
      error: (e) => this.alertHttp(e, 'No se pudo cargar la lista de pedidos')
    });
  }
  pageUp(){ this.q.page = (this.q.page || 1) + 1; this.buscar(); }
  pageDown(){ this.q.page = Math.max(1, (this.q.page || 1) - 1); this.buscar(); }
  totalPages(){ return Math.max(1, Math.ceil((this.total()||0)/(this.q.per_page||10))); }

  // === Utiles ===
  shortCliente(full?: string): string {
    if (!full) return '-';
    const parts = full.trim().split(/\s+/);
    const first = parts[0] || '';
    const last  = parts.length > 1 ? parts[1] : '';
    return `${first} ${last}`.trim();
  }
  toYYYYMMDD(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth()+1).toString().padStart(2,'0');
    const day = d.getDate().toString().padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  toDDMMYYYY(input: any): string {
    if (!input) return '';
    const d = new Date(input);
    if (isNaN(d.getTime())) return input;
    const dd = d.getDate().toString().padStart(2,'0');
    const mm = (d.getMonth()+1).toString().padStart(2,'0');
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  nullify<T>(v: T): T | null {
    return (v === undefined || v === '' || v === null) ? null : v;
  }

  // === Editar ===
  openEditar(p: any) {
    this.edit = {
      id_pedido: p.id_pedido,
      cliente_nombre: this.shortCliente(p.cliente_nombre),
      direccion_entrega: p.direccion_entrega,
      estado: p.estado,
      forma_pago: p.forma_pago ?? undefined,
      fecha_pedido: p.fecha_pedido ? this.toYYYYMMDD(new Date(p.fecha_pedido)) : this.toYYYYMMDD(new Date()),
      items: p.items || []
    };
    this.editOpen = true;
  }
  closeEditar(){ this.editOpen = false; }

  guardarEdicion() {
    if (!this.edit?.id_pedido) return;
    this.savingEdit = true;
    const payload = {
      fecha_pedido: this.edit.fecha_pedido, // yyyy-mm-dd
      estado: this.edit.estado,
      forma_pago: this.edit.forma_pago ?? null
    };
    this.api.update(this.edit.id_pedido, payload).subscribe({
      next: () => { this.savingEdit = false; this.editOpen = false; this.buscar(); },
      error: (e) => { this.savingEdit = false; this.alertHttp(e, 'No se pudo guardar'); }
    });
  }

  // === Crear ===
  openCrear() {
    this.nuevo = {
      id_cliente: undefined,
      fecha_pedido: this.toYYYYMMDD(new Date()),
      estado: 'pendiente',
      total: 0,
      forma_pago: undefined,
      direccion_entrega: '',
      comprobante_tipo: undefined,
      comprobante_serie: '',
      comprobante_numero: undefined
    };
    this.prodSel = undefined;
    this.detalles = [];
    this.createOpen = true;
  }
  closeCrear(){ this.createOpen = false; }

  private recalcTotal(){
    const t = this.detalles.reduce((s, d) => s + d.cantidad * d.precio_unitario, 0);
    this.nuevo.total = Number(t.toFixed(2));
  }

  agregarProd(){
    if (!this.prodSel) return;
    const p = (this.productos() || []).find((x:any) => x.id_producto === this.prodSel);
    if (!p) return;
    const existing = this.detalles.find(d => d.id_producto === p.id_producto);
    if (existing) existing.cantidad += 1;
    else this.detalles.push({ id_producto: p.id_producto, nombre: p.nombre, cantidad: 1, precio_unitario: p.precio_venta });
    this.recalcTotal();
  }
  incCant(i:number){ this.detalles[i].cantidad += 1; this.recalcTotal(); }
  decCant(i:number){
    const d = this.detalles[i];
    d.cantidad = Math.max(0, d.cantidad - 1);
    if (d.cantidad === 0) this.detalles.splice(i,1);
    this.recalcTotal();
  }
  removeDet(i:number){ this.detalles.splice(i,1); this.recalcTotal(); }

  crear() {
    if (!this.nuevo?.id_cliente) return;
    this.savingCreate = true;

    const payload: any = {
      id_cliente: this.nuevo.id_cliente,
      fecha_pedido: this.nuevo.fecha_pedido, // yyyy-mm-dd
      estado: this.nuevo.estado,
      total: this.nullify(this.nuevo.total),
      forma_pago: this.nullify(this.nuevo.forma_pago),
      direccion_entrega: this.nullify(this.nuevo.direccion_entrega),
      comprobante_tipo: this.nullify(this.nuevo.comprobante_tipo),
      comprobante_serie: this.nullify(this.nuevo.comprobante_serie),
      comprobante_numero: this.nullify(this.nuevo.comprobante_numero),
      // 👇 lo enviamos; si el backend aún no lo usa, lo ignora
      detalles: this.detalles.map(d => ({
        id_producto: d.id_producto,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        subtotal: Number((d.cantidad * d.precio_unitario).toFixed(2))
      })),
    };

    this.api.create(payload).subscribe({
      next: () => { this.savingCreate = false; this.createOpen = false; this.buscar(); },
      error: (e) => { this.savingCreate = false; this.alertHttp(e, 'No se pudo crear'); }
    });
  }

  // === Alert homogéneo ===
  private alertHttp(e: any, fallback: string){
    const status = e?.status;
    if (status === 401 || status === 403) {
      alert('No autorizado para realizar esta acción.');
      return;
    }
    alert(fallback);
    console.error(e);
  }
}
