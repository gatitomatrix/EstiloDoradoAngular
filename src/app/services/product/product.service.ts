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
    precio: Number(a.precio_venta),
    stock: a.stock ?? 0,
    imagen: a.imagen_url ?? '',
    categoriaId: a.id_categoria ?? null,
    slug: a.slug ?? ''
  });

  private toDetail = (a: ApiProducto): ProductDetail => ({
    id: a.id_producto,
    nombre: a.nombre,
    descripcion: a.descripcion ?? '',
    precio: Number(a.precio_venta),
    stock: a.stock ?? 0,
    imagen: a.imagen_url ?? '',
    slug: a.slug ?? '',
  });

  getAll(): Observable<ProductPreview[]> {
    return this.http.get<ApiProducto[]>(this.base).pipe(
      map(list => (list ?? []).map(this.toPreview))
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
    const blob = `${p.nombre} ${p.descripcion || ''} ${p.etiquetas || ''} ${p.slug || ''} ${p.id}`
      .toLowerCase();
    const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
    if (tokens.length === 0) return blob.includes(q);
    return tokens.every((t) => this.tokenVariants(t).some((v) => blob.includes(v)));
  }

  /** peluches → peluche; ositos → osito; flores → flor */
  private tokenVariants(t: string): string[] {
    const out = new Set<string>([t]);
    if (t.endsWith('es') && t.length > 4) {
      out.add(t.slice(0, -1));
      out.add(t.slice(0, -2));
    } else if (t.endsWith('s') && t.length > 3) {
      out.add(t.slice(0, -1));
    }
    return [...out];
  }
}
