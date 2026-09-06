// src/app/features/admin/pedidos/pages/pedido-detail.page.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AdminPedidosService } from '../services/admin-pedidos.service';
import { TimelineModule } from 'primeng/timeline';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { PedidoCambiarEstadoWidget } from '../widgets/pedido-cambiar-estado.widget';
import { PedidoComprobantesWidget } from '../widgets/pedido-comprobantes.widget';

@Component({
  standalone: true,
  selector: 'app-pedido-detail',
  imports: [CommonModule, TimelineModule, CardModule, ButtonModule, PedidoCambiarEstadoWidget, PedidoComprobantesWidget],
  template: `
  <div class="p-3" *ngIf="pedido()">
    <div class="flex align-items-center justify-content-between mb-3">
      <h2 class="m-0">Pedido #{{pedido().id_pedido}}</h2>
      <div class="flex gap-2">
        <app-pedido-cambiar-estado [idPedido]="pedido().id_pedido" (changed)="reload()" *ngIf="canCambiarEstado"></app-pedido-cambiar-estado>
        <app-pedido-comprobantes [idPedido]="pedido().id_pedido" *ngIf="canVerComprobantes"></app-pedido-comprobantes>
      </div>
    </div>

    <div class="grid">
      <div class="col-12 md:col-8">
        <p-card header="Historial de estado">
          <p-timeline [value]="historial()" align="alternate" styleClass="customized-timeline">
            <ng-template pTemplate="content" let-e>
              <div class="mb-2"><strong>{{e.estado}}</strong></div>
              <div class="text-500 text-sm">{{e.comentario || '-'}}</div>
            </ng-template>
            <ng-template pTemplate="opposite" let-e>
              <span class="text-sm text-500">{{ e.fecha || (e.created_at | date:'short') }}</span>
            </ng-template>
            <ng-template pTemplate="marker" let-e>
              <span class="bg-primary border-circle" style="width:12px;height:12px;display:inline-block"></span>
            </ng-template>
          </p-timeline>
        </p-card>
      </div>
      <div class="col-12 md:col-4">
        <p-card header="Resumen">
          <div>Cliente: <strong>{{pedido().cliente?.nombre || pedido().cliente_nombre}}</strong></div>
          <div>Celular: <strong>{{pedido().telefono_contacto || pedido().cliente?.telefono || '—'}}</strong></div>
          <div>Estado: <strong>{{pedido().estado}}</strong></div>
          <div>Total: <strong>{{pedido().totales?.total ?? pedido().total | number:'1.2-2'}}</strong></div>
        </p-card>
      </div>
    </div>
  </div>
  `
})
export class PedidoDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(AdminPedidosService);

  id = 0;
  pedido = signal<any>(null);
  historial = signal<any[]>([]);

  roles = JSON.parse(localStorage.getItem('ed_admin_roles') || '[]');
  canCambiarEstado = this.roles.includes('ADMIN') || this.roles.includes('SOPORTE');
  canVerComprobantes = this.roles.includes('ADMIN') || this.roles.includes('SOPORTE') || this.roles.includes('VENTAS');

  ngOnInit(){
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.reload();
  }

  reload(){
    this.api.detail(this.id).subscribe(res => this.pedido.set(res?.data ?? res));
    this.api.historial(this.id).subscribe(res => this.historial.set(res?.data ?? res ?? []));
  }
}
