import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';
import { CartService } from '../../../services/cart/cart.service';
import { CartItem } from '../../../models/cart/cart-item';
import { AuthService } from '../../../services/auth/auth.service';
import { ReturnUrlService } from '../../../core/services/return-url.service';
import { UiService } from '../../../core/services/ui.service';
import { ProductoService } from '../../../services/product/product.service';

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
  private ui = inject(UiService);
  private productosApi = inject(ProductoService);

  items: CartItem[] = [];
  sub?: Subscription;
  preview: CartItem | null = null;
  previewDesc = '';
  previewLoading = false;
  previewZoom = false;
  private previewReq?: Subscription;

  ngOnInit(): void {
    this.cart.refreshPrecios();
    this.sub = this.cart.items$.subscribe((list) => {
      this.items = list;
      if (!this.preview) return;
      const vivo = list.find((x) => x.id === this.preview!.id);
      this.preview = vivo ?? null;
      if (!vivo) this.cerrarPreview();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.previewReq?.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.preview) this.cerrarPreview();
  }

  verProducto(it: CartItem) {
    this.preview = it;
    this.previewDesc = '';
    this.previewZoom = false;
    this.previewLoading = true;
    this.previewReq?.unsubscribe();
    const id = Number(it.id);
    if (!Number.isFinite(id)) {
      this.previewLoading = false;
      return;
    }
    this.previewReq = this.productosApi.getById(id).subscribe({
      next: (p) => {
        this.previewDesc = (p.descripcion || '').trim();
        this.previewLoading = false;
      },
      error: () => {
        this.previewLoading = false;
      },
    });
  }

  cerrarPreview() {
    this.preview = null;
    this.previewDesc = '';
    this.previewZoom = false;
    this.previewLoading = false;
    this.previewReq?.unsubscribe();
  }

  dec(item: CartItem) {
    this.cart.updateQty(item.id, item.qty - 1);
  }
  inc(item: CartItem) {
    if (item.qty >= item.stockMax) {
      this.ui.warn('No hay más unidades disponibles');
      return;
    }
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
