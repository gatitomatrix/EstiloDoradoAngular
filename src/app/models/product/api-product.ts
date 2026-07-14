export interface ApiProduct {
  id_producto: number;
  nombre: string;
  descripcion: string;
  precio_compra: string;
  precio_venta: string;
  stock: number;
  id_categoria: number;
  id_proveedor: number;
  imagen_url: string | null;
  estado: 'activo' | 'inactivo';
  slug: string;
  created_at: string;
  updated_at: string;
}
