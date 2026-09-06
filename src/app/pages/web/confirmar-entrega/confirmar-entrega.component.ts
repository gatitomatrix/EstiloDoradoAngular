import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CheckoutService } from '../../../services/checkout/checkout.service';
import { CartService } from '../../../services/cart/cart.service';
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';
import { DIRECCION_TIENDA, TEXTO_RECOJO, costoEnvio } from '../../../core/utils/tarifa-envio';

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

  get address() {
    if (this.selected === 'STORE_PICKUP') return TEXTO_RECOJO;
    return this.checkout.savedExpress?.full || this.checkout.value.address?.full || '–';
  }
  get mode() { return this.checkout.value.mode; }
  readonly direccionTienda = DIRECCION_TIENDA;

  get feeLabel(): string {
    const a = this.checkout.savedExpress || this.checkout.value.address;
    if (a?.envioTipo === 'AGENCIA') {
      return a.agenciaNombre ? `Shalom ${a.agenciaNombre} · S/ 12` : 'Shalom agencia · S/ 12';
    }
    if (a?.envioTipo === 'DOMICILIO') {
      return costoEnvio(a?.departamento, a?.provincia, a?.distrito, 'DOMICILIO').etiqueta;
    }
    return costoEnvio(a?.departamento, a?.provincia, a?.distrito).etiqueta;
  }

  get expressFee(): number {
    return this.checkout.value.fee || this.expressFeeCalc;
  }

  private get expressFeeCalc(): number {
    const a = this.checkout.savedExpress || this.checkout.value.address;
    const tipo = a?.envioTipo === 'DOMICILIO' ? 'DOMICILIO' : 'AGENCIA';
    return costoEnvio(a?.departamento, a?.provincia, a?.distrito, tipo).costo;
  }

  // Radio buttons
  selected: 'STORE_PICKUP' | 'EXPRESS' = this.checkout.value.mode === 'STORE_PICKUP' ? 'STORE_PICKUP' : 'EXPRESS';

   /** habilita el botón cuando ya hay un modo de entrega elegido */
  get resumenOk(): boolean {
    return this.checkout.value.mode === 'STORE_PICKUP' || this.checkout.envioListo(this.checkout.value.address);
  }

  ngOnInit() {
    if (!this.cart.items.length) {
      this.router.navigateByUrl('/carrito');
    }
  }
  
  onSelectPickup() {
    this.selected = 'STORE_PICKUP';
    this.checkout.setMode('STORE_PICKUP');
    this.checkout.setAddress({
      departamento: 'Pasco',
      provincia: 'Pasco',
      distrito: 'Chaupimarca',
      via: 'Retiro en tienda',
      numero: 'S/N',
      full: TEXTO_RECOJO,
    });
    this.checkout.setCosts(0, 0);
  }
  onSelectExpress() {
    const saved = this.checkout.savedExpress;
    if (!saved) {
      this.router.navigateByUrl('/entrega');
      return;
    }
    this.selected = 'EXPRESS';
    this.checkout.setAddress(saved);
    this.checkout.setMode('EXPRESS');
    this.checkout.setCosts(
      costoEnvio(saved.departamento, saved.provincia, saved.distrito, saved.envioTipo === 'DOMICILIO' ? 'DOMICILIO' : 'AGENCIA').costo,
      0,
    );
  }
  irAPagar() {
    if (this.checkout.value.mode === 'STORE_PICKUP' || this.checkout.envioListo(this.checkout.value.address)) {
      this.router.navigateByUrl('/pago');
      return;
    }
    this.router.navigate(['/entrega'], { state: { openAddress: true } });
  }
}
