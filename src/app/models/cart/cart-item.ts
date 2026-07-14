export interface CartItem {
  id: number | string;
  nombre: string;
  imagen?: string | null;
  precio: number;        // precio unitario
  qty: number;           // cantidad seleccionada
  stockMax: number;      // límite real (p.ej., stock-1)
}
