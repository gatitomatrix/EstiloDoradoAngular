import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';

const NAME_RE = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+)*$/;
const NAME_OPT_RE = /^(?:[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+)*)?$/;
const PHONE_OPT_RE = /^(?:9\d{8})?$/;

@Component({
  selector: 'ed-web-mi-cuenta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BarraSuperiorComponent, FranjaMarcaComponent, RouterLink],
  templateUrl: './mi-cuenta.component.html',
  styleUrls: ['./mi-cuenta.component.css'],
})
export class MiCuentaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  public user$ = this.auth.user$;

  user = this.auth.user;
  edit = false;
  saveMsg = '';
  saveErr = '';
  passMsg = '';
  passErr = '';
  passBusy = false;

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.pattern(NAME_RE)]],
    apellido: ['', [Validators.pattern(NAME_OPT_RE)]],
    telefono: ['', [Validators.pattern(PHONE_OPT_RE)]],
    direccion: [''],
    email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
  });

  passForm = this.fb.group({
    actual: [''],
    nueva: [''],
    confirma: [''],
  });

  ngOnInit() {
    this.auth.me().subscribe({
      next: (u) => {
        this.user = u;
        this.resetForm();
      },
      error: () => {},
    });
  }

  onNameInput(ctrl: 'nombre' | 'apellido', ev: Event) {
    const el = ev.target as HTMLInputElement;
    const cleaned = el.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, '');
    if (cleaned !== el.value) {
      el.value = cleaned;
      this.form.get(ctrl)?.setValue(cleaned, { emitEvent: false });
    }
  }

  onPhoneInput(ev: Event) {
    const el = ev.target as HTMLInputElement;
    let d = el.value.replace(/\D/g, '');
    if (d.length > 9) d = d.slice(0, 9);
    if (d !== el.value) {
      el.value = d;
      this.form.get('telefono')?.setValue(d, { emitEvent: false });
    }
  }

  guardar() {
    this.saveMsg = '';
    this.saveErr = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.auth
      .updateMe({
        nombre: (v.nombre || '').trim(),
        apellido: (v.apellido || '').trim(),
        telefono: v.telefono || '',
        direccion: v.direccion || '',
      })
      .subscribe({
        next: (u) => {
          this.user = u;
          this.edit = false;
          this.saveMsg = 'Datos actualizados';
        },
        error: () => {
          this.saveErr = 'No se pudo guardar. Intenta de nuevo.';
        },
      });
  }

  cancelar() {
    this.edit = false;
    this.saveErr = '';
    this.resetForm();
  }

  logout() {
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: () => this.router.navigateByUrl('/'),
    });
  }

  private resetForm() {
    const u = this.user || this.auth.user;
    this.form.reset({
      nombre: u?.nombre || '',
      apellido: u?.apellido || '',
      telefono: u?.telefono || '',
      direccion: u?.direccion || '',
      email: u?.email || '',
    });
    this.form.get('email')?.disable();
  }

  cambiarClave() {
    this.passMsg = '';
    this.passErr = '';
    const actual = (this.passForm.get('actual')?.value || '').trim();
    const nueva = this.passForm.get('nueva')?.value || '';
    const conf = this.passForm.get('confirma')?.value || '';
    if (actual.length < 1 || nueva.length < 6) {
      this.passErr = 'La nueva clave debe tener al menos 6 caracteres.';
      return;
    }
    if (nueva !== conf) {
      this.passErr = 'La confirmación no coincide.';
      return;
    }
    this.passBusy = true;
    this.auth.updatePassword({
      password_actual: actual,
      password: nueva,
      password_confirmation: conf,
    }).subscribe({
      next: () => {
        this.passBusy = false;
        this.passMsg = 'Contraseña actualizada. Te enviamos un correo de aviso.';
        this.passForm.reset();
      },
      error: (e) => {
        this.passBusy = false;
        this.passErr = e?.error?.message || 'No se pudo cambiar. Si entraste con Google, usa “¿Olvidaste tu contraseña?”.';
      },
    });
  }
}

