import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';

@Component({
  selector: 'ed-web-recuperar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BarraSuperiorComponent, FranjaMarcaComponent],
  templateUrl: './recuperar.component.html',
  styleUrls: ['./recuperar.component.css']
})
export class RecuperarComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  get emailCtrl(): FormControl {
    return this.form.get('email') as FormControl;
  }

  ngOnInit() {
    const pre = this.route.snapshot.queryParamMap.get('email');
    if (pre) this.emailCtrl.setValue(pre);

    // si el usuario corrige el correo, limpiamos el error personalizado
    this.emailCtrl.valueChanges.subscribe(() => {
      if (this.emailCtrl.hasError('notfound')) {
        const e = { ...(this.emailCtrl.errors || {}) };
        delete e['notfound'];
        this.emailCtrl.setErrors(Object.keys(e).length ? e : null);
      }
    });
  }

  continuar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const email = (this.emailCtrl.value || '').trim();

    this.http.post(`${environment.apiBaseUrl}/auth/check-email`, { email })
      .subscribe({
        next: () => {
          // ok: correo existe -> vamos a Restablecer y mostramos el banner verde
          this.emailCtrl.setErrors(null);
          this.router.navigate(['/restablecer'], { queryParams: { email, from: 'check' } });
        },
        error: () => {
          // no existe -> pintamos error en rojo bajo el input
          this.emailCtrl.setErrors({ ...(this.emailCtrl.errors || {}), notfound: true });
        }
      });
  }

  // Link azul “Ya tengo el código…”
  toRestablecer() {
    const email = (this.emailCtrl.value || '').trim();
    this.router.navigate(['/restablecer'], { queryParams: email ? { email } : {} });
  }
}
