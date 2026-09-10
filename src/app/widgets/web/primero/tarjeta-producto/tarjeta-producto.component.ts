import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductPreview } from '../../../../models/product/preview';

@Component({
  selector: 'ed-web-tarjeta-producto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tarjeta-producto.component.html',
  styleUrls: ['./tarjeta-producto.component.css'],
})
export class TarjetaProductoComponent {
  @Input() producto!: ProductPreview;
  @Output() openDetail = new EventEmitter<ProductPreview>();
  @Output() addToCart = new EventEmitter<ProductPreview>();

  verDetalle() { this.openDetail.emit(this.producto); }
  agregar() {
    if (this.agotado) return;
    this.addToCart.emit(this.producto);
  }

  get agotado(): boolean {
    return (this.producto?.stock || 0) < 1;
  }

  onImgError(e: Event) {
    (e.target as HTMLImageElement).src = '/images/productos/placeholder.jpg';
  }

  onOpen() { this.openDetail.emit(this.producto); }
}
