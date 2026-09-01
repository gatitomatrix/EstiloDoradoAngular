import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Categoria, CategoriaService } from '../../../../services/categoria/categoria.service';

@Component({
  selector: 'ed-web-panel-filtros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './panel-filtros.component.html',
  styleUrls: ['./panel-filtros.component.css']
})
export class PanelFiltrosComponent {


  private cats = inject(CategoriaService);

  categorias: Categoria[] = [];
  selectedId?: number;

  @Output() changeCategoria = new EventEmitter<{ id: number | null; nombre: string | null }>();

  ngOnInit() {
    this.cats.getAll().subscribe(cs => this.categorias = cs);
  }

  labelOf(c: Categoria): string {
    return c.nombre.toLowerCase().trim() === 'detalles' ? 'Cajas' : c.nombre;
  }

  onSelect(id: number, nombre: string) {
    this.selectedId = id;
    if (nombre.toLowerCase().trim() === 'detalles') {
      this.changeCategoria.emit({ id: null, nombre: 'Cajas' });
      return;
    }
    this.changeCategoria.emit({ id, nombre });
  }

  limpiar() {
    this.selectedId = undefined;
    this.changeCategoria.emit({ id: null, nombre: null });
  }

  limpiarTodo() {
    this.selectedId = undefined;
    this.precioMinSel = null;
    this.precioMaxSel = null;
    this.changeCategoria.emit({ id: null, nombre: null });
    this.onChangePrecio();
  }

  /** Rango de precios disponible (calculado en Home) */
  @Input() precioMinDisponible = 0;
  @Input() precioMaxDisponible = 0;

  /** Rango de precios seleccionado */
  @Input() precioMinSel: number | null = null;
  @Input() precioMaxSel: number | null = null;
  @Output() precioChange = new EventEmitter<{ min: number | null; max: number | null }>();

  onChangePrecio() {
    const lo = Number(this.precioMinDisponible) || 0;
    const hi = Number(this.precioMaxDisponible) || 0;
    let min = this.toNum(this.precioMinSel);
    let max = this.toNum(this.precioMaxSel);
    if (hi > 0) {
      if (min != null) min = Math.min(hi, Math.max(lo, min));
      if (max != null) max = Math.min(hi, Math.max(lo, max));
    }
    if (min != null && max != null && min > max) {
      const t = min;
      min = max;
      max = t;
    }
    this.precioMinSel = min;
    this.precioMaxSel = max;
    this.precioChange.emit({ min, max });
  }

  private toNum(v: number | null | undefined): number | null {
    if (v === null || v === undefined || v === ('' as unknown as number)) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return n;
  }

  limpiarPrecios() {
    this.precioMinSel = null;
    this.precioMaxSel = null;
    this.onChangePrecio();
  }
}
