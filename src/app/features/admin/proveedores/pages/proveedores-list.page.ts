import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminProveedoresService } from '../services/admin-proveedores.service';
import { UiService } from '../../../../core/services/ui.service';
import { MessageService } from 'primeng/api';

@Component({
  standalone: true,
  selector: 'app-proveedores-list',
  imports: [CommonModule, FormsModule],
  providers: [MessageService],
  template: `
  <div class="p-3">
    <h2 class="mb-3">Proveedores</h2>

    <!-- Filtros -->
    <form class="row g-2 mb-3 align-items-end" (ngSubmit)="load()">
      <div class="col-sm-6">
        <label class="form-label small">Buscar por empresa</label>
        <div class="input-group">
          <span class="input-group-text"><i class="pi pi-search"></i></span>
          <input class="form-control" [(ngModel)]="q" name="q" placeholder="Ej. Detalles Lima SAC">
        </div>
      </div>
      <div class="col-sm-2 d-flex gap-2">
        <button class="btn btn-dark flex-fill">Buscar</button>
        <button type="button" class="btn btn-primary" (click)="openNew()">CREAR PROVEEDOR</button>
      </div>
    </form>

    <!-- Tabla -->
    <div class="table-responsive">
      <table class="table table-sm align-middle">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre empresa</th>
            <th>Contacto</th>
            <th>Teléfono</th>
            <th>Email</th>
            <th>Dirección</th>
            <th style="width:120px"></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of rows()">
            <td>#{{ p.id_proveedor }}</td>
            <td>{{ p.nombre_empresa }}</td>
            <td>{{ p.contacto }}</td>
            <td>{{ p.telefono }}</td>
            <td>{{ p.email }}</td>
            <td class="text-truncate" style="max-width:300px" [title]="p.direccion">{{ p.direccion }}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-secondary me-1" (click)="openEdit(p)"><i class="pi pi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger" (click)="remove(p)"><i class="pi pi-trash"></i></button>
            </td>
          </tr>
          <tr *ngIf="!rows().length">
            <td colspan="7" class="text-center text-muted">No hay proveedores registrados.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="d-flex justify-content-between">
      <div>Mostrando {{rows().length}} registros</div>
    </div>
  </div>

  <!-- Modal Crear / Editar -->
  <div class="modal-backdrop fade show" *ngIf="showDialog"></div>
  <div class="modal d-block" tabindex="-1" *ngIf="showDialog">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <form (ngSubmit)="save()">
          <div class="modal-header">
            <h5 class="modal-title">{{ dialogTitle }}</h5>
            <button type="button" class="btn-close" (click)="showDialog=false"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Nombre empresa</label>
              <input class="form-control" [(ngModel)]="form.nombre_empresa" name="nombre_empresa" required>
            </div>
            <div class="mb-3">
              <label class="form-label">Contacto</label>
              <input class="form-control" [(ngModel)]="form.contacto" name="contacto">
            </div>
            <div class="mb-3">
              <label class="form-label">Teléfono</label>
              <input class="form-control" [(ngModel)]="form.telefono" name="telefono">
            </div>
            <div class="mb-3">
              <label class="form-label">Email</label>
              <input type="email" class="form-control" [(ngModel)]="form.email" name="email">
            </div>
            <div class="mb-3">
              <label class="form-label">Dirección</label>
              <textarea class="form-control" rows="2" [(ngModel)]="form.direccion" name="direccion"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" [disabled]="saving()">Guardar</button>
            <button type="button" class="btn btn-outline-secondary" (click)="showDialog=false">Cancelar</button>
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
export class ProveedoresListPage implements OnInit {
  private api = inject(AdminProveedoresService);
  private ui = inject(UiService);

  rows = signal<any[]>([]);
  loading = signal(false);
  showDialog = false;
  dialogTitle = 'Nuevo proveedor';
  form: any = { id_proveedor: null, nombre_empresa: '', contacto: '', telefono: '', email: '', direccion: '' };
  saving = signal(false);
  q: string = '';

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.list().subscribe({
      next: res => { this.rows.set(res?.data ?? res ?? []); this.loading.set(false); },
      error: _ => this.loading.set(false)
    });
  }

  openNew() { this.dialogTitle = 'Nuevo proveedor'; this.form = { id_proveedor: null, nombre_empresa: '', contacto: '', telefono: '', email: '', direccion: '' }; this.showDialog = true; }
  openEdit(p: any) { this.dialogTitle = 'Editar proveedor'; this.form = { ...p }; this.showDialog = true; }

  save() {
    this.saving.set(true);
    const req = this.form.id_proveedor
      ? this.api.update(this.form.id_proveedor, this.form)
      : this.api.create(this.form);

    req.subscribe({
      next: _ => { this.ui.ok('Guardado correctamente'); this.showDialog = false; this.saving.set(false); this.load(); },
      error: _ => { this.ui.err('Error al guardar'); this.saving.set(false); }
    });
  }

  remove(p: any) {
    this.ui.confirmDanger('¿Eliminar proveedor?', () => {
      this.api.remove(p.id_proveedor).subscribe({
        next: _ => { this.ui.ok('Eliminado correctamente'); this.load(); },
        error: _ => this.ui.err('No se pudo eliminar')
      });
    });
  }
}
