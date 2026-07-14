import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductPreview } from '../../../../models/product/preview';
import { TarjetaProductoComponent } from '../tarjeta-producto/tarjeta-producto.component';

@Component({
  selector: 'ed-web-grilla-productos',
  standalone: true,
  imports: [CommonModule, TarjetaProductoComponent],
  templateUrl: './grilla-productos.component.html',
  styleUrls: ['./grilla-productos.component.css']
})
export class GrillaProductosComponent {
  @Input() productos: ProductPreview[] = [];
  @Output() openDetail = new EventEmitter<ProductPreview>();  
  @Output() addToCart = new EventEmitter<ProductPreview>();
  placeholder = '/images/productos/placeholder.jpg';

  onAddToCart(p: ProductPreview) {
    this.addToCart.emit(p);// Más adelante conectaremos con el carrito
    // Por ahora, sólo queda el hook listo
  }
  onOpenDetail(p: ProductPreview) {
    this.openDetail.emit(p);  
  }
}
