import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; 

@Component({
  selector: 'ed-web-panel-datos-producto',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './panel-datos-producto.component.html',
  styleUrls: ['./panel-datos-producto.component.css']
})
export class PanelDatosProductoComponent {
  @Input() titulo = '';
  @Input() subtitulo = '';
  @Input() descripcion = '';
  @Input() features: string[] = [];
  @Input() stock = 0;                 // 👈 lo usaremos para el máximo
  @Input() precio = 0;
  @Input() rating = 4;

  @Output() seguirComprando = new EventEmitter<void>(); // 👈 para volver a home
  @Output() agregarCarrito = new EventEmitter<number>(); // opcional (para futuro)

  qty = 1;

  // 👇 Máximo = stock - 1 (nunca negativo)
  get maxLimit(): number {
    return Math.max(0, this.stock + 0);
  }

   // 🔥 Total reactivo (se recalcula cuando cambia qty o precio)
  get total(): number {
    return (this.precio || 0) * (this.qty || 0);
  }

  inc() {
    if (this.qty < this.maxLimit) this.qty++;
  }
  dec() {
    if (this.qty > 1) this.qty--;
  }
}
