import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth/auth.service';
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ed-web-restablecer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BarraSuperiorComponent, FranjaMarcaComponent, RouterLink],
  templateUrl: './restablecer.component.html',
  styleUrls: ['./restablecer.component.css']
})
export class RestablecerComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  fromCheck = false;
  hide = true;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    code: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]+$/)]],
  });

  ngOnInit() {
    const q = this.route.snapshot.queryParamMap;
    const email = q.get('email'); this.fromCheck = q.get('from') === 'check';
    if (email) this.form.patchValue({ email });
  }

  // getters para pintar requisitos en verde
  get p() { return this.form.get('password')!; }
  get pass(): string { return this.p.value || ''; }
  get reqLen()     { return this.pass.length >= 8; }
  get reqLower()   { return /[a-z]/.test(this.pass); }
  get reqUpper()   { return /[A-Z]/.test(this.pass); }
  get reqNumber()  { return /\d/.test(this.pass); }
  get reqNoSpace() { return !/\s/.test(this.pass); }

  crear() {
    if (this.form.invalid) return;
    const v = this.form.value;
    if (v.code !== '102030') { this.form.get('code')?.setErrors({ invalid: true }); return; }

    this.http.post(`${environment.apiBaseUrl}/auth/password/reset-simple`, {
      email: v.email, contrasena: v.password
    }).subscribe({
      next: () => {
        // auto-login y a Home
        this.auth.login(v.email!, v.password!).subscribe({
          next: () => this.router.navigateByUrl('/'),
          error: () => this.router.navigateByUrl('/')
        });
      },
      error: (e) => console.error(e)
    });
  }
}
