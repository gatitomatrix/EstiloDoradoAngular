import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductPreview } from '../../../../models/product/preview';
import { TarjetaProductoComponent } from '../tarjeta-producto/tarjeta-producto.component';

@Component({
  selector: 'ed-web-grilla-productos',
  standalone: true,
  imports: [CommonModule, TarjetaProductoComponent, RouterModule],
  templateUrl: './grilla-productos.component.html',
  styleUrls: ['./grilla-productos.component.css'],
})
export class GrillaProductosComponent {
  @Input() productos: ProductPreview[] = [];
  @Input() loading = false;
  @Output() openDetail = new EventEmitter<ProductPreview>();
  @Output() addToCart = new EventEmitter<ProductPreview>();
  placeholder = '/images/productos/placeholder.jpg';

  onAddToCart(p: ProductPreview) {
    this.addToCart.emit(p);
  }
  onOpenDetail(p: ProductPreview) {
    this.openDetail.emit(p);
  }
}
