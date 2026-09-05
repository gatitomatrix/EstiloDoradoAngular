import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormControl } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';

@Component({
  selector: 'ed-web-recuperar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, BarraSuperiorComponent, FranjaMarcaComponent],
  templateUrl: './recuperar.component.html',
  styleUrls: ['./recuperar.component.css']
})
export class RecuperarComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  sending = false;
  sent = false;
  err = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  get emailCtrl(): FormControl {
    return this.form.get('email') as FormControl;
  }

  ngOnInit() {
    const pre = this.route.snapshot.queryParamMap.get('email');
    if (pre) this.emailCtrl.setValue(pre);
  }

  continuar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const email = (this.emailCtrl.value || '').trim();
    this.sending = true;
    this.err = '';
    this.http.post(`${environment.apiBaseUrl}/auth/password/forgot`, { email })
      .subscribe({
        next: () => {
          this.sending = false;
          this.sent = true;
          this.router.navigate(['/restablecer'], { queryParams: { email } });
        },
        error: () => {
          this.sending = false;
          this.err = 'No se pudo enviar el correo. Intenta de nuevo.';
        }
      });
  }
}
