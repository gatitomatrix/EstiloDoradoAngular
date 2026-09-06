import { Component, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../../services/order/order.service';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { DIRECCION_TIENDA } from '../../../core/utils/tarifa-envio';
import Swal from 'sweetalert2';

declare const bootstrap: any;

@Component({
  selector: 'ed-web-resumen-pedido',
  standalone: true,
  imports: [CommonModule, FranjaMarcaComponent, BarraSuperiorComponent],
  templateUrl: './resumen-pedido.component.html',
  styleUrls: ['./resumen-pedido.component.css']
})
export class ResumenPedidoComponent implements AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private order = inject(OrderService);

  id!: number;
  data: any;
  files?: { xml?: string; cdr?: string; pdf?: string };
  readonly direccionTienda = DIRECCION_TIENDA;

  @ViewChild('okModal') okModalRef!: ElementRef<HTMLDivElement>;
  private okModal?: any;

  ngOnInit() {
    this.id = +(this.route.snapshot.paramMap.get('id') || 0);
    const st = history.state as any;
    if (st?.comprobante) this.files = st.comprobante;

    this.order.getById(this.id).subscribe({
      next: (res) => {
        this.data = res;
        // mostrar modal de éxito si venimos de pago
        const s = history.state as any;
        if (s?.ventaOk) this.showSuccess();
        history.replaceState({}, ''); // limpiar state
      },
      error: () => { this.router.navigateByUrl('/'); }
    });
  }

  ngAfterViewInit(): void {
    if ((window as any).bootstrap && this.okModalRef) {
      this.okModal = new bootstrap.Modal(this.okModalRef.nativeElement, { backdrop: 'static', keyboard: false });
    }
  }

  private showSuccess() {
    if (this.okModal) this.okModal.show();
    else {
      Swal.fire({ icon: 'success', title: '¡Venta exitosa!', text: 'Gracias por su compra.', confirmButtonColor: '#111827' });
    }
  }

  abrirArchivo(url: string | undefined, tipo: string) {
    if (!url) {
      Swal.fire({ icon: 'info', title: `${tipo} aún no disponible`,
        text: `El archivo ${tipo} todavía no ha sido generado. Intenta más tarde.`,
        confirmButtonColor: '#d4af37' });
      return;
    }
    fetch(url, { method: 'GET', mode: 'cors' }).then(async res => {
      if (!res.ok) {
        Swal.fire({ icon: 'warning', title: `${tipo} no encontrado`,
          text: `El archivo ${tipo} aún no está disponible o fue eliminado.`,
          confirmButtonColor: '#d4af37' });
        return;
      }
      const blob = await res.blob();
      const u = URL.createObjectURL(blob);
      window.open(u, '_blank');
    }).catch(() => {
      Swal.fire({ icon: 'error', title: 'Error de conexión',
        text: `No se pudo conectar para descargar el archivo ${tipo}.`,
        confirmButtonColor: '#d4af37' });
    });
  }

  seguirComprando() { this.router.navigateByUrl('/'); }
}
