import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProductPreview } from '../../models/product/preview';
import { ProductDetail } from '../../models/product/detail';

type ApiProducto = {
  id_producto: number;
  nombre: string;
  descripcion?: string;
  etiquetas?: string | null;
  precio_compra?: string;
  precio_venta: string;
  precio_final?: number | string;
  descuento_aplicado?: number | string;
  en_oferta?: boolean;
  stock?: number;
  id_categoria?: number;
  imagen_url?: string;
  estado?: string;
  slug?: string;
};

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/productos`;

  /** Adaptadores */
  private toPreview = (a: ApiProducto): ProductPreview => ({
    id: a.id_producto,
    nombre: a.nombre,
    descripcion: a.descripcion ?? '',
    etiquetas: a.etiquetas ?? '',
    precio: Number(a.precio_final ?? a.precio_venta),
    precioLista: Number(a.precio_venta),
    descuentoPct: Number(a.descuento_aplicado ?? 0),
    stock: a.stock ?? 0,
    imagen: a.imagen_url ?? '',
    categoriaId: a.id_categoria ?? null,
    slug: a.slug ?? ''
  });

  private toDetail = (a: ApiProducto): ProductDetail => ({
    id: a.id_producto,
    nombre: a.nombre,
    descripcion: a.descripcion ?? '',
    precio: Number(a.precio_final ?? a.precio_venta),
    precioLista: Number(a.precio_venta),
    descuentoPct: Number(a.descuento_aplicado ?? 0),
    stock: a.stock ?? 0,
    imagen: a.imagen_url ?? '',
    slug: a.slug ?? '',
  });

  getAll(): Observable<ProductPreview[]> {
    return this.http.get<ApiProducto[]>(this.base).pipe(
      map(list => (list ?? []).map(this.toPreview))
    );
  }

  getPromoActiva() {
    return this.http.get<{ activa: boolean; texto?: string; porcentaje?: number }>(
      `${environment.apiBaseUrl}/promocion-activa`
    );
  }

  listByCategory(categoriaId: number): Observable<ProductPreview[]> {
    // si tienes endpoint por categoría cámbialo; de momento filtro en front
    return this.getAll().pipe(
      map(list => list.filter(p => p.categoriaId === categoriaId))
    );
  }

  getById(id: number): Observable<ProductDetail> {
    return this.http.get<ApiProducto>(`${this.base}/${id}`).pipe(
      map(this.toDetail)
    );
  }

  /** Buscar por nombre, descripción o etiquetas (misma lógica que el admin / IA) */
  searchByName(q: string): Observable<ProductPreview[]> {
    const needle = q.toLowerCase().trim();
    return this.getAll().pipe(
      map((list) => list.filter((p) => this.matchesQuery(p, needle))),
    );
  }

  matchesQuery(p: ProductPreview, q: string): boolean {
    if (!q) return true;
    const nq = q.toLowerCase().trim();
    const name = `${p.nombre || ''} ${p.slug || ''}`.toLowerCase();
    const tags = (p.etiquetas || '').toLowerCase();
    const desc = (p.descripcion || '').toLowerCase();

    if (name.includes(nq) || tags.includes(nq)) return true;
    if (/^\d+$/.test(nq) && String(p.id) === nq) return true;

    const tokens = nq.split(/\s+/).filter(Boolean);
    if (!tokens.length) return true;

    const inHay = (hay: string) => tokens.every((t) => this.tokenIn(hay, t));
    if (inHay(name) || inHay(tags)) return true;
    if (tokens.length === 1 && tokens[0].length >= 3 && inHay(desc)) return true;
    return false;
  }

  /** peluches → peluche; ositos → osito; cartera → billetera */
  private tokenIn(hay: string, t: string): boolean {
    if (/^\d+$/.test(t)) {
      return new RegExp(`(?:^|[^0-9])${t}(?:[^0-9]|$)`).test(hay);
    }
    return this.tokenVariants(t).some((v) => hay.includes(v));
  }
  private tokenVariants(t: string): string[] {
    const out = new Set<string>([t]);
    if (t.endsWith('es') && t.length > 4) {
      out.add(t.slice(0, -1));
      out.add(t.slice(0, -2));
    } else if (t.endsWith('s') && t.length > 3) {
      out.add(t.slice(0, -1));
    }
    const syn: Record<string, string[]> = {
      cartera: ['billetera'],
      carteras: ['billetera', 'billeteras'],
      billetera: ['cartera'],
      billeteras: ['cartera', 'carteras'],
      monedero: ['billetera', 'cartera'],
    };
    for (const v of [...out]) {
      (syn[v] || []).forEach((s) => out.add(s));
    }
    return [...out];
  }
}
