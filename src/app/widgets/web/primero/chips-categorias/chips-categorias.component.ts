import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ed-web-chips-categorias',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chips-categorias.component.html',
  styleUrls: ['./chips-categorias.component.css']
})
export class ChipsCategoriasComponent {
  /** Lista de categorías a mostrar */
  @Input() categorias: string[] = [];

  /** Categoría seleccionada (opcional, control externo) */
  @Input() seleccionada: string | null = null;
  @Input() conteos: Record<string, number> = {};
  @Output() seleccionarCategoria = new EventEmitter<string>();

  onSelect(cat: string) {
    this.seleccionada = cat;
    this.seleccionarCategoria.emit(cat);
  }

  isActive(cat: string): boolean {
    return this.seleccionada === cat;
  }
}
