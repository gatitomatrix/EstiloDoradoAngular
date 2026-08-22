import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CheckoutService } from '../../../services/checkout/checkout.service';
import { CartService } from '../../../services/cart/cart.service';
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';
import { estimarEnvio } from '../../../core/utils/tarifa-envio';

@Component({
  selector: 'ed-web-confirmar-entrega',
  standalone: true,
  imports: [CommonModule, BarraSuperiorComponent, FranjaMarcaComponent, RouterLink],
  templateUrl: './confirmar-entrega.component.html',
  styleUrls: ['./confirmar-entrega.component.css']
})
export class ConfirmarEntregaComponent {
  private checkout = inject(CheckoutService);
  private cart = inject(CartService);
  private router = inject(Router);

  // timeline: en “Entrega” ahora
  get subtotal() { return this.cart.getSubtotal(); }
  get fee() { return this.checkout.value.fee; }
  get discount() { return this.checkout.value.discount; }
  get total() { return this.subtotal + this.fee - this.discount; }

  get address() { return this.checkout.value.address?.full || '–'; }
  get mode() { return this.checkout.value.mode; }

  get feeLabel(): string {
    const a = this.checkout.value.address;
    return estimarEnvio(a?.departamento, a?.provincia).etiqueta;
  }

  get expressFee(): number {
    const a = this.checkout.value.address;
    return estimarEnvio(a?.departamento, a?.provincia).costo;
  }

  // Radio buttons
  selected: 'STORE_PICKUP' | 'EXPRESS' = this.checkout.value.mode === 'STORE_PICKUP' ? 'STORE_PICKUP' : 'EXPRESS';

   /** habilita el botón cuando ya hay un modo de entrega elegido */
  get resumenOk(): boolean {
    return this.checkout.value.mode === 'STORE_PICKUP' || this.checkout.value.mode === 'EXPRESS';
  }

  ngOnInit() {
    if (!this.cart.items.length) {
      this.router.navigateByUrl('/carrito');
    }
  }
  
  onSelectPickup() {
    this.selected = 'STORE_PICKUP';
    this.checkout.setMode('STORE_PICKUP');
    this.checkout.setCosts(0, 0);
  }
  onSelectExpress() {
    this.selected = 'EXPRESS';
    this.checkout.setMode('EXPRESS');
    this.checkout.setCosts(this.expressFee, 0);
  }
  irAPagar() {
  this.router.navigateByUrl('/pago');
}
}
