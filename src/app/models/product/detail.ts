export interface ProductDetail {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock?: number;
  imagen?: string;
  slug?: string;
}
