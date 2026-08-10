import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AdminCategoriasService } from '../../categorias/services/admin-categorias.service';


// PrimeNG (para pInputText si ya lo usas en inputs)
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';

import { AdminProductosService, Producto } from '../services/admin-productos.service';
import { AdminProveedoresService } from '../../proveedores/services/admin-proveedores.service';

@Component({
  standalone: true,
  selector: 'app-productos-list',
  imports: [CommonModule, FormsModule, InputTextModule, DropdownModule, ButtonModule],
  styles: [`
    .ed-prod-table-wrap {
      overflow-x: auto;
    }
    .ed-prod-table {
      width: 100%;
      table-layout: fixed;
    }
    .ed-prod-table th,
    .ed-prod-table td {
      vertical-align: top;
      padding: 0.65rem 0.5rem;
    }
    .ed-prod-table .col-img { width: 64px; }
    .ed-prod-table .col-name { width: 26%; }
    .ed-prod-table .col-tags { width: 22%; }
    .ed-prod-table .col-price { width: 90px; }
    .ed-prod-table .col-stock { width: 64px; }
    .ed-prod-table .col-cat { width: 100px; }
    .ed-prod-table .col-state { width: 80px; }
    .ed-prod-table .col-actions { width: 96px; }

    .ed-prod-thumb {
      width: 48px;
      height: 48px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid #eee;
      display: block;
    }
    .ed-prod-title {
      font-weight: 600;
      line-height: 1.3;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .ed-prod-desc {
      margin-top: 0.25rem;
      font-size: 0.8rem;
      color: #6c757d;
      line-height: 1.35;
      white-space: normal;
      word-break: break-word;
      overflow-wrap: anywhere;
      /* varias líneas hacia abajo, sin invadir otras columnas */
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      overflow: hidden;
    }
    .ed-prod-tags {
      font-size: 0.78rem;
      color: #6c757d;
      line-height: 1.4;
      white-space: normal;
      word-break: break-word;
      overflow-wrap: anywhere;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 4;
      overflow: hidden;
    }
  `],
  template: `
  <div class="p-3">
    <h2 class="mb-3">Productos</h2>

    <form class="row g-2 mb-3" (ngSubmit)="onBuscarClick()">
      <div class="col-sm-4">
        <label class="form-label">Buscar por nombre</label>
        <input class="form-control" [(ngModel)]="q.search" name="search" placeholder="Ej. Cajita Circular Rosa">
      </div>
      <div class="col-sm-3">
        <label class="form-label">Categoría</label>
        <select class="form-select" [(ngModel)]="q.id_categoria" name="id_categoria">
          <option [ngValue]="undefined">Todas</option>
          <option *ngFor="let c of categorias()" [ngValue]="c.id_categoria">{{c.nombre}}</option>
        </select>
      </div>
      <div class="col-sm-2">
        <label class="form-label">Estado</label>
        <select class="form-select" [(ngModel)]="q.estado" name="estado">
          <option [ngValue]="undefined">Todos</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>
      <div class="col-sm-3 d-flex align-items-end gap-2">
        <button class="btn btn-dark flex-fill">Buscar</button>
        <button type="button" class="btn btn-primary" (click)="openCreate()">Nuevo</button>
      </div>
    </form>

    <div class="table-responsive ed-prod-table-wrap">
      <table class="table table-sm align-middle ed-prod-table">
        <thead><tr>
          <th class="col-img">Imagen</th>
          <th class="col-name">Nombre</th>
          <th class="col-tags">Etiquetas</th>
          <th class="col-price">Precio</th>
          <th class="col-stock">Stock</th>
          <th class="col-cat">Categoría</th>
          <th class="col-state">Estado</th>
          <th class="col-actions"></th>
        </tr></thead>
        <tbody>
          <tr *ngFor="let p of rows()">
            <td class="col-img">
              <img [src]="p.imagen_url || 'assets/img/no-image.png'" alt="" class="ed-prod-thumb">
            </td>
            <td class="col-name">
              <div class="ed-prod-title">{{p.nombre}}</div>
              <div class="ed-prod-desc" [title]="p.descripcion || ''">{{ p.descripcion || '—' }}</div>
            </td>
            <td class="col-tags">
              <div class="ed-prod-tags">{{ p.etiquetas || '—' }}</div>
            </td>
            <td class="col-price text-nowrap">S/ {{p.precio_venta | number:'1.2-2'}}</td>
            <td class="col-stock">
              <span class="badge" [class.text-bg-danger]="p.stock<=3" [class.text-bg-success]="p.stock>3">{{p.stock}}</span>
            </td>
            <td class="col-cat">{{ catName(p.id_categoria) }}</td>
            <td class="col-state">
              <span class="badge" [class.text-bg-success]="p.estado==='activo'" [class.text-bg-secondary]="p.estado!=='activo'">{{p.estado}}</span>
            </td>
            <td class="col-actions text-end text-nowrap">
              <button class="btn btn-sm btn-outline-secondary me-1" (click)="openEdit(p)"><i class="pi pi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger" *ngIf="isAdmin()" (click)="remove(p)"><i class="pi pi-trash"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="d-flex justify-content-between">
      <div>Mostrando {{rows().length}} / {{total()}} resultados</div>
      <div class="btn-group">
        <button class="btn btn-outline-secondary" (click)="pageDown()" [disabled]="q.page<=1">«</button>
        <button class="btn btn-outline-secondary" disabled>pág. {{q.page}}</button>
        <button class="btn btn-outline-secondary" (click)="pageUp()" [disabled]="q.page>=totalPages()">»</button>
      </div>
    </div>
  </div>

  <!-- ===================================================== -->
  <!-- Modal NUEVO PRODUCTO (Bootstrap, mismo estilo Pedidos) -->
  <!-- ===================================================== -->
  <div class="modal-backdrop fade show" *ngIf="createOpen()"></div>
  <div class="modal d-block" tabindex="-1" *ngIf="createOpen()">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <form (ngSubmit)="save()">
          <div class="modal-header">
            <h5 class="modal-title">Nuevo Producto</h5>
            <button type="button" class="btn-close" (click)="closeCreate()"></button>
          </div>

          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-8">
                <label class="form-label">Nombre</label>
                <input pInputText [(ngModel)]="form.nombre" name="c_nombre" required class="form-control"/>

                <label class="form-label mt-2">Descripción</label>
                <textarea
                  class="form-control"
                  rows="3"
                  [(ngModel)]="form.descripcion"
                  name="c_descripcion"
                  placeholder="Qué es el producto, para quién, ocasión..."
                ></textarea>

                <label class="form-label mt-2">Etiquetas (chatbot / búsqueda)</label>
                <input
                  pInputText
                  [(ngModel)]="form.etiquetas"
                  name="c_etiquetas"
                  class="form-control"
                  placeholder="peluche,regalo,infantil,stich"
                />
                <small class="text-muted">Palabras en minúscula separadas por coma. Ayudan al asistente IA.</small>

                <div class="row mt-2 g-3">
                  <div class="col-md-6">
                    <label class="form-label">Precio compra</label>
                    <input pInputText type="number" step="0.01" [(ngModel)]="form.precio_compra" name="c_precio_compra" required class="form-control"/>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Precio venta</label>
                    <input pInputText type="number" step="0.01" [(ngModel)]="form.precio_venta" name="c_precio_venta" required class="form-control"/>
                  </div>
                </div>

                <div class="row mt-2 g-3">
                  <div class="col-md-4">
                    <label class="form-label">Stock</label>
                    <input pInputText type="number" [(ngModel)]="form.stock" name="c_stock" required class="form-control"/>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Categoría</label>
                    <select class="form-select" [(ngModel)]="form.id_categoria" name="c_id_categoria" required>
                      <option *ngFor="let c of categorias()" [ngValue]="c.id_categoria">{{c.nombre}}</option>
                    </select>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Proveedor</label>
                    <select class="form-select" [(ngModel)]="form.id_proveedor" name="c_id_proveedor" required>
                      <option *ngFor="let p of proveedores()" [ngValue]="p.id_proveedor">{{p.nombre}}</option>
                    </select>
                  </div>
                </div>

                <div class="mt-2">
                  <label class="form-label">Estado</label>
                  <select class="form-select" [(ngModel)]="form.estado" name="c_estado">
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>

                <div class="mt-2">
                  <label class="form-label">Imagen (URL IMGUR)</label>
                  <input pInputText [(ngModel)]="form.imagen_url" name="c_imagen_url" class="form-control" placeholder="https://i.imgur.com/XXXXX.jpg"
                         (ngModelChange)="onUrlChange($event)"/>
                </div>

                <div class="row mt-2 g-3">
                  <div class="col-md-8">
                    <label class="form-label">Slug</label>
                    <input pInputText [(ngModel)]="form.slug" name="c_slug" class="form-control" placeholder="mi-producto-unico"/>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Fecha</label>
                    <input pInputText [value]="formatFecha(form.created_at)" class="form-control" readonly/>
                  </div>
                </div>
              </div>

              <div class="col-md-4">
                <label class="form-label">Vista previa</label>
                <img [src]="preview() || form.imagen_url || 'assets/img/no-image.png'"
                     style="width:100%;aspect-ratio:1/1;object-fit:cover;border:1px solid #eee;border-radius:8px">
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-success">Crear</button>
            <button type="button" class="btn btn-outline-secondary" (click)="closeCreate()">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- ======================================================== -->
  <!-- Modal ACTUALIZAR PRODUCTO (Bootstrap, mismo estilo)     -->
  <!-- ======================================================== -->
  <div class="modal-backdrop fade show" *ngIf="editOpen()"></div>
  <div class="modal d-block" tabindex="-1" *ngIf="editOpen()">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <form (ngSubmit)="save()">
          <div class="modal-header">
            <h5 class="modal-title">Actualizar Producto</h5>
            <button type="button" class="btn-close" (click)="closeEdit()"></button>
          </div>

          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-8">
                <label class="form-label">Nombre</label>
                <input pInputText [(ngModel)]="form.nombre" name="e_nombre" required class="form-control"/>

                <label class="form-label mt-2">Descripción</label>
                <textarea
                  class="form-control"
                  rows="3"
                  [(ngModel)]="form.descripcion"
                  name="e_descripcion"
                  placeholder="Qué es el producto, para quién, ocasión..."
                ></textarea>

                <label class="form-label mt-2">Etiquetas (chatbot / búsqueda)</label>
                <input
                  pInputText
                  [(ngModel)]="form.etiquetas"
                  name="e_etiquetas"
                  class="form-control"
                  placeholder="peluche,regalo,infantil,stich"
                />
                <small class="text-muted">Palabras en minúscula separadas por coma. Ayudan al asistente IA.</small>

                <div class="row mt-2 g-3">
                  <div class="col-md-6">
                    <label class="form-label">Precio compra</label>
                    <input pInputText type="number" step="0.01" [(ngModel)]="form.precio_compra" name="e_precio_compra" required class="form-control"/>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Precio venta</label>
                    <input pInputText type="number" step="0.01" [(ngModel)]="form.precio_venta" name="e_precio_venta" required class="form-control"/>
                  </div>
                </div>

                <div class="row mt-2 g-3">
                  <div class="col-md-4">
                    <label class="form-label">Stock</label>
                    <input pInputText type="number" [(ngModel)]="form.stock" name="e_stock" required class="form-control"/>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Categoría</label>
                    <select class="form-select" [(ngModel)]="form.id_categoria" name="e_id_categoria" required>
                      <option *ngFor="let c of categorias()" [ngValue]="c.id_categoria">{{c.nombre}}</option>
                    </select>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Proveedor</label>
                    <select class="form-select" [(ngModel)]="form.id_proveedor" name="e_id_proveedor" required>
                      <option *ngFor="let p of proveedores()" [ngValue]="p.id_proveedor">{{p.nombre}}</option>
                    </select>
                  </div>
                </div>

                <div class="mt-2">
                  <label class="form-label">Estado</label>
                  <select class="form-select" [(ngModel)]="form.estado" name="e_estado">
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>

                <div class="mt-2">
                  <label class="form-label">Imagen (URL IMGUR)</label>
                  <input pInputText [(ngModel)]="form.imagen_url" name="e_imagen_url" class="form-control" placeholder="https://i.imgur.com/XXXXX.jpg"
                         (ngModelChange)="onUrlChange($event)"/>
                </div>

                <div class="row mt-2 g-3">
                  <div class="col-md-8">
                    <label class="form-label">Slug</label>
                    <input pInputText [(ngModel)]="form.slug" name="e_slug" class="form-control"/>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Fecha actualización</label>
                    <input pInputText [value]="formatFecha(form.updated_at || form.created_at)" class="form-control" readonly/>
                  </div>
                </div>
              </div>

              <div class="col-md-4">
                <label class="form-label">Vista previa</label>
                <img [src]="preview() || form.imagen_url || 'assets/img/no-image.png'"
                     style="width:100%;aspect-ratio:1/1;object-fit:cover;border:1px solid #eee;border-radius:8px">
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-success">Actualizar</button>
            <button type="button" class="btn btn-outline-secondary" (click)="closeEdit()">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
  `
})
export class ProductosListPage implements OnInit {
  private api  = inject(AdminProductosService);
  private cats = inject(AdminCategoriasService);
  private prov = inject(AdminProveedoresService);

  q: any = { page: 1, per_page: 10, search: '', id_categoria: undefined, estado: undefined };
  rows = signal<Producto[]>([]);
  total = signal(0);
  categorias = signal<any[]>([]);
  proveedores = signal<any[]>([]);

  // Estado de modales
  createOpen = signal(false);
  editOpen   = signal(false);

  form: any = {};
  preview = signal<string | undefined>(undefined);

  ngOnInit() {
    this.cats.list().subscribe(res => this.categorias.set(res?.data ?? res ?? []));
    this.prov.list().subscribe(res => this.proveedores.set(res?.data ?? res ?? []));
    this.buscar();
  }

  isAdmin(): boolean {
    try {
      const raw = sessionStorage.getItem('ed_admin_roles');
      const roles: string[] = raw ? JSON.parse(raw) : [];
      return roles?.includes('ADMIN');
    } catch { return false; }
  }

  catName(id: number) {
    const c = this.categorias().find(x => x.id_categoria === id);
    return c?.nombre ?? id;
  }

  private mapQuery() {
    return {
      page: this.q.page,
      per_page: this.q.per_page,
      q: this.q.search || undefined,
      categoria: this.q.id_categoria || undefined,
      estado: this.q.estado || undefined
    };
  }

  onBuscarClick() { this.q.page = 1; this.buscar(); }

  buscar() {
    this.api.list(this.mapQuery()).subscribe(res => {
      const data = res?.data ?? [];
      this.rows.set(data);
      this.total.set(res?.total ?? res?.meta?.total ?? data.length ?? 0);
    });
  }
  pageUp(){ this.q.page = (this.q.page || 1) + 1; this.buscar(); }
  pageDown(){ this.q.page = Math.max(1, (this.q.page || 1) - 1); this.buscar(); }
  totalPages(){ return Math.max(1, Math.ceil((this.total()||0)/(this.q.per_page||10))); }

  private todayYmd(): string {
    const d = new Date();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }
  formatFecha(ymd?: string) {
    const str = ymd || this.todayYmd();
    const [y,m,d] = str.split('-');
    return (y && m && d) ? `${d}/${m}/${y}` : '';
  }

  openCreate() {
    this.form = {
      nombre:'', descripcion:'', etiquetas:'', precio_compra:0, precio_venta:0, stock:0,
      id_categoria: this.categorias()[0]?.id_categoria ?? undefined,
      id_proveedor: this.proveedores()[0]?.id_proveedor ?? undefined,
      estado:'activo', imagen_url:'', slug:'',
      created_at: this.todayYmd(),
      updated_at: null
    };
    this.preview.set(undefined);
    this.createOpen.set(true);
  }
  closeCreate() { this.createOpen.set(false); }

  openEdit(p: Producto) {
    this.form = { ...p };
    if (!this.form.created_at) this.form.created_at = this.todayYmd();
    this.preview.set(undefined);
    this.editOpen.set(true);
  }
  closeEdit() { this.editOpen.set(false); }

  onUrlChange(url: string) {
    this.preview.set(url && url.startsWith('http') ? url : undefined);
  }

  save() {
    const base = { ...this.form };
    let payload: any;
    const isEdit = !!base?.id_producto;

    if (isEdit) {
      if (!base.updated_at) base.updated_at = this.todayYmd(); // primera actualización
      payload = {
        nombre: base.nombre,
        descripcion: base.descripcion,
        precio_compra: base.precio_compra,
        precio_venta: base.precio_venta,
        stock: base.stock,
        id_categoria: base.id_categoria,
        id_proveedor: base.id_proveedor,
        estado: base.estado,
        imagen_url: base.imagen_url,
        slug: base.slug,
        updated_at: base.updated_at
      };
    } else {
      payload = {
        nombre: base.nombre,
        descripcion: base.descripcion,
        precio_compra: base.precio_compra,
        precio_venta: base.precio_venta,
        stock: base.stock,
        id_categoria: base.id_categoria,
        id_proveedor: base.id_proveedor,
        estado: base.estado,
        imagen_url: base.imagen_url,
        slug: base.slug,
        created_at: base.created_at || this.todayYmd(),
        updated_at: null
      };
    }

    const obs = isEdit
      ? this.api.update(base.id_producto, payload)
      : this.api.create(payload);

    obs.subscribe({
      next: () => {
        this.createOpen.set(false);
        this.editOpen.set(false);
        this.buscar();
      },
      error: () => alert('No se pudo guardar')
    });
  }

  remove(p: Producto) {
    if (!confirm('¿Eliminar producto?')) return;
    this.api.remove(p.id_producto).subscribe({
      next: () => this.buscar(),
      error: () => alert('No se pudo eliminar')
    });
  }
}
