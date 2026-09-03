import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminCategoriasService } from '../services/admin-categorias.service';
import { UiService } from '../../../../core/services/ui.service';
import { MessageService } from 'primeng/api';

@Component({
  standalone: true,
  selector: 'app-categorias-list',
  imports: [CommonModule, FormsModule],
  providers: [MessageService],
  template: `
  <div class="p-3">
    <h2 class="mb-3">Categorías</h2>

    <form class="row g-2 mb-3 align-items-end" (ngSubmit)="load()">
      <div class="col-sm-6">
        <label class="form-label small">Buscar por nombre</label>
        <div class="input-group">
          <span class="input-group-text"><i class="pi pi-search"></i></span>
          <input class="form-control" [(ngModel)]="q" name="q" placeholder="Ej. Aros, Pulseras...">
        </div>
      </div>
      <div class="col-sm-2 d-flex gap-2">
        <button class="btn btn-dark flex-fill">Buscar</button>
        <button type="button" class="btn btn-primary" (click)="openNew()">CREAR CATEGORÍA</button>
      </div>
    </form>

    <div class="table-responsive">
      <table class="table table-sm align-middle">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Descripción</th>
            <th style="width:120px"></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let c of rows()">
            <td>#{{ c.id_categoria }}</td>
            <td>{{ c.nombre }}</td>
            <td class="text-truncate" style="max-width:500px" [title]="c.descripcion">{{ c.descripcion }}</td>
            <td class="text-end">
              <button type="button" class="btn btn-sm btn-outline-secondary me-1" (click)="openEdit(c)"><i class="pi pi-pencil"></i></button>
              <button type="button" class="btn btn-sm btn-outline-danger" (click)="remove(c); $event.stopPropagation()"><i class="pi pi-trash"></i></button>
            </td>
          </tr>
          <tr *ngIf="!rows().length">
            <td colspan="4" class="text-center text-muted">No hay categorías registradas.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="d-flex justify-content-between">
      <div>Mostrando {{rows().length}} registros</div>
    </div>
  </div>

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
              <label class="form-label">Nombre</label>
              <input class="form-control" [(ngModel)]="form.nombre" name="nombre" required>
            </div>
            <div class="mb-3">
              <label class="form-label">Descripción</label>
              <textarea class="form-control" rows="3" [(ngModel)]="form.descripcion" name="descripcion"></textarea>
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
export class CategoriasListPage implements OnInit {
  private api = inject(AdminCategoriasService);
  private ui = inject(UiService);

  rows = signal<any[]>([]);
  loading = signal(false);
  showDialog = false;
  dialogTitle = 'Nueva categoría';
  form: any = { id_categoria: null, nombre: '', descripcion: '' };
  saving = signal(false);
  q: string = '';
  private deletingId: number | null = null;

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.list().subscribe({
      next: res => { this.rows.set(res?.data ?? res ?? []); this.loading.set(false); },
      error: _ => this.loading.set(false)
    });
  }

  openNew() { this.dialogTitle = 'Nueva categoría'; this.form = { id_categoria: null, nombre: '', descripcion: '' }; this.showDialog = true; }
  openEdit(c: any) { this.dialogTitle = 'Editar categoría'; this.form = { id_categoria: c.id_categoria, nombre: c.nombre, descripcion: c.descripcion }; this.showDialog = true; }

  save() {
    this.saving.set(true);
    const req = this.form.id_categoria
      ? this.api.update(this.form.id_categoria, this.form)
      : this.api.create(this.form);

    req.subscribe({
      next: _ => { this.ui.ok('Guardado correctamente'); this.showDialog = false; this.saving.set(false); this.load(); },
      error: (e: any) => {
        this.ui.err(e?.error?.message || e?.error?.errors?.nombre?.[0] || 'Error al guardar');
        this.saving.set(false);
      }
    });
  }

  remove(c: any) {
    const id = Number(c?.id_categoria);
    if (!id || this.deletingId === id) return;
    this.ui.confirmDanger('¿Eliminar categoría?', () => {
      if (this.deletingId === id) return;
      this.deletingId = id;
      this.api.remove(id).subscribe({
        next: _ => {
          this.ui.ok('Eliminado correctamente');
          this.deletingId = null;
          this.load();
        },
        error: (e: any) => {
          this.deletingId = null;
          this.ui.err(e?.error?.message || 'No se pudo eliminar');
        }
      });
    });
  }
}
