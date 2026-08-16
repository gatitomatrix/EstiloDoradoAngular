export interface ProductPreview {
  id: number;
  nombre: string;
  descripcion?: string;
  etiquetas?: string;
  precio: number;
  stock?: number;
  imagen?: string;
  categoriaId?: number | null;
  slug?: string;
}
