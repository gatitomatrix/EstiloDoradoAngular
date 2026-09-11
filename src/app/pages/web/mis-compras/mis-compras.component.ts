import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth/auth.service';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { OrderService, PedidoListItem } from '../../../services/order/order.service';
import { formatFechaHoraPe } from '../../../core/utils/fecha-pe';
import Swal from 'sweetalert2';

@Component({
  selector: 'ed-web-mis-compras',
  standalone: true,
  imports: [CommonModule, BarraSuperiorComponent, FranjaMarcaComponent, FormsModule, RouterLink],
  templateUrl: './mis-compras.component.html',
  styleUrls: ['./mis-compras.component.css']
})
export class MisComprasComponent implements OnInit {
  // Pedidos del cliente. PDF de boleta/factura si pagó Culqi. Recojo efectivo = pendiente.
  private auth = inject(AuthService);
  private order = inject(OrderService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = true;
  error: string | null = null;
  cancellingId: number | null = null;

  data: PedidoListItem[] = [];
  highlightId: number | null = null;

  filtroId?: number;
  rango: 'last' | '3m' | '1y' = '1y'; // por defecto

  ngOnInit(): void {
    if (!this.auth.isLoggedIn) {
      this.error = 'Debes iniciar sesión para ver tus pedidos.';
      this.loading = false;
      return;
    }

    this.cargar();
    const q = Number(this.route.snapshot.queryParamMap.get('pedido'));
    if (q > 0) {
      this.filtroId = q;
      this.highlightId = q;
    }
  }

  private cargar(silent = false): void {
    if (!silent) {
      this.loading = true;
      this.error = null;
    }
    this.order.listMine().subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
      },
      error: () => { this.error = 'No se pudieron cargar tus pedidos.'; this.loading = false; }
    });
  }

  limpiar(): void {
    this.filtroId = undefined;
    this.rango = '1y';
    this.highlightId = null;
  }

  puedeCancelar(p: PedidoListItem): boolean {
    return (p.estado || '').toLowerCase() === 'pendiente';
  }

  async cancelar(p: PedidoListItem): Promise<void> {
    if (!this.puedeCancelar(p) || this.cancellingId) return;

    const ok = await Swal.fire({
      icon: 'question',
      title: 'Cancelar pedido',
      text: `¿Cancelar el pedido #${p.id_pedido}?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No',
      confirmButtonColor: '#b91c1c',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });
    if (!ok.isConfirmed) return;

    this.cancellingId = p.id_pedido;
    this.order.cancelar(p.id_pedido, 'Cancelado por el cliente').subscribe({
      next: () => {
        this.cancellingId = null;
        this.data = this.data.map((x) =>
          x.id_pedido === p.id_pedido ? { ...x, estado: 'cancelado' } : x
        );
        Swal.fire({
          icon: 'success',
          title: 'Pedido cancelado',
          text: `El pedido #${p.id_pedido} se canceló y el stock volvió al inventario.`,
          confirmButtonColor: '#d4af37',
        });
        this.cargar(true);
      },
      error: (err: HttpErrorResponse) => {
        this.cancellingId = null;
        const msg = err?.error?.message || 'No se pudo cancelar el pedido.';
        Swal.fire({
          icon: 'error',
          title: 'No se pudo cancelar',
          text: msg,
          confirmButtonColor: '#b91c1c',
        });
      }
    });
  }

  get filtered(): PedidoListItem[] {
    let arr = [...this.data];

    if (this.filtroId) {
      arr = arr.filter(p => p.id_pedido === this.filtroId);
    }

    const now = new Date();
    if (this.rango === 'last') {
      arr = arr.slice(0, 1);
    } else {
      const months = this.rango === '3m' ? 3 : 12;
      const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
      arr = arr.filter(p => {
        const d = new Date(p.fecha_pedido);
        return !isNaN(d.getTime()) && d >= cutoff;
      });
    }

    return arr;
    }

  verResumen(p: PedidoListItem) {
    this.router.navigate(['/resumen', p.id_pedido]);
  }

  fmtFechaHora(raw?: string | null) {
    return formatFechaHoraPe(raw);
  }
}
