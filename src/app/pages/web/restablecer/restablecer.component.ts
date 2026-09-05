import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth/auth.service';
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';

@Component({
  selector: 'ed-web-restablecer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BarraSuperiorComponent, FranjaMarcaComponent, RouterLink],
  templateUrl: './restablecer.component.html',
  styleUrls: ['./restablecer.component.css']
})
export class RestablecerComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  fromCheck = false;
  hide = true;
  submitting = false;
  err = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    password_confirmation: ['', [Validators.required]],
  });

  ngOnInit() {
    const q = this.route.snapshot.queryParamMap;
    const email = q.get('email');
    const codigo = q.get('codigo') || q.get('code') || q.get('token');
    this.fromCheck = !!email;
    if (email) this.form.patchValue({ email });
    if (codigo) this.form.patchValue({ codigo });
  }

  get p() { return this.form.get('password')!; }
  get pass(): string { return this.p.value || ''; }
  get reqLen()     { return this.pass.length >= 6; }
  get reqMatch()   { return !!this.pass && this.pass === this.form.get('password_confirmation')?.value; }

  crear() {
    this.err = '';
    if (this.form.invalid || !this.reqMatch) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    this.submitting = true;
    this.http.post(`${environment.apiBaseUrl}/auth/password/reset`, {
      email: v.email,
      codigo: v.codigo,
      password: v.password,
      password_confirmation: v.password_confirmation,
    }).subscribe({
      next: () => {
        this.auth.login(v.email!, v.password!).subscribe({
          next: () => this.router.navigateByUrl('/'),
          error: () => this.router.navigateByUrl('/registro')
        });
      },
      error: (e) => {
        this.submitting = false;
        this.err = e?.error?.message || 'No se pudo actualizar. Revisa el código o pide uno nuevo.';
      }
    });
  }
}
