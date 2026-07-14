import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { CartService } from '../../../services/cart/cart.service';

import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';
import { GaleriaProductoComponent } from '../../../widgets/web/detalle/galeria-producto/galeria-producto.component';
import { PanelDatosProductoComponent } from '../../../widgets/web/detalle/panel-datos-producto/panel-datos-producto.component';


import { ProductDetail } from '../../../models/product/detail';
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { ProductoService } from '../../../services/product/product.service';

@Component({
  selector: 'ed-web-detalle',
  standalone: true,
  imports: [
    CommonModule,
    FranjaMarcaComponent,
    GaleriaProductoComponent,
    PanelDatosProductoComponent,
    BarraSuperiorComponent
  ],
  templateUrl: './detalle.component.html',
  styleUrls: ['./detalle.component.css']
})
export class DetalleComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductoService);
  private router = inject(Router);
  private cart = inject(CartService);

  loading = false;
  error: string | null = null;
  prod: ProductDetail | null = null;
  imagenes: string[] = [];

  sub?: Subscription;

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe(params => {
      const idStr = params.get('id');
      if (!idStr) return;
      const id = Number(idStr);          // ✅ fuerza a number
      this.fetch(id);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private fetch(id: number) {                   // <-- solo number
    this.loading = true;
    this.error = null;

    this.productService.getById(id).subscribe({
      next: (p) => {
        this.prod = p;
        this.imagenes = p.imagen ? [p.imagen] : ['/images/productos/placeholder.jpg'];
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudo cargar el producto.';
        this.loading = false;
      }
    });
  }

  onAddToCart(qty: number) {
    if (!this.prod) return;
    const stockMax = Math.max(1, (this.prod.stock ?? 1) - 1);
    this.cart.add({
      id: this.prod.id,
      nombre: this.prod.nombre,
      imagen: this.prod.imagen,
      precio: this.prod.precio,
      qty,
      stockMax
    });
    // this.router.navigateByUrl('/carrito'); // si prefieres, comenta esta línea
  }

  irHome() {
    this.router.navigateByUrl('/');  // 👈 vuelve a la página principal
  }

}
