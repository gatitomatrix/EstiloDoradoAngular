import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminClientesService } from '../services/admin-clientes.service';


@Component({
  standalone: true,
  selector: 'app-clientes-list',
  imports: [CommonModule, FormsModule],
  template: `
  <div class="p-3">
    <h2 class="mb-3">Clientes (ADMIN)</h2>

    <!-- Botón nuevo -->
    <div class="mb-3 text-end">
      <button class="btn btn-primary" (click)="openCrear()">Nuevo Cliente</button>
    </div>

    <!-- Tabla -->
    <div class="table-responsive">
      <table class="table table-striped align-middle">
        <thead class="table-dark">
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Apellido</th>
            <th>Teléfono</th>
            <th>Email</th>
            <th>Dirección</th>
            <th>Fecha Registro</th>
            <th style="width:120px">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let c of clientes()">
            <td>{{ c.id_cliente }}</td>
            <td>{{ c.nombre }}</td>
            <td>{{ c.apellido }}</td>
            <td>{{ c.telefono }}</td>
            <td>{{ c.email }}</td>
            <td>{{ c.direccion }}</td>
            <td>{{ c.created_at | date:'dd/MM/yyyy' }}</td>
            <td>
              <button class="btn btn-sm btn-outline-secondary me-1" (click)="openEditar(c)">
                <i class="pi pi-pencil"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Modal CREAR -->
  <div class="modal-backdrop fade show" *ngIf="createOpen"></div>
  <div class="modal d-block" tabindex="-1" *ngIf="createOpen">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <form (ngSubmit)="crear()">
          <div class="modal-header">
            <h5 class="modal-title">Nuevo Cliente</h5>
            <button type="button" class="btn-close" (click)="closeCrear()"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Nombre</label>
                <input class="form-control" [(ngModel)]="nuevo.nombre" name="nombre" required
                  (input)="onlyLetters($event, 'nuevo', 'nombre')" placeholder="Solo letras">
              </div>
              <div class="col-md-6">
                <label class="form-label">Apellido</label>
                <input class="form-control" [(ngModel)]="nuevo.apellido" name="apellido" required
                  (input)="onlyLetters($event, 'nuevo', 'apellido')" placeholder="Solo letras">
              </div>
              <div class="col-md-6">
                <label class="form-label">Teléfono</label>
                <input class="form-control" [(ngModel)]="nuevo.telefono" name="telefono"
                  (input)="onlyPhone($event, 'nuevo')" inputmode="numeric" maxlength="9" placeholder="9xxxxxxxx">
              </div>
              <div class="col-md-6">
                <label class="form-label">Email</label>
                <input type="email" class="form-control" [(ngModel)]="nuevo.email" name="email">
              </div>
              <div class="col-12">
                <label class="form-label">Dirección</label>
                <input class="form-control" [(ngModel)]="nuevo.direccion" name="direccion">
              </div>
              <div class="col-md-6">
                <label class="form-label">Contraseña</label>
                <input type="password" class="form-control" [(ngModel)]="nuevo.contrasena" name="contrasena">
              </div>
              <div class="col-md-6">
                <label class="form-label">Fecha Registro</label>
                <input type="text" class="form-control" [value]="fechaHoy" readonly>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-success">Guardar</button>
            <button type="button" class="btn btn-outline-secondary" (click)="closeCrear()">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Modal EDITAR -->
  <div class="modal-backdrop fade show" *ngIf="editOpen"></div>
  <div class="modal d-block" tabindex="-1" *ngIf="editOpen">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <form (ngSubmit)="actualizar()">
          <div class="modal-header">
            <h5 class="modal-title">Actualizar Cliente</h5>
            <button type="button" class="btn-close" (click)="closeEditar()"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Nombre</label>
                <input class="form-control" [(ngModel)]="edit.nombre" name="e_nombre"
                  (input)="onlyLetters($event, 'edit', 'nombre')" placeholder="Solo letras">
              </div>
              <div class="col-md-6">
                <label class="form-label">Apellido</label>
                <input class="form-control" [(ngModel)]="edit.apellido" name="e_apellido"
                  (input)="onlyLetters($event, 'edit', 'apellido')" placeholder="Solo letras">
              </div>
              <div class="col-md-6">
                <label class="form-label">Teléfono</label>
                <input class="form-control" [(ngModel)]="edit.telefono" name="e_telefono"
                  (input)="onlyPhone($event, 'edit')" inputmode="numeric" maxlength="9" placeholder="9xxxxxxxx">
              </div>
              <div class="col-md-6">
                <label class="form-label">Email</label>
                <input class="form-control" [(ngModel)]="edit.email" name="e_email">
              </div>
              <div class="col-12">
                <label class="form-label">Dirección</label>
                <input class="form-control" [(ngModel)]="edit.direccion" name="e_direccion">
              </div>
              <div class="col-md-6">
                <label class="form-label">Fecha Registro</label>
                <input class="form-control" [value]="edit.created_at | date:'dd/MM/yyyy'" readonly>
              </div>
              <div class="col-md-6">
                <label class="form-label">Última actualización</label>
                <input class="form-control" [value]="fechaHoy" readonly>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary">Actualizar</button>
            <button type="button" class="btn btn-outline-secondary" (click)="closeEditar()">Cancelar</button>
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
export class ClientesListPage {
  private api = inject(AdminClientesService);
  clientes = signal<any[]>([]);
  createOpen = false;
  editOpen = false;
  nuevo: any = {};
  edit: any = {};
  fechaHoy = new Date().toISOString().split('T')[0];

  onlyLetters(ev: Event, target: 'nuevo' | 'edit', field: 'nombre' | 'apellido') {
    const el = ev.target as HTMLInputElement;
    const v = el.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s']/g, '');
    el.value = v;
    this[target][field] = v;
  }

  onlyPhone(ev: Event, target: 'nuevo' | 'edit') {
    const el = ev.target as HTMLInputElement;
    const v = el.value.replace(/\D/g, '').slice(0, 9);
    el.value = v;
    this[target].telefono = v;
  }

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.api.list({ per_page: -1 }).subscribe({
      next: (res) => this.clientes.set(res.data || res),
      error: (err) => console.error(err)
    });
  }

  openCrear() { this.createOpen = true; this.nuevo = {}; }
  closeCrear() { this.createOpen = false; }

  openEditar(c: any) { this.editOpen = true; this.edit = { ...c }; }
  closeEditar() { this.editOpen = false; }

  crear() {
    this.api.create(this.nuevo).subscribe({
      next: () => { this.closeCrear(); this.cargar(); },
      error: (err) => console.error(err)
    });
  }

  actualizar() {
    this.api.update(this.edit.id_cliente, this.edit).subscribe({
      next: () => { this.closeEditar(); this.cargar(); },
      error: (err) => console.error(err)
    });
  }
}
