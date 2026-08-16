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

declare const google: any;

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

  search = '';
  totalQty = 0;
  user: AuthUser | null = null;
  showProfileMenu = false;
  showLogin = false;
  submitting = false;
  googleLoading = false;
  hideLoginPassword = true;
  loginError = '';
  googleClientId = (environment as any).googleClientId || '';

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

  /** Login Google: GIS si hay clientId; si no, demo local (solo desarrollo). */
  loginWithGoogle() {
    if (this.googleClientId) {
      this.googleLoading = true;
      this.loadGis().then(() => {
        try {
          google.accounts.id.initialize({
            client_id: this.googleClientId,
            callback: (resp: any) => this.handleGoogleCredential(resp?.credential),
          });
          google.accounts.id.prompt((notification: any) => {
            if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
              // Fallback: botón one-tap no disponible → usar token demo si backend lo permite
              this.googleLoading = false;
              this.ui.warn('No se pudo abrir Google. Usa el botón de correo o revisa el Client ID.');
            }
          });
        } catch (e) {
          console.error(e);
          this.googleLoading = false;
          this.ui.err('Error al iniciar Google Sign-In');
        }
      });
      return;
    }

    // Demo local sin Client ID de Google (solo para pruebas en casa)
    this.googleLoading = true;
    this.http
      .post<any>(`${environment.apiBaseUrl}/auth/google`, {
        demo: true,
        email: 'demo.google@estilodorado.local',
        nombre: 'Cliente',
        apellido: 'Google Demo',
      })
      .subscribe({
        next: (res) => {
          this.googleLoading = false;
          if (res?.token) {
            this.auth.applyExternalLogin(res);
            this.closeLogin();
            this.ui.ok('Entraste con Google (demo local)');
            const dest = this.returnUrl.consume('/');
            this.router.navigateByUrl(dest);
          } else {
            this.ui.err(res?.message || 'No se pudo iniciar con Google demo');
          }
        },
        error: (err) => {
          this.googleLoading = false;
          this.ui.err(
            err?.error?.message ||
              'Google demo no disponible. Revisa Laravel (auth/google) y .env',
          );
        },
      });
  }

  private handleGoogleCredential(idToken: string) {
    if (!idToken) {
      this.googleLoading = false;
      return;
    }
    this.http.post<any>(`${environment.apiBaseUrl}/auth/google`, { id_token: idToken }).subscribe({
      next: (res) => {
        this.googleLoading = false;
        if (res?.token) {
          this.auth.applyExternalLogin(res);
          this.closeLogin();
          this.ui.ok('Sesión con Google iniciada');
          const dest = this.returnUrl.consume('/');
          this.router.navigateByUrl(dest);
        }
      },
      error: (err) => {
        this.googleLoading = false;
        this.ui.err(err?.error?.message || 'No se pudo validar Google');
      },
    });
  }

  private loadGis(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google?.accounts?.id) {
        resolve();
        return;
      }
      const existing = document.getElementById('gis-script');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        return;
      }
      const s = document.createElement('script');
      s.id = 'gis-script';
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject();
      document.head.appendChild(s);
    });
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
