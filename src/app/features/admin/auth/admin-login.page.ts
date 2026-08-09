// src/app/features/admin/auth/admin-login.page.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { UiService } from '../../../core/services/ui.service';

import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

@Component({
  standalone: true,
  selector: 'app-admin-login',
  imports: [CommonModule, FormsModule, ToastModule, ConfirmDialogModule],
  providers: [MessageService, ConfirmationService],
  template: `
  <div class="admin-login-page">
    <p-toast position="top-right"></p-toast>
    <p-confirmDialog></p-confirmDialog>

    <div class="admin-login-card">
      <div class="admin-login-brand">
        <img src="/images/logo_empresa.jpeg" alt="Estilo Dorado" />
        <h1>Estilo Dorado</h1>
        <p>Panel de administración</p>
      </div>

      <form (ngSubmit)="onSubmit()" novalidate>
        <div class="mb-3">
          <label class="form-label">Email de empleado</label>
          <input
            [(ngModel)]="email"
            name="email"
            type="email"
            class="form-control"
            placeholder="empleado@estilodorado.com"
            autocomplete="username"
            required
          />
        </div>

        <div class="mb-3">
          <label class="form-label">Contraseña</label>
          <input
            [(ngModel)]="password"
            name="password"
            type="password"
            class="form-control"
            placeholder="••••••••"
            autocomplete="current-password"
            required
          />
        </div>

        <button type="submit" class="admin-login-submit" [disabled]="loading()">
          {{ loading() ? 'Ingresando…' : 'Ingresar al panel' }}
        </button>

        <div class="admin-login-error" *ngIf="error()">{{ error() }}</div>
      </form>

      <div class="admin-login-foot">
        Acceso solo para personal autorizado
      </div>
    </div>
  </div>
  `,
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

    this.auth.loginAndBootstrap({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.ui.ok('Bienvenido');
        this.router.navigateByUrl('/admin');
      },
      error: (err) => {
        this.loading.set(false);
        console.error('[LOGIN ERROR]', err);
        this.error.set('Credenciales inválidas o error de conexión.');
        this.ui.err('Credenciales inválidas');
      },
    });
  }
}
