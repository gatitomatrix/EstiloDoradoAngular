// src/app/features/admin/admin.routes.ts
import { Routes } from '@angular/router';
import { adminAuthGuard } from '../../core/guards/admin-auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { redirectIfLoggedGuard } from '../../core/guards/redirect-if-logged.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    canActivate: [redirectIfLoggedGuard],
    loadComponent: () => import('./auth/admin-login.page').then(m => m.AdminLoginPage)
  },
  {
    path: '',
    canMatch: [adminAuthGuard],
    loadComponent: () => import('../../layout/admin-shell/admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      {
        path: 'dashboard',
        canActivate: [roleGuard], data: { roles: ['ADMIN','SOPORTE','VENTAS','STOCK'] },
        loadComponent: () => import('./dashboard/pages/admin-dashboard.page').then(m => m.AdminDashboardPage)
      },

      {
        path: 'productos',
        canActivate: [roleGuard], data: { roles: ['ADMIN','SOPORTE','VENTAS','STOCK'] },
        loadComponent: () => import('./productos/pages/productos-list.page').then(m => m.ProductosListPage)
      },
      {
        path: 'productos/:id',
        canActivate: [roleGuard], data: { roles: ['ADMIN','SOPORTE','VENTAS','STOCK'] },
        loadComponent: () => import('./productos/pages/producto-detail.page').then(m => m.ProductoDetailPage)
      },

      {
        path: 'categorias',
        canActivate: [roleGuard], data: { roles: ['ADMIN','SOPORTE','VENTAS','STOCK'] },
        loadComponent: () => import('./categorias/pages/categorias-list.page').then(m => m.CategoriasListPage)
      },

      {
        path: 'proveedores',
        canActivate: [roleGuard], data: { roles: ['ADMIN','SOPORTE'] },
        loadComponent: () => import('./proveedores/pages/proveedores-list.page').then(m => m.ProveedoresListPage)
      },

      {
        path: 'pedidos',
        canActivate: [roleGuard], data: { roles: ['ADMIN','SOPORTE','VENTAS','STOCK'] },
        loadComponent: () => import('./pedidos/pages/pedidos-list.page').then(m => m.PedidosListPage)
      },
      {
        path: 'pedidos/:id',
        canActivate: [roleGuard], data: { roles: ['ADMIN','SOPORTE','VENTAS','STOCK'] },
        loadComponent: () => import('./pedidos/pages/pedido-detail.page').then(m => m.PedidoDetailPage)
      },
      {
        path: 'pedidos/:id/estado-historial',
        canActivate: [roleGuard], data: { roles: ['ADMIN','SOPORTE','VENTAS','STOCK'] },
        loadComponent: () => import('./pedidos/pages/pedido-historial.page').then(m => m.PedidoHistorialPage)
      },

      {
        path: 'inventario',
        canActivate: [roleGuard], data: { roles: ['ADMIN','SOPORTE','VENTAS','STOCK'] },
        loadComponent: () => import('./inventario/pages/inventario-list.page').then(m => m.InventarioListPage)
      },
      {
        path: 'inventario/entrada',
        canActivate: [roleGuard], data: { roles: ['ADMIN','STOCK'] },
        loadComponent: () => import('./inventario/pages/inventario-entrada.page').then(m => m.InventarioEntradaPage)
      },
      {
        path: 'inventario/salida',
        canActivate: [roleGuard], data: { roles: ['ADMIN','STOCK'] },
        loadComponent: () => import('./inventario/pages/inventario-salida.page').then(m => m.InventarioSalidaPage)
      },
      {
        path: 'inventario/ajuste',
        canActivate: [roleGuard], data: { roles: ['ADMIN','STOCK'] },
        loadComponent: () => import('./inventario/pages/inventario-ajuste.page').then(m => m.InventarioAjustePage)
      },

      {
        path: 'clientes',
        canActivate: [roleGuard], data: { roles: ['ADMIN'] },
        loadComponent: () => import('./clientes/pages/clientes-list.page').then(m => m.ClientesListPage)
      },
      {
        path: 'clientes/:id',
        canActivate: [roleGuard], data: { roles: ['ADMIN'] },
        loadComponent: () => import('./clientes/pages/cliente-detail.page').then(m => m.ClienteDetailPage)
      },

      {
        path: 'reportes',
        canActivate: [roleGuard], data: { roles: ['ADMIN'] },
        loadComponent: () => import('./reportes/pages/reportes.page').then(m => m.ReportesPage)
      },
      {
        path: 'consultas-dori',
        canActivate: [roleGuard], data: { roles: ['ADMIN'] },
        loadComponent: () => import('./asistente/pages/asistente-logs.page').then(m => m.AsistenteLogsPage)
      },

      {
        path: 'auditoria',
        canActivate: [roleGuard], data: { roles: ['ADMIN'] },
        loadComponent: () => import('./auditoria/pages/auditoria-list.page').then(m => m.AuditoriaListPage)
      },
    ]
  }
];
