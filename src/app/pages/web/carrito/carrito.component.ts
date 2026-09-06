import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';
import { CartService } from '../../../services/cart/cart.service';
import { CartItem } from '../../../models/cart/cart-item';
import { AuthService } from '../../../services/auth/auth.service';
import { ReturnUrlService } from '../../../core/services/return-url.service';

@Component({
  selector: 'ed-web-carrito',
  standalone: true,
  imports: [CommonModule, BarraSuperiorComponent, FranjaMarcaComponent],
  templateUrl: './carrito.component.html',
  styleUrls: ['./carrito.component.css'],
})
export class CarritoComponent implements OnInit, OnDestroy {
  private cart = inject(CartService);
  private router = inject(Router);
  private auth = inject(AuthService);
  private returnUrl = inject(ReturnUrlService);

  items: CartItem[] = [];
  sub?: Subscription;

  ngOnInit(): void {
    this.sub = this.cart.items$.subscribe((list) => (this.items = list));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  dec(item: CartItem) {
    this.cart.updateQty(item.id, item.qty - 1);
  }
  inc(item: CartItem) {
    this.cart.updateQty(item.id, item.qty + 1);
  }
  remove(item: CartItem) {
    this.cart.remove(item.id);
  }

  get subtotal(): number {
    return this.cart.getSubtotal();
  }
  get listado(): number {
    return this.cart.getListado();
  }
  get descuentos(): number {
    return this.cart.getDescuentos();
  }
  get total(): number {
    return this.subtotal;
  }
  get canContinue(): boolean {
    return this.items.length > 0;
  }

  seguirComprando() {
    this.router.navigateByUrl('/');
  }

  continuarCompra() {
    if (!this.canContinue) return;
    if (this.auth.isLoggedIn) {
      this.router.navigateByUrl('/entrega');
      return;
    }
    // Guardar destino y abrir modal de login de la barra superior
    this.returnUrl.set('/entrega');
    window.dispatchEvent(new CustomEvent('ed-open-login'));
  }
}
