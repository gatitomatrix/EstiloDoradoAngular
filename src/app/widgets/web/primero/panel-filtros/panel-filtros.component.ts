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
    this.precioChange.emit({
      min: this.precioMinSel,
      max: this.precioMaxSel
    });
  }

  limpiarPrecios() {
    this.precioMinSel = null;
    this.precioMaxSel = null;
    this.onChangePrecio();
  }
}
