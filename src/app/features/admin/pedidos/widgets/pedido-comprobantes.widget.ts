import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { AdminPedidosService } from '../services/admin-pedidos.service';

@Component({
  standalone: true,
  selector: 'app-pedido-comprobantes',
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="flex gap-2">
      <button pButton label="PDF" icon="pi pi-file-pdf"  (click)="dl('pdf')"></button>
      <button pButton label="XML" icon="pi pi-file"      (click)="dl('xml')"></button>
      <button pButton label="CDR" icon="pi pi-download"  (click)="dl('cdr')"></button>
    </div>
  `
})
export class PedidoComprobantesWidget {
  private api = inject(AdminPedidosService);
  @Input() idPedido!: number;

  dl(tipo:'pdf'|'xml'|'cdr'){
    this.api.descargarComprobante(this.idPedido, tipo).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `pedido_${this.idPedido}.${tipo}`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });
  }
}
