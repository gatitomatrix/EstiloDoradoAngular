import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';
import { ReturnUrlService } from '../../../core/services/return-url.service';
import { GoogleAuthService } from '../../../core/services/google-auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

/** Solo letras (incl. acentos) y espacios — nombres/apellidos */
const NAME_RE = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+)*$/;
/** Apellido opcional: vacío o solo letras */
const NAME_OPT_RE = /^(?:[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+)*)?$/;
/** Celular PE opcional: vacío o 9 dígitos empezando en 9 */
const PHONE_OPT_RE = /^(?:9\d{8})?$/;

@Component({
  selector: 'ed-web-registro',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BarraSuperiorComponent,
    FranjaMarcaComponent,
    RouterLink,
  ],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css'],
})
export class RegistroComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private returnUrl = inject(ReturnUrlService);
  private googleAuth = inject(GoogleAuthService);
  private http = inject(HttpClient);

  hide = true;
  submitting = false;
  googleLoading = false;
  formError = '';
  checkoutPending = false;
  get googleReady() {
    return this.googleAuth.configured;
  }

  constructor() {
    const dest = this.returnUrl.peek() || '';
    this.checkoutPending =
      dest.startsWith('/entrega') || dest.startsWith('/pago') || dest.startsWith('/carrito');
  }

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.pattern(NAME_RE)]],
    apellido: ['', [Validators.pattern(NAME_OPT_RE)]],
    telefono: ['', [Validators.pattern(PHONE_OPT_RE)]],
    direccion: [''],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]+$/),
      ],
    ],
  });

  get p() {
    return this.form.get('password')!;
  }
  toggle() {
    this.hide = !this.hide;
  }

  get pass(): string {
    return (this.form.get('password')?.value as string) || '';
  }

  get reqLen(): boolean {
    return this.pass.length >= 8;
  }
  get reqLower(): boolean {
    return /[a-z]/.test(this.pass);
  }
  get reqUpper(): boolean {
    return /[A-Z]/.test(this.pass);
  }
  get reqNumber(): boolean {
    return /\d/.test(this.pass);
  }
  get reqNoSpace(): boolean {
    return !/\s/.test(this.pass);
  }

  /** Bloquea dígitos y símbolos en nombre/apellido */
  onNameInput(ctrl: 'nombre' | 'apellido', ev: Event) {
    const el = ev.target as HTMLInputElement;
    const cleaned = el.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, '');
    if (cleaned !== el.value) {
      el.value = cleaned;
      this.form.get(ctrl)?.setValue(cleaned, { emitEvent: false });
    }
  }

  /** Solo dígitos, máx 9 */
  onPhoneInput(ev: Event) {
    const el = ev.target as HTMLInputElement;
    let d = el.value.replace(/\D/g, '');
    if (d.length > 9) d = d.slice(0, 9);
    if (d !== el.value) {
      el.value = d;
      this.form.get('telefono')?.setValue(d, { emitEvent: false });
    }
  }

  /** Autofill del navegador a veces pinta el input sin actualizar el FormControl. */
  syncFromDom(ctrl: string, ev: Event) {
    const el = ev.target as HTMLInputElement;
    const c = this.form.get(ctrl);
    if (!c) return;
    if ((c.value || '') !== (el.value || '')) {
      c.setValue(el.value, { emitEvent: true });
    }
    c.updateValueAndValidity({ emitEvent: false });
  }

  submit() {
    this.formError = '';
    ['email', 'nombre', 'apellido', 'telefono', 'direccion', 'password'].forEach((name) => {
      const el = document.querySelector(`.ed-form [formControlName="${name}"]`) as HTMLInputElement | null;
      if (el) this.syncFromDom(name, { target: el } as unknown as Event);
    });
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.formError = this.firstFormError();
      return;
    }
    const v = this.form.getRawValue();
    this.submitting = true;
    const pass = String(v.password || '');
    this.auth
      .register({
        nombre: String(v.nombre || '').trim(),
        apellido: String(v.apellido || '').trim(),
        telefono: String(v.telefono || '').trim(),
        direccion: String(v.direccion || '').trim(),
        email: String(v.email || '').trim(),
        contrasena: pass,
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigateByUrl(this.destinoTrasRegistro());
        },
        error: (e) => {
          this.submitting = false;
          const errs = e?.error?.errors || {};
          const firstField = Object.keys(errs).length ? String(errs[Object.keys(errs)[0]]?.[0] || '') : '';
          const msg =
            e?.error?.message ||
            firstField ||
            'No se pudo registrar. Revisa los datos o prueba otro correo.';
          this.formError = typeof msg === 'string' ? msg : 'Error al registrar';
        },
      });
  }

  private firstFormError(): string {
    if (this.form.get('email')?.invalid) return 'Ingresa un correo válido.';
    if (this.form.get('nombre')?.invalid) return 'El nombre solo admite letras (mín. 2).';
    if (this.form.get('apellido')?.invalid) return 'El apellido solo admite letras.';
    if (this.form.get('telefono')?.invalid) return 'Celular inválido: 9 dígitos empezando en 9, o déjalo vacío.';
    if (this.form.get('password')?.invalid) {
      return 'La contraseña no cumple: mínimo 8, mayúscula, minúscula, número y sin espacios.';
    }
    return 'Revisa los campos marcados.';
  }

  async registerGoogle() {
    this.formError = '';
    this.googleLoading = true;
    try {
      if (!this.googleAuth.configured) {
        this.googleLoading = false;
        this.formError = 'Falta googleClientId para crear cuenta con Gmail.';
        return;
      }
      const tokens = await this.googleAuth.signIn();
      this.http.post<any>(`${environment.apiBaseUrl}/auth/google`, tokens).subscribe({
        next: (res) => {
          this.googleLoading = false;
          if (!res?.token) {
            this.formError = res?.message || 'No se pudo crear la cuenta con Google';
            return;
          }
          this.auth.applyExternalLogin(res);
          this.router.navigateByUrl(this.destinoTrasRegistro());
        },
        error: (e) => {
          this.googleLoading = false;
          this.formError = e?.error?.message || 'Google no validó la cuenta';
        },
      });
    } catch (e: any) {
      this.googleLoading = false;
      this.formError = e?.message || 'No se abrió Google. Revisa internet y el Client ID.';
    }
  }

  goLogin(ev: Event) {
    ev.preventDefault();
    this.router.navigateByUrl('/').then(() => {
      window.dispatchEvent(new CustomEvent('ed-open-login'));
    });
  }

  /** Primera cuenta: tienda. Solo si venía del checkout se retoma la compra. */
  private destinoTrasRegistro(): string {
    const u = this.returnUrl.peek() || '';
    if (
      u.startsWith('/entrega') ||
      u.startsWith('/pago') ||
      u.startsWith('/carrito') ||
      u.startsWith('/confirmar-entrega')
    ) {
      return this.returnUrl.consume('/');
    }
    this.returnUrl.clear();
    return '/';
  }
}
