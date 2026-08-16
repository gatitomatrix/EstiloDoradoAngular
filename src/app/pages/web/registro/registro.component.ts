import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';
import { ReturnUrlService } from '../../../core/services/return-url.service';

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

  hide = true;
  submitting = false;
  formError = '';

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

  submit() {
    this.formError = '';
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.value;
    this.submitting = true;
    this.auth
      .register({
        nombre: v.nombre!.trim(),
        apellido: (v.apellido || '').trim(),
        telefono: v.telefono || '',
        direccion: v.direccion || '',
        email: v.email!,
        contrasena: v.password!,
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          const dest = this.returnUrl.consume('/');
          this.router.navigateByUrl(dest);
        },
        error: (e) => {
          this.submitting = false;
          const msg =
            e?.error?.message ||
            e?.error?.errors?.email?.[0] ||
            'No se pudo registrar. Revisa los datos o prueba otro correo.';
          this.formError = typeof msg === 'string' ? msg : 'Error al registrar';
        },
      });
  }

  goLogin(ev: Event) {
    ev.preventDefault();
    this.router.navigateByUrl('/').then(() => {
      window.dispatchEvent(new CustomEvent('ed-open-login'));
    });
  }
}
