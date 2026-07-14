import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ed-web-cinta-promocion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cinta-promocion.component.html',
  styleUrls: ['./cinta-promocion.component.css']
})
export class CintaPromocionComponent {
  /** Texto de la cinta (configurable desde la page) */
  @Input() texto: string = '¡35% de descuento en arreglos florales por temporada!';
  /** Texto del botón opcional */
  @Input() textoBoton: string = 'Ver ofertas';
  /** URL opcional del botón (puede ser una ruta interna más adelante) */
  @Input() url: string = '#';
  /** Mostrar u ocultar el botón */
  @Input() mostrarBoton: boolean = true;
}
