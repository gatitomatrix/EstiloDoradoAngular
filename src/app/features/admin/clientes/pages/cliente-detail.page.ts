import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-cliente-detail',
  imports: [CommonModule],
  template: `
    <div class="p-3">
      <h2>Detalle de Cliente (ADMIN)</h2>
      <p>Editar/Actualizar datos del cliente (pendiente de conectar).</p>
    </div>
  `
})
export class ClienteDetailPage {}
