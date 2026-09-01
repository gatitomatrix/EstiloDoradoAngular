import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';
import { CarruselHeroComponent } from '../../../widgets/web/primero/carrusel-hero/carrusel-hero.component';
import { CintaPromocionComponent } from '../../../widgets/web/primero/cinta-promocion/cinta-promocion.component';
import { ChipsCategoriasComponent } from '../../../widgets/web/primero/chips-categorias/chips-categorias.component';
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
  page = 1;
  readonly pageSize = 12;
  categoriaId: number | null = null;
  categoriaNombre: string | null = null;
  allProductos: ProductPreview[] = [];
  loading = false;
  error: string | null = null;
  searchQuery = '';
  chipActivo: string | null = null;
  promoTexto = '';

  precioMinDisponible = 0;
  precioMaxDisponible = 0;
  precioMinSel: number | null = null;
  precioMaxSel: number | null = null;

  chips = ['Todos', 'Amor', 'Para Él', 'Para Ella', 'Cumpleaños', 'Tendencias', 'Peluches'];

  /** Palabras reales del catálogo (etiquetas / nombre), no marketing vacío. */
  private readonly chipKeys: Record<string, string[]> = {
    Amor: ['romance', 'pareja', 'enamorados'],
    'Para Él': ['caballero', 'hombre', 'cerveza', 'billetera', 'futbol', 'deporte'],
    'Para Ella': ['bolso', 'moda', 'perfume', 'fragancia', 'rosa'],
    Cumpleaños: ['cumpleaños', 'fiesta', 'globos'],
    Tendencias: ['stich', 'hotwheels', 'piton', 'cerdita'],
    Peluches: ['peluche', 'osito', 'stich', 'cerdita', 'infantil'],
  };

  ngOnInit() {
    this.route.queryParamMap.subscribe((qp) => {
      this.searchQuery = (qp.get('q') || '').trim();
      this.cargarProductos();
    });
    this.productService.getPromoActiva().subscribe({
      next: (p) => { this.promoTexto = p?.activa && p.texto ? p.texto : ''; },
      error: () => { this.promoTexto = ''; },
    });
  }

  cargarProductos(): void {
    this.loading = true;
    this.error = null;

    const src$ = this.productService.getAll();

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

    if (this.categoriaId || this.categoriaNombre) {
      const onlyTags = (this.categoriaNombre || '').toLowerCase() === 'cajas';
      const keys = this.categoryKeys(this.categoriaNombre);
      lista = lista.filter((p) => {
        if (onlyTags) {
          return keys.some((k) => this.productService.matchesQuery(p, k));
        }
        const byId = this.categoriaId != null && p.categoriaId === this.categoriaId;
        return byId || keys.some((k) => this.productService.matchesQuery(p, k));
      });
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      lista = lista.filter((p) => this.productService.matchesQuery(p, q));
    }

    if (this.chipActivo && this.chipActivo !== 'Todos') {
      const keys = this.chipKeys[this.chipActivo] ?? [this.chipActivo.toLowerCase()];
      lista = lista.filter((p) => keys.some((k) => this.productService.matchesQuery(p, k)));
    }

    if (this.precioMinSel !== null) {
      lista = lista.filter((p) => p.precio >= (this.precioMinSel as number));
    }
    if (this.precioMaxSel !== null) {
      lista = lista.filter((p) => p.precio <= (this.precioMaxSel as number));
    }

    this.productos = lista;
    this.page = 1;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.productos.length / this.pageSize));
  }

  get paginas(): number[] {
    const n = this.totalPages;
    return Array.from({ length: n }, (_, i) => i + 1);
  }

  get productosPagina(): ProductPreview[] {
    const start = (this.page - 1) * this.pageSize;
    return this.productos.slice(start, start + this.pageSize);
  }

  irPagina(n: number) {
    const p = Math.min(this.totalPages, Math.max(1, n));
    if (p === this.page) return;
    this.page = p;
    document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onCategoriaChange(ev: { id: number | null; nombre: string | null } | number | null) {
    if (ev && typeof ev === 'object') {
      this.categoriaId = ev.id;
      this.categoriaNombre = ev.nombre;
    } else {
      this.categoriaId = ev;
      this.categoriaNombre = null;
    }
    this.aplicarFiltros();
  }

  /** Misma idea que el chat: categoría + etiquetas (carteles → cartel, etc.). */
  private categoryKeys(nombre: string | null): string[] {
    if (!nombre) return [];
    const n = nombre.toLowerCase().trim();
    const keys = new Set<string>([n]);
    if (n.endsWith('es') && n.length > 4) keys.add(n.slice(0, -2));
    else if (n.endsWith('s') && n.length > 3) keys.add(n.slice(0, -1));
    const extra: Record<string, string[]> = {
      carteles: ['cartel', 'mensaje'],
      cartel: ['carteles', 'mensaje'],
      cajas: ['caja', 'cajita'],
      caja: ['cajita'],
      florales: ['flores', 'arreglo', 'floral'],
      flores: ['florales', 'arreglo'],
      perfumeria: ['perfume', 'fragancia', 'perfumería'],
    };
    for (const k of [...keys]) {
      (extra[k] || []).forEach((x) => keys.add(x));
    }
    return [...keys];
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

  chipConteos(): Record<string, number> {
    const base = this.listaSinChip();
    const out: Record<string, number> = { Todos: base.length };
    for (const name of this.chips) {
      if (name === 'Todos') continue;
      out[name] = base.filter((p) => this.productoEnChip(p, name)).length;
    }
    return out;
  }

  private listaSinChip(): ProductPreview[] {
    let lista = [...this.allProductos];
    if (this.categoriaId || this.categoriaNombre) {
      const onlyTags = (this.categoriaNombre || '').toLowerCase() === 'cajas';
      const keys = this.categoryKeys(this.categoriaNombre);
      lista = lista.filter((p) => {
        if (onlyTags) {
          return keys.some((k) => this.productService.matchesQuery(p, k));
        }
        const byId = this.categoriaId != null && p.categoriaId === this.categoriaId;
        return byId || keys.some((k) => this.productService.matchesQuery(p, k));
      });
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      lista = lista.filter((p) => this.productService.matchesQuery(p, q));
    }
    if (this.precioMinSel !== null) {
      lista = lista.filter((p) => p.precio >= (this.precioMinSel as number));
    }
    if (this.precioMaxSel !== null) {
      lista = lista.filter((p) => p.precio <= (this.precioMaxSel as number));
    }
    return lista;
  }

  private productoEnChip(p: ProductPreview, chip: string): boolean {
    const keys = this.chipKeys[chip] ?? [chip.toLowerCase()];
    return keys.some((k) => this.productService.matchesQuery(p, k));
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
      precioLista: p.precioLista ?? p.precio,
      qty: 1,
      stockMax: Math.max(1, stockMax),
    });
    this.ui.ok(`${p.nombre} agregado al carrito`, 'Carrito', { link: '/carrito', cta: 'Ver carrito' });
  }

  onOpenDetail(p: ProductPreview) {
    this.router.navigate(['/producto', p.id]);
  }
}
