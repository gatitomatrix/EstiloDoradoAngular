// src/app/features/admin/auth/admin-login.page.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { UiService } from '../../../core/services/ui.service';

// PrimeNG (para Toast/Confirm en login)
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

@Component({
  standalone: true,
  selector: 'app-admin-login',
  imports: [CommonModule, FormsModule, ToastModule, ConfirmDialogModule],
  providers: [MessageService, ConfirmationService], // 👈 evita NullInjector en UiService
  template: `
  <div class="container py-5" style="max-width:420px">
    <p-toast position="top-right"></p-toast>
    <p-confirmDialog></p-confirmDialog>

    <h2 class="mb-3">Panel de Administración</h2>

    <form (ngSubmit)="onSubmit()" novalidate>
      <div class="mb-3">
        <label class="form-label">Email</label>
        <input [(ngModel)]="email" name="email" type="email" class="form-control" required/>
      </div>

      <div class="mb-3">
        <label class="form-label">Contraseña</label>
        <input [(ngModel)]="password" name="password" type="password" class="form-control" required/>
      </div>

      <button class="btn btn-dark w-100" [disabled]="loading()">
        {{ loading() ? 'Ingresando…' : 'Ingresar' }}
      </button>

      <div class="text-danger mt-2" *ngIf="error()">{{ error() }}</div>
    </form>
  </div>
  `
})
export class AdminLoginPage {
  private auth = inject(AdminAuthService);
  private router = inject(Router);
  private ui = inject(UiService);

  email = '';
  password = '';
  loading = signal(false);
  error = signal<string | undefined>(undefined);

  onSubmit() {
    if (!this.email || !this.password) {
      this.error.set('Completa tus credenciales.');
      return;
    }
    this.loading.set(true);
    this.error.set(undefined);

    // 🔑 Flow recomendado: login → set token temporal → /me → persistir user+roles → navegar
    this.auth.loginAndBootstrap({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.ui.ok('Bienvenido');
        this.router.navigateByUrl('/admin'); // el shell redirige a /admin/dashboard
      },
      error: (err) => {
        this.loading.set(false);
        console.error('[LOGIN ERROR]', err);
        this.error.set('Credenciales inválidas o error de conexión.');
        this.ui.err('Credenciales inválidas');
      }
    });
  }
}
