import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth/auth.service';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { OrderService, PedidoListItem } from '../../../services/order/order.service';

@Component({
  selector: 'ed-web-mis-compras',
  standalone: true,
  imports: [CommonModule, BarraSuperiorComponent, FranjaMarcaComponent, FormsModule, RouterLink],
  templateUrl: './mis-compras.component.html',
  styleUrls: ['./mis-compras.component.css']
})
export class MisComprasComponent implements OnInit {
  private auth = inject(AuthService);
  private order = inject(OrderService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = true;
  error: string | null = null;

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

    this.order.listMine().subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        const q = Number(this.route.snapshot.queryParamMap.get('pedido'));
        if (q > 0) {
          this.filtroId = q;
          this.highlightId = q;
        }
      },
      error: () => { this.error = 'No se pudieron cargar tus pedidos.'; this.loading = false; }
    });
  }

  limpiar(): void {
    this.filtroId = undefined;
    this.rango = '1y';
    this.highlightId = null;
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
    if (!raw) return '—';
    const s = String(raw).trim();
    let iso = s;
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
      iso = s.replace(' ', 'T') + '-05:00';
    }
    const d = new Date(iso);
    if (isNaN(d.getTime())) return s;
    const parts = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(d);
    const g = (t: string) => parts.find(p => p.type === t)?.value || '';
    return `${g('day')}/${g('month')}/${g('year')} ${g('hour')}:${g('minute')}`;
  }
}
