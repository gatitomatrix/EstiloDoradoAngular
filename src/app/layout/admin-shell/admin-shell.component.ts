// src/app/layout/admin-shell/admin-shell.component.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { MenuItem } from 'primeng/api';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { filter } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-admin-shell',
  imports: [
    CommonModule,
    RouterOutlet,
    PanelMenuModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  template: `
  <div class="app-shell admin-gold-theme">
    <aside class="app-aside sidebar">
      <div class="sidebar-brand">
        <img src="/images/logo_empresa.jpeg" alt="Estilo Dorado" class="sidebar-logo" />
        <div>
          <div class="sidebar-title">Estilo Dorado</div>
          <div class="sidebar-subtitle">Panel de administración</div>
        </div>
      </div>

      <p-panelMenu [model]="menu" [multiple]="true" styleClass="admin-panel-menu"></p-panelMenu>

      <div class="sidebar-footer">
        <span class="sidebar-footer-hint">Gestión de tienda</span>
      </div>
    </aside>

    <section class="main-area">
      <header class="topbar">
        <div class="topbar-left">
          <div class="topbar-kicker">{{ pageTitle() }}</div>
          <div class="topbar-welcome">
            Hola, <strong>{{ displayName() }}</strong>
          </div>
        </div>
        <div class="topbar-right">
          <span class="role-chip" *ngIf="rolesJoined()" title="Roles del empleado">
            <i class="pi pi-shield"></i>
            {{ rolesJoined() }}
          </span>
          <button type="button" class="btn-logout" (click)="logout()" title="Cerrar sesión">
            <i class="pi pi-sign-out"></i>
            <span>Salir</span>
          </button>
        </div>
      </header>
      <div class="content">
        <router-outlet />
      </div>
    </section>

    <p-toast position="top-right"></p-toast>
    <p-confirmDialog />
  </div>
  `,
})
export class AdminShellComponent implements OnInit {
  private auth = inject(AdminAuthService);
  private router = inject(Router);

  pageTitle = signal('Dashboard');

  roles = computed<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('ed_admin_roles') || '[]');
    } catch {
      return [];
    }
  });
  rolesJoined = () => this.roles().join(', ');

  displayName = () => {
    try {
      const raw = sessionStorage.getItem('ed_admin_user');
      if (!raw) return 'Administrador';
      const u = JSON.parse(raw);
      const n = [u?.nombre, u?.apellido].filter(Boolean).join(' ').trim();
      return n || u?.email || 'Administrador';
    } catch {
      return 'Administrador';
    }
  };

  menu: MenuItem[] = [
    { label: 'Dashboard', icon: 'pi pi-home', routerLink: ['/admin/dashboard'] },
    {
      label: 'Ventas',
      icon: 'pi pi-shopping-cart',
      items: [
        { label: 'Pedidos', icon: 'pi pi-list', routerLink: ['/admin/pedidos'] },
        { label: 'Inventario', icon: 'pi pi-box', routerLink: ['/admin/inventario'] },
      ],
    },
    {
      label: 'Catálogo',
      icon: 'pi pi-database',
      items: [
        { label: 'Productos', icon: 'pi pi-tags', routerLink: ['/admin/productos'] },
        { label: 'Categorías', icon: 'pi pi-sitemap', routerLink: ['/admin/categorias'] },
        { label: 'Proveedores', icon: 'pi pi-truck', routerLink: ['/admin/proveedores'] },
      ],
    },
    { label: 'Clientes', icon: 'pi pi-users', routerLink: ['/admin/clientes'] },
    { label: 'Reportes', icon: 'pi pi-chart-bar', routerLink: ['/admin/reportes'] },
  ];

  ngOnInit() {
    this.updateTitle(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updateTitle(e.urlAfterRedirects));

    if (!this.roles().length) {
      this.auth.me().subscribe({
        next: (res) => this.auth.persistLogin({ ...res, token: this.auth.getToken() }),
        error: () => {},
      });
    }
  }

  private updateTitle(url: string) {
    const map: Record<string, string> = {
      dashboard: 'Dashboard',
      pedidos: 'Pedidos',
      inventario: 'Inventario',
      productos: 'Productos',
      categorias: 'Categorías',
      proveedores: 'Proveedores',
      clientes: 'Clientes',
      reportes: 'Reportes',
      auditoria: 'Auditoría',
    };
    const seg = url.split('/').filter(Boolean);
    // /admin/xxx
    const key = seg[1] || 'dashboard';
    this.pageTitle.set(map[key] || 'Panel');
  }

  logout() {
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/admin/login'),
      error: () => this.router.navigateByUrl('/admin/login'),
      complete: () => this.router.navigateByUrl('/admin/login'),
    });
  }
}
