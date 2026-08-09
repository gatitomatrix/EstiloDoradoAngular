import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'ed-web-home',
  standalone: true,
  imports: [
    CommonModule,
    BarraSuperiorComponent,
    FranjaMarcaComponent,
    CarruselHeroComponent,
    CintaPromocionComponent,
    ChipsCategoriasComponent,
    BarraBusquedaComponent,
    PanelFiltrosComponent,
    GrillaProductosComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  private productService = inject(ProductoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cart = inject(CartService);
  private ui = inject(UiService);

  productos: ProductPreview[] = [];
  categoriaId: number | null = null;
  allProductos: ProductPreview[] = [];
  loading = false;
  error: string | null = null;
  searchQuery = '';
  chipActivo: string | null = null;

  precioMinDisponible = 0;
  precioMaxDisponible = 0;
  precioMinSel: number | null = null;
  precioMaxSel: number | null = null;

  chips = ['Todos', 'Amor', 'Para Él', 'Para Ella', 'Cumpleaños', 'Ocasiones', 'Tendencias', 'Ofertas'];

  ngOnInit() {
    this.route.queryParamMap.subscribe((qp) => {
      this.searchQuery = (qp.get('q') || '').trim();
      this.cargarProductos();
    });
  }

  cargarProductos(): void {
    this.loading = true;
    this.error = null;

    const src$ = this.categoriaId
      ? this.productService.listByCategory(this.categoriaId)
      : this.productService.getAll();

    src$.subscribe({
      next: (data) => {
        this.allProductos = data ?? [];
        this.calcularRangoPrecioDisponible();
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudieron cargar los productos. Revisa que Laravel esté en marcha.';
        this.loading = false;
      },
    });
  }

  private calcularRangoPrecioDisponible() {
    if (!this.allProductos.length) {
      this.precioMinDisponible = 0;
      this.precioMaxDisponible = 0;
      return;
    }
    const precios = this.allProductos.map((p) => p.precio);
    this.precioMinDisponible = Math.min(...precios);
    this.precioMaxDisponible = Math.max(...precios);
  }

  private aplicarFiltros() {
    let lista = [...this.allProductos];

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      lista = lista.filter(
        (p) =>
          (p.nombre || '').toLowerCase().includes(q) ||
          String(p.id).includes(q),
      );
    }

    if (this.chipActivo && this.chipActivo !== 'Todos') {
      const chip = this.chipActivo.toLowerCase();
      lista = lista.filter((p) => (p.nombre || '').toLowerCase().includes(chip));
    }

    if (this.precioMinSel !== null) {
      lista = lista.filter((p) => p.precio >= (this.precioMinSel as number));
    }
    if (this.precioMaxSel !== null) {
      lista = lista.filter((p) => p.precio <= (this.precioMaxSel as number));
    }

    this.productos = lista;
  }

  onCategoriaChange(id: number | null) {
    this.categoriaId = id;
    this.cargarProductos();
  }

  onPrecioChange(r: { min: number | null; max: number | null }) {
    this.precioMinSel = r.min;
    this.precioMaxSel = r.max;
    this.aplicarFiltros();
  }

  onChip(cat: string) {
    this.chipActivo = cat === 'Todos' ? null : cat;
    this.aplicarFiltros();
  }

  onBuscarSecundario(q: string) {
    const term = (q || '').trim();
    this.router.navigate(['/'], { queryParams: term ? { q: term } : {} });
  }

  clearSearch() {
    this.router.navigate(['/'], { queryParams: {} });
  }

  onAddToCart(p: ProductPreview) {
    const stockMax = Math.max(0, p.stock ?? 0);
    if (stockMax <= 0) {
      this.ui.warn('Este producto no tiene stock disponible.');
      return;
    }
    this.cart.add({
      id: p.id,
      nombre: p.nombre,
      imagen: p.imagen,
      precio: p.precio,
      qty: 1,
      stockMax: Math.max(1, stockMax),
    });
    this.ui.ok(`${p.nombre} agregado al carrito`);
  }

  onOpenDetail(p: ProductPreview) {
    this.router.navigate(['/producto', p.id]);
  }
}
