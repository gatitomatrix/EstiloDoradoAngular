import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ed-web-galeria-producto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './galeria-producto.component.html',
  styleUrls: ['./galeria-producto.component.css']
})
export class GaleriaProductoComponent {
  /** Rutas absolutas o relativas de imágenes */
  @Input() imagenes: string[] = [];

  idx = 0;
  sel(i: number) { this.idx = i; }
}
