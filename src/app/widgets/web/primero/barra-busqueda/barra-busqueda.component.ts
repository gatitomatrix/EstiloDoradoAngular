import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'ed-web-barra-busqueda',
  standalone: true,
  imports: [CommonModule, FormsModule],   // 👈 aquí añadimos FormsModule
  templateUrl: './barra-busqueda.component.html',
  styleUrls: ['./barra-busqueda.component.css']
})
export class BarraBusquedaComponent {
  query = '';

  @Output() buscar = new EventEmitter<string>();

  onSubmit(evt: Event) {
    evt.preventDefault();
    this.buscar.emit(this.query.trim());
  }
}
