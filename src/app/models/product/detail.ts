export interface ProductDetail {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  precioLista?: number;
  descuentoPct?: number;
  stock?: number;
  imagen?: string;
  slug?: string;
}
