import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';
import { CartService } from '../../../services/cart/cart.service';
import { CartItem } from '../../../models/cart/cart-item';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'ed-web-carrito',
  standalone: true,
  imports: [CommonModule, BarraSuperiorComponent, FranjaMarcaComponent],
  templateUrl: './carrito.component.html',
  styleUrls: ['./carrito.component.css']
})
export class CarritoComponent implements OnInit, OnDestroy {
  private cart = inject(CartService);
  private router = inject(Router);
  private auth = inject(AuthService);

  items: CartItem[] = [];
  sub?: Subscription;

  showLogin = false;
  hideLoginPassword = true;
  loginError = '';

  ngOnInit(): void {
    this.sub = this.cart.items$.subscribe(list => this.items = list);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  dec(item: CartItem) { this.cart.updateQty(item.id, item.qty - 1); }
  inc(item: CartItem) { this.cart.updateQty(item.id, item.qty + 1); }
  remove(item: CartItem) { this.cart.remove(item.id); }

  get subtotal(): number { return this.cart.getSubtotal(); }
  get descuentos(): number { return 0; } // hook para futuro
  get total(): number { return this.subtotal - this.descuentos; }

  seguirComprando() { this.router.navigateByUrl('/'); }
  continuarCompra() { 
    if (this.auth.isLoggedIn) this.router.navigateByUrl('/entrega');
    else this.openLogin();
  }

  openLogin() {
    this.showLogin = true;
    this.loginError = '';
    this.hideLoginPassword = true;
  }

}