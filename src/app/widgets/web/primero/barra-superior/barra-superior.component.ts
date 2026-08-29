import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription, fromEvent } from 'rxjs';
import { CartService } from '../../../../services/cart/cart.service';
import { AuthService, AuthUser } from '../../../../services/auth/auth.service';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ReturnUrlService } from '../../../../core/services/return-url.service';
import { UiService } from '../../../../core/services/ui.service';
import { environment } from '../../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { GoogleAuthService } from '../../../../core/services/google-auth.service';
import { WhatsappService } from '../../../../core/services/whatsapp.service';

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
  private returnUrl = inject(ReturnUrlService);
  private ui = inject(UiService);
  private http = inject(HttpClient);
  private googleAuth = inject(GoogleAuthService);
  readonly wa = inject(WhatsappService);

  search = '';
  totalQty = 0;
  user: AuthUser | null = null;
  showProfileMenu = false;
  showLogin = false;
  submitting = false;
  googleLoading = false;
  hideLoginPassword = true;
  loginError = '';
  get googleClientId() {
    return this.googleAuth.clientId;
  }

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

  openAsistente() {
    window.dispatchEvent(new CustomEvent('ed-open-asistente'));
  }

  onClickMisCompras() {
    if (this.auth.isLoggedIn) this.router.navigateByUrl('/mis-compras');
    else {
      this.returnUrl.set('/mis-compras');
      this.openLogin();
    }
  }

  checkoutPending = false;

  openLogin() {
    this.showLogin = true;
    this.loginError = '';
    this.hideLoginPassword = true;
    const dest = this.returnUrl.peek() || '';
    this.checkoutPending = dest.startsWith('/entrega') || dest.startsWith('/pago') || dest.startsWith('/carrito');
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
        this.ui.ok('Sesión iniciada');
        this.auth.me().subscribe({ error: () => {} });
        const dest = this.returnUrl.consume('/');
        this.router.navigateByUrl(dest);
      },
      error: () => {
        this.submitting = false;
        this.loginError = 'Correo o contraseña incorrectos.';
        this.ui.err('Correo o contraseña incorrectos.');
      },
    });
  }

  /** Gmail real si hay Client ID; si no, demo solo en desarrollo. */
  async loginWithGoogle() {
    this.googleLoading = true;
    this.loginError = '';
    try {
      if (this.googleAuth.configured) {
        const tokens = await this.googleAuth.signIn();
        this.finishGoogle(tokens);
        return;
      }
      if (environment.production) {
        this.googleLoading = false;
        this.ui.warn('Falta configurar Google Client ID en este servidor.');
        return;
      }
      this.http
        .post<any>(`${environment.apiBaseUrl}/auth/google`, {
          demo: true,
          email: 'demo.google@estilodorado.local',
          nombre: 'Cliente',
          apellido: 'Google Demo',
        })
        .subscribe({
          next: (res) => this.onGoogleOk(res, true),
          error: (err) => this.onGoogleErr(err),
        });
    } catch (e: any) {
      this.googleLoading = false;
      if (e?.message === 'NO_CLIENT_ID') {
        this.ui.warn('Configura googleClientId para entrar con Gmail.');
        return;
      }
      this.ui.err(e?.message || 'No se pudo abrir Google');
    }
  }

  private finishGoogle(tokens: { id_token?: string; access_token?: string }) {
    this.http.post<any>(`${environment.apiBaseUrl}/auth/google`, tokens).subscribe({
      next: (res) => this.onGoogleOk(res, false),
      error: (err) => this.onGoogleErr(err),
    });
  }

  private onGoogleOk(res: any, demo: boolean) {
    this.googleLoading = false;
    if (!res?.token) {
      this.ui.err(res?.message || 'No se pudo iniciar con Google');
      return;
    }
    this.auth.applyExternalLogin(res);
    this.closeLogin();
    this.ui.ok(demo ? 'Entraste con Google (demo local)' : (res.message || 'Sesión con Google'));
    const dest = this.returnUrl.consume('/');
    this.router.navigateByUrl(dest);
  }

  private onGoogleErr(err: any) {
    this.googleLoading = false;
    this.ui.err(err?.error?.message || 'No se pudo validar Google');
  }

  onLogout() {
    this.auth.logout().subscribe({
      next: () => {
        this.showProfileMenu = false;
        this.returnUrl.clear();
        this.ui.ok('Sesión cerrada');
        this.router.navigateByUrl('/');
      },
      error: (e) => console.error(e),
    });
  }
  logout() {
    this.auth.logout();
    this.showProfileMenu = false;
  }

  doSearch() {
    const q = this.search.trim();
    if (!q) {
      this.router.navigate(['/']);
      return;
    }
    this.router.navigate(['/'], { queryParams: { q } });
  }
}
