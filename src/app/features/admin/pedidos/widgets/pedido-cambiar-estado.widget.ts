import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { AdminPedidosService } from '../services/admin-pedidos.service';

@Component({
  standalone: true,
  selector: 'app-pedido-cambiar-estado',
  imports: [CommonModule, FormsModule, DropdownModule, ButtonModule],
  template: `
    <div class="flex align-items-center gap-2">
      <p-dropdown [options]="estados" [(ngModel)]="nuevoEstado" placeholder="Estado"></p-dropdown>
      <button pButton label="Aplicar" icon="pi pi-check" (click)="aplicar()" [disabled]="!nuevoEstado"></button>
    </div>
  `
})
export class PedidoCambiarEstadoWidget {
  private api = inject(AdminPedidosService);

  @Input() idPedido!: number;                 // 👈 IMPORTANTE: @Input definido
  @Output() changed = new EventEmitter<void>();

  estados = ['pendiente','pagado','enviado','entregado','cancelado'];
  nuevoEstado = '';

  aplicar() {
    if (!this.idPedido || !this.nuevoEstado) return;
    this.api.cambiarEstado(this.idPedido, { estado: this.nuevoEstado })
      .subscribe(() => this.changed.emit());
  }
}
