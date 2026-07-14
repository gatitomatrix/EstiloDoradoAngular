import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { CartService } from '../../../../services/cart/cart.service';
import { AuthService, AuthUser } from '../../../../services/auth/auth.service';
import { ReactiveFormsModule, FormBuilder, Validators} from '@angular/forms';
import { ProductoService } from '../../../../services/product/product.service';
import { FormsModule } from '@angular/forms';



@Component({
  selector: 'ed-web-barra-superior',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './barra-superior.component.html',
  styleUrls: ['./barra-superior.component.css']
})
export class BarraSuperiorComponent implements OnInit, OnDestroy {
  private cart = inject(CartService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private productos = inject(ProductoService);

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

  sub?: Subscription; sub2?: Subscription;

  ngOnInit(): void {
    this.sub = this.cart.items$.subscribe(items => this.totalQty = items.reduce((a, i) => a + i.qty, 0));
    this.sub2 = this.auth.user$.subscribe(u => this.user = u);
    if (this.auth.isLoggedIn && !this.user) this.auth.me().subscribe();
  }
  ngOnDestroy(): void { this.sub?.unsubscribe(); this.sub2?.unsubscribe(); }

  toggleProfileMenu() { this.showProfileMenu = !this.showProfileMenu; }

  goCart() { this.router.navigateByUrl('/carrito'); }

  onClickMisCompras() {
    if (this.auth.isLoggedIn) this.router.navigateByUrl('/mis-compras');
    else this.openLogin();
  }

  // Abrir / cerrar modal
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

  toRegistro() { this.closeLogin(); this.router.navigateByUrl('/registro'); }
  toRecuperar() { this.closeLogin(); this.router.navigateByUrl('/recuperar'); }

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
        // opcional: refresh perfil por si abres la app con token previo
        this.auth.me().subscribe();
        this.router.navigateByUrl('/mis-compras');
      },
      error: (e) => {
        this.submitting = false;
        this.loginError = 'Correo o contraseña incorrectos.';
        // TODO: muestra un mensaje con el error del backend (401 etc.)
      }
    });
  }

  onLogout() {
    this.auth.logout().subscribe({
      next: () => {
        this.showProfileMenu = false;
        this.router.navigateByUrl('/');   // vuelve al Home
      },
      error: (e) => console.error(e)
    });
  }
  logout() { this.auth.logout(); this.showProfileMenu = false; }

   async doSearch() {
    const q = this.search.trim();
    if (!q) return;
    this.productos.searchByName(q).subscribe(list => {
      if (list.length) {
        this.router.navigate(['/producto', list[0].id]); // abre el 1º match
      }
    });
  }
}