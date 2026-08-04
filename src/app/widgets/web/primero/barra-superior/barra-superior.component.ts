import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription, fromEvent } from 'rxjs';
import { CartService } from '../../../../services/cart/cart.service';
import { AuthService, AuthUser } from '../../../../services/auth/auth.service';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProductoService } from '../../../../services/product/product.service';
import { FormsModule } from '@angular/forms';
import { ReturnUrlService } from '../../../../core/services/return-url.service';

@Component({
  selector: 'ed-web-barra-superior',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './barra-superior.component.html',
  styleUrls: ['./barra-superior.component.css'],
})
export class BarraSuperiorComponent implements OnInit, OnDestroy {
  private cart = inject(CartService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private productos = inject(ProductoService);
  private returnUrl = inject(ReturnUrlService);

  search = '';

  totalQty = 0;
  user: AuthUser | null = null;

  showProfileMenu = false;
  showLoginModal = false;
  showLogin = false;
  submitting = false;
  hideLoginPassword = true;
  loginError = '';

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  sub?: Subscription;
  sub2?: Subscription;
  subOpenLogin?: Subscription;

  ngOnInit(): void {
    this.sub = this.cart.items$.subscribe(
      (items) => (this.totalQty = items.reduce((a, i) => a + i.qty, 0)),
    );
    this.sub2 = this.auth.user$.subscribe((u) => (this.user = u));
    if (this.auth.isLoggedIn && !this.user) this.auth.me().subscribe();

    // Carrito / guards pueden pedir abrir el modal
    this.subOpenLogin = fromEvent(window, 'ed-open-login').subscribe(() => {
      this.openLogin();
    });
  }
  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.sub2?.unsubscribe();
    this.subOpenLogin?.unsubscribe();
  }

  toggleProfileMenu() {
    this.showProfileMenu = !this.showProfileMenu;
  }

  goCart() {
    this.router.navigateByUrl('/carrito');
  }

  onClickMisCompras() {
    if (this.auth.isLoggedIn) this.router.navigateByUrl('/mis-compras');
    else {
      this.returnUrl.set('/mis-compras');
      this.openLogin();
    }
  }

  openLogin() {
    this.showLogin = true;
    this.loginError = '';
    this.hideLoginPassword = true;
  }
  closeLogin() {
    this.showLogin = false;
    this.loginForm.reset();
    this.loginError = '';
    this.hideLoginPassword = true;
  }

  toRegistro() {
    this.closeLogin();
    this.router.navigateByUrl('/registro');
  }
  toRecuperar() {
    this.closeLogin();
    this.router.navigateByUrl('/recuperar');
  }

  toRecuperarPrefilled() {
    const email = this.loginForm.value.email || '';
    this.closeLogin();
    this.router.navigate(['/recuperar'], { queryParams: { email } });
  }

  submitLogin() {
    if (this.loginForm.invalid) return;
    const { email, password } = this.loginForm.value;
    this.submitting = true;
    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.submitting = false;
        this.closeLogin();
        this.loginError = '';
        this.auth.me().subscribe({ error: () => {} });
        const dest = this.returnUrl.consume('/mis-compras');
        this.router.navigateByUrl(dest);
      },
      error: () => {
        this.submitting = false;
        this.loginError = 'Correo o contraseña incorrectos.';
      },
    });
  }

  onLogout() {
    this.auth.logout().subscribe({
      next: () => {
        this.showProfileMenu = false;
        this.returnUrl.clear();
        this.router.navigateByUrl('/');
      },
      error: (e) => console.error(e),
    });
  }
  logout() {
    this.auth.logout();
    this.showProfileMenu = false;
  }

  async doSearch() {
    const q = this.search.trim();
    if (!q) return;
    this.productos.searchByName(q).subscribe((list) => {
      if (list.length) {
        this.router.navigate(['/producto', list[0].id]);
      } else {
        alert('No se encontraron productos con ese nombre.');
      }
    });
  }
}
