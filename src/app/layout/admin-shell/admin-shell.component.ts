// src/app/layout/admin-shell/admin-shell.component.ts
import { Component, OnInit, OnDestroy, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { MenubarModule } from 'primeng/menubar';
import { MenuItem } from 'primeng/api';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  standalone: true,
  selector: 'app-admin-shell',
  imports: [RouterOutlet, PanelMenuModule, MenubarModule, ToastModule, ConfirmDialogModule],
  template: `
  <div class="app-shell admin-gold-theme">
    <aside class="app-aside sidebar">
      <div class="sidebar-title">Panel</div>
      <p-panelMenu [model]="menu" [multiple]="true" [style]="{border:'none'}"></p-panelMenu>
    </aside>

    <section>
      <header class="topbar">
        <div class="font-medium">Bienvenido</div>
        <div class="flex align-items-center gap-2">
          <span class="text-sm text-500">Roles: {{ rolesJoined() }}</span>
          <button class="p-button p-button-text" (click)="logout()">
            <i class="pi pi-sign-out mr-2"></i>Salir
          </button>
        </div>
      </header>
      <div class="content">
        <router-outlet />
      </div>
    </section>

    <!-- Toast/Confirm solo del admin -->
    <p-toast position="top-right"></p-toast>
    <p-confirmDialog />
  </div>
  `
})
export class AdminShellComponent {
  private auth = inject(AdminAuthService);
  private router = inject(Router);

  roles = computed<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('ed_admin_roles') || '[]'); } catch { return []; }
  });
  rolesJoined = () => this.roles().join(', ');

  menu: MenuItem[] = [
    { label: 'Dashboard', icon: 'pi pi-home', routerLink: ['/admin/dashboard'] },
    {
      label: 'Ventas', icon: 'pi pi-shopping-cart', items: [
        { label: 'Pedidos', icon: 'pi pi-list', routerLink: ['/admin/pedidos'] },
        { label: 'Inventario', icon: 'pi pi-box', routerLink: ['/admin/inventario'] },
      ]
    },
    {
      label: 'Catálogo', icon: 'pi pi-database', items: [
        { label: 'Productos', icon: 'pi pi-tags', routerLink: ['/admin/productos'] },
        { label: 'Categorías', icon: 'pi pi-sitemap', routerLink: ['/admin/categorias'] },
        { label: 'Proveedores', icon: 'pi pi-truck', routerLink: ['/admin/proveedores'] },
      ]
    },
    { label: 'Clientes', icon: 'pi pi-users', routerLink: ['/admin/clientes'] },
    { label: 'Reportes', icon: 'pi pi-chart-bar', routerLink: ['/admin/reportes'] },
  ];

  ngOnInit() {
    // opcional: si no hay roles aún, refresca desde /me
    if (!this.roles().length) {
      this.auth.me().subscribe({
        next: (res) => this.auth.persistLogin({ ...res, token: this.auth.getToken() }),
        error: () => { }
      });
    }
  }

  logout() {
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/admin/login'),
      error: () => this.router.navigateByUrl('/admin/login'),
      complete: () => this.router.navigateByUrl('/admin/login')
    });
  }
}
