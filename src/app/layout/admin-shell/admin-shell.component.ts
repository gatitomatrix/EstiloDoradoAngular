// src/app/layout/admin-shell/admin-shell.component.ts
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { MenuItem, MessageService } from 'primeng/api';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { filter, Subscription } from 'rxjs';

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
          <button
            type="button"
            class="btn-logout"
            (click)="enableBrowserAlerts()"
            [title]="notifyOn() ? 'Avisos del navegador activos' : 'Activar avisos aunque la pestaña esté atrás'"
          >
            <i class="pi" [ngClass]="notifyOn() ? 'pi-bell' : 'pi-bell-slash'"></i>
            <span>{{ notifyOn() ? 'Avisos on' : 'Avisos' }}</span>
          </button>
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

    <p-toast position="top-right">
      <ng-template let-message pTemplate="message">
        <button type="button" class="ed-toast-hit" (click)="goPendientes(); $event.stopPropagation()">
          <strong>{{ message.summary }}</strong>
          <span>{{ message.detail }}</span>
          <em>Ver pedidos →</em>
        </button>
      </ng-template>
    </p-toast>
    <p-confirmDialog />
  </div>
  `,
  styles: [`
    .ed-toast-hit {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      width: 100%;
      border: 0;
      background: transparent;
      color: inherit;
      text-align: left;
      cursor: pointer;
      font: inherit;
      padding: 0;
    }
    .ed-toast-hit strong { font-size: 14px; }
    .ed-toast-hit span { font-size: 13px; opacity: .92; }
    .ed-toast-hit em { font-size: 12px; font-style: normal; font-weight: 700; color: #1B5E38; }
  `],
})
export class AdminShellComponent implements OnInit, OnDestroy {
  private auth = inject(AdminAuthService);
  private router = inject(Router);
  private realtime = inject(RealtimeService);
  private toast = inject(MessageService);
  private subs: Subscription[] = [];

  pageTitle = signal('Dashboard');
  notifyOn = signal(typeof Notification !== 'undefined' && Notification.permission === 'granted');
  pendingCount = signal(0);

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

  menu: MenuItem[] = [];

  ngOnInit() {
    this.rebuildMenu(0);
    this.updateTitle(this.router.url);
    this.subs.push(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((e) => this.updateTitle(e.urlAfterRedirects)),
    );

    if (!this.roles().length) {
      this.auth.me().subscribe({
        next: (res) => this.auth.persistLogin({ ...res, token: this.auth.getToken() }),
        error: () => {},
      });
    }

    this.realtime.start();
    this.subs.push(
      this.realtime.onPendientesCount().subscribe((n) => {
        this.pendingCount.set(n);
        this.rebuildMenu(n);
      }),
      this.realtime.onPedidoCreated().subscribe((p) => this.announcePedido(p)),
    );
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
    this.realtime.stop();
  }

  enableBrowserAlerts() {
    if (typeof Notification === 'undefined') return;
    Notification.requestPermission().then((perm) => {
      this.notifyOn.set(perm === 'granted');
    });
  }

  private lastToastEstado = 'pendiente';

  goPendientes() {
    this.router.navigate(['/admin/pedidos'], {
      queryParams: { estado: this.lastToastEstado || 'pendiente' },
    });
  }

  private announcePedido(p: { id_pedido?: number; total?: number; estado?: string; cliente_nombre?: string }) {
    const id = p?.id_pedido ?? '—';
    const total = Number(p?.total ?? 0).toFixed(2);
    const cli = (p?.cliente_nombre || 'Cliente').trim();
    const estado = p?.estado || 'pendiente';
    this.lastToastEstado = estado;
    this.toast.add({
      severity: estado === 'pendiente' ? 'warn' : 'success',
      summary: `Nuevo pedido #${id}`,
      detail: `${cli} · S/ ${total} · ${estado}. Clic para abrir pedidos.`,
      life: 9000,
    });
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(`Estilo Dorado · Pedido #${id}`, {
          body: `${cli} · S/ ${total} (${estado})`,
          icon: '/images/logo_empresa.jpeg',
        });
      } catch { /* ignore */ }
    }
  }

  private rebuildMenu(pending: number) {
    this.menu = [
      { label: 'Dashboard', icon: 'pi pi-home', routerLink: ['/admin/dashboard'] },
      {
        label: 'Ventas',
        icon: 'pi pi-shopping-cart',
        items: [
          {
            label: 'Pedidos',
            icon: 'pi pi-list',
            routerLink: ['/admin/pedidos'],
            badge: pending > 0 ? String(pending) : undefined,
            badgeStyleClass: 'p-badge-warn',
          },
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
    const key = seg[1] || 'dashboard';
    this.pageTitle.set(map[key] || 'Panel');
  }

  logout() {
    this.realtime.stop();
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/admin/login'),
      error: () => this.router.navigateByUrl('/admin/login'),
      complete: () => this.router.navigateByUrl('/admin/login'),
    });
  }
}
