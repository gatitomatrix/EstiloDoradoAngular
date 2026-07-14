import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminReportesService } from '../../../../core/services/admin-reportes.service';


@Component({
  standalone: true,
  selector: 'app-reportes',
  imports: [CommonModule],
  template: `
  <div class="p-3">
    <h2 class="mb-3">Reportes</h2>

    <div class="row g-2">
      <div class="col-auto"><button class="btn btn-outline-warning" (click)="dl('clientes','csv')">Clientes CSV</button></div>
      <div class="col-auto"><button class="btn btn-outline-warning" (click)="dl('clientes','xlsx')">Clientes XLSX</button></div>
      <div class="col-auto"><button class="btn btn-outline-warning" (click)="dl('clientes','pdf')">Clientes PDF</button></div>
    </div>
    <div class="row g-2">
      <div class="col-auto"><button class="btn btn-outline-primary" (click)="dl('productos','csv')">Productos CSV</button></div>
      <div class="col-auto"><button class="btn btn-outline-primary" (click)="dl('productos','xlsx')">Productos XLSX</button></div>
      <div class="col-auto"><button class="btn btn-outline-primary" (click)="dl('productos','pdf')">Productos PDF</button></div>
    </div>
    <div class="row g-2 mt-2">
      <div class="col-auto"><button class="btn btn-outline-success" (click)="dl('pedidos','csv')">Pedidos CSV</button></div>
      <div class="col-auto"><button class="btn btn-outline-success" (click)="dl('pedidos','xlsx')">Pedidos XLSX</button></div>
      <div class="col-auto"><button class="btn btn-outline-success" (click)="dl('pedidos','pdf')">Pedidos PDF</button></div>
    </div>
    <div class="row g-2 mt-2">
      <div class="col-auto"><button class="btn btn-outline-dark" (click)="dl('inventario','csv')">Inventario CSV</button></div>
      <div class="col-auto"><button class="btn btn-outline-dark" (click)="dl('inventario','xlsx')">Inventario XLSX</button></div>
      <div class="col-auto"><button class="btn btn-outline-dark" (click)="dl('inventario','pdf')">Inventario PDF</button></div>
    </div>

    <div class="text-muted mt-3" *ngIf="msg()">{{msg()}}</div>
  </div>
  `
})
export class ReportesPage {
  private api = inject(AdminReportesService);
  msg = signal<string | undefined>(undefined);

  dl(tipo: 'productos' | 'pedidos' | 'inventario' | 'clientes' , ext: 'csv' | 'xlsx' | 'pdf') {
    const map = {
      clientes: this.api.downloadClientes   .bind(this.api),
      productos: this.api.downloadProductos.bind(this.api),
      pedidos: this.api.downloadPedidos.bind(this.api),
      inventario: this.api.downloadInventario.bind(this.api),
    };
    map[tipo](ext).subscribe({
      next: (blob) => this.downloadBlob(blob, `reporte_${tipo}.${ext}`),
      error: () => this.msg.set('Aún no implementado en backend para este formato.')
    });
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
}
