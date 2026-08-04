import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { HomeComponent } from './pages/web/home/home.component';
import { DetalleComponent } from './pages/web/detalle/detalle.component';
import { CarritoComponent } from './pages/web/carrito/carrito.component';
import { RegistroComponent } from './pages/web/registro/registro.component';
import { RecuperarComponent } from './pages/web/recuperar/recuperar.component';
import { MiCuentaComponent } from './pages/web/mi-cuenta/mi-cuenta.component';
import { RestablecerComponent } from './pages/web/restablecer/restablecer.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'producto/:id', component: DetalleComponent },
  { path: 'carrito', component: CarritoComponent },
  { path: 'registro', component: RegistroComponent },
  { path: 'recuperar', component: RecuperarComponent },
  { path: 'restablecer', component: RestablecerComponent },
  { path: 'mi-cuenta', component: MiCuentaComponent, canActivate: [authGuard] },
  {
    path: 'mis-compras',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/web/mis-compras/mis-compras.component').then(
        (c) => c.MisComprasComponent,
      ),
  },
  {
    path: 'entrega',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/web/entrega/entrega.component').then((m) => m.EntregaComponent),
  },
  {
    path: 'confirmar-entrega',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/web/confirmar-entrega/confirmar-entrega.component').then(
        (m) => m.ConfirmarEntregaComponent,
      ),
  },
  {
    path: 'pago',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/web/pago/pago.component').then((m) => m.PagoComponent),
  },
  {
    path: 'resumen/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/web/resumen-pedido/resumen-pedido.component').then(
        (m) => m.ResumenPedidoComponent,
      ),
  },

  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
