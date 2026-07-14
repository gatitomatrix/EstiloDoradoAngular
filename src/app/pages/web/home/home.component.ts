import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';
import { CarruselHeroComponent } from '../../../widgets/web/primero/carrusel-hero/carrusel-hero.component';
import { CintaPromocionComponent } from '../../../widgets/web/primero/cinta-promocion/cinta-promocion.component';
import { ChipsCategoriasComponent } from '../../../widgets/web/primero/chips-categorias/chips-categorias.component';
import { BarraBusquedaComponent } from '../../../widgets/web/primero/barra-busqueda/barra-busqueda.component';
import { PanelFiltrosComponent } from '../../../widgets/web/primero/panel-filtros/panel-filtros.component';
import { GrillaProductosComponent } from '../../../widgets/web/primero/grilla-productos/grilla-productos.component';

import { ProductPreview } from '../../../models/product/preview';
import { CartService } from '../../../services/cart/cart.service';
import { ProductoService } from '../../../services/product/product.service';

@Component({
  selector: 'ed-web-home',
  standalone: true,
  imports: [CommonModule, BarraSuperiorComponent, FranjaMarcaComponent, CarruselHeroComponent,
    CintaPromocionComponent, ChipsCategoriasComponent, BarraBusquedaComponent,
    PanelFiltrosComponent, GrillaProductosComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  private productService = inject(ProductoService);
  private router = inject(Router);
  private cart = inject(CartService);
  productos: ProductPreview[] = [];
  categoriaId: number | null = null;

  // Datos crudos y filtrados
  allProductos: ProductPreview[] = [];

  // Estado UI
  loading = false;
  error: string | null = null;

  // Filtros
  categoriaSeleccionada = 'Detalles Personalizados';
  precioMinDisponible = 0;
  precioMaxDisponible = 0;
  precioMinSel: number | null = null;
  precioMaxSel: number | null = null;

  ngOnInit() {
    this.cargarProductos();
  }


  private cargarProductos(): void {
    this.loading = true;
    this.error = null;

    const src$ = this.categoriaId
      ? this.productService.listByCategory(this.categoriaId)
      : this.productService.getAll();

    src$.subscribe({
      next: data => {
        this.allProductos = data ?? [];
        this.calcularRangoPrecioDisponible();
        this.aplicarFiltros();     // respeta rango precio
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.error = 'No se pudieron cargar los productos.';
        this.loading = false;
      }
    });
  }

  private calcularRangoPrecioDisponible() {
    if (!this.allProductos.length) {
      this.precioMinDisponible = 0;
      this.precioMaxDisponible = 0;
      return;
    }
    const precios = this.allProductos.map(p => p.precio);
    this.precioMinDisponible = Math.min(...precios);
    this.precioMaxDisponible = Math.max(...precios);

    // Si no hay selección previa, inicializamos a null (sin filtrar)
    if (this.precioMinSel === null) this.precioMinSel = null;
    if (this.precioMaxSel === null) this.precioMaxSel = null;
  }

  /** Filtros de categoría + precio */
  private aplicarFiltros() {
    // 1) Categoría: solo 'Detalles Personalizados' muestra; otras vacía
    if (this.categoriaSeleccionada !== 'Detalles Personalizados') {
      this.productos = [];
      return;
    }

    // 2) Precio: si min/max están definidos, filtramos por rango
    let lista = [...this.allProductos];

    if (this.precioMinSel !== null) {
      lista = lista.filter(p => p.precio >= (this.precioMinSel as number));
    }
    if (this.precioMaxSel !== null) {
      lista = lista.filter(p => p.precio <= (this.precioMaxSel as number));
    }

    this.productos = lista;
  }

  // Handlers provenientes del panel
  onCategoriaChange(id: number | null) {
    this.categoriaId = id;
    this.cargarProductos();   // recarga desde API y vuelve a filtrar por precio
  }

  onPrecioChange(r: { min: number | null; max: number | null }) {
    this.precioMinSel = r.min;
    this.precioMaxSel = r.max;
    this.aplicarFiltros();
  }

  onAddToCart(p: ProductPreview) {
    const stockMax = Math.max(1, (p.stock ?? 1) - 1); // misma regla stock-1
    this.cart.add({
      id: p.id,
      nombre: p.nombre,
      imagen: p.imagen,
      precio: p.precio,
      qty: 1,                                         // agrega 1 por clic
      stockMax
    });
  }

  onOpenDetail(p: ProductPreview) {
    this.router.navigate(['/producto', p.id]);
  }
}

