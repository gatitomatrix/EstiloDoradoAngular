import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth/auth.service';
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';

@Component({
  selector: 'ed-web-mi-cuenta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BarraSuperiorComponent, FranjaMarcaComponent],
  templateUrl: './mi-cuenta.component.html',
  styleUrls: ['./mi-cuenta.component.css']
})
export class MiCuentaComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  public user$ = this.auth.user$; 

  // Simulamos datos del usuario logueado; al conectar backend, precarga con tu API
  user = this.auth.user;

  edit = false;

  form = this.fb.group({
    nombre: ['', Validators.required],
    apellido: [''],
    telefono: [''],
    direccion: [''],
    email: [{ value: '', disabled: true }, [Validators.required, Validators.email]]
  });

  ngOnInit() {
    // trae datos frescos del backend
    this.auth.me().subscribe({
      next: (u) => {
        this.form.patchValue({
          nombre: u.nombre || '',
          apellido: u.apellido || '',
          telefono: u.telefono || '',
          direccion: u.direccion || '',
          email: u.email || ''
        });
        this.form.get('email')?.disable();
      }
    });
  }
  guardar() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue(); // email sigue deshabilitado
    this.auth.updateMe({
      nombre: v.nombre!, apellido: v.apellido || '',
      telefono: v.telefono || '', direccion: v.direccion || ''
    }).subscribe({
      next: () => { this.edit = false; },
      error: (e) => console.error(e)
    });
  }

  cancelar() {
    this.edit = false;
    // recarga desde el servicio (user guardado) para resetear
    const u = this.auth.user;
    this.form.reset({
      nombre: u?.nombre || '', apellido: u?.apellido || '',
      telefono: u?.telefono || '', direccion: u?.direccion || '',
      email: u?.email || ''
    });
    this.form.get('email')?.disable();
  }

  constructor() {
    // Si entras directo con token, asegura datos frescos
    if (!this.user) this.auth.me().subscribe(u => { this.user = u; this.resetForm(); });
  }

  logout() {
    this.auth.logout().subscribe(() => {
      // redirige y/o muestra toast
    });
  }

  private resetForm() {
    this.form.reset({
      nombre: this.user?.nombre || '',
      apellido: this.user?.apellido || '',
      telefono: this.user?.telefono || '',
      direccion: this.user?.direccion || '',
      email: this.user?.email || ''
    });
    this.form.get('email')?.disable();
  }
}
