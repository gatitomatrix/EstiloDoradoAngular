import { Component, inject, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';

import { CheckoutService } from '../../../services/checkout/checkout.service';
import { CartService } from '../../../services/cart/cart.service';
import { UbigeoService } from '../../../services/ubigeo/ubigeo.service';
import { BoletaData, InvoiceData, PaymentStateService, SavedCard } from '../../../core/state/payment-state.service';

import { AuthService } from '../../../services/auth/auth.service';
import { environment } from '../../../../environments/environment';
import { OrderService } from '../../../services/order/order.service';
import type { ConfirmarReq } from '../../../services/order/order.service';

declare const Culqi: any;
declare const bootstrap: any;

@Component({
  selector: 'ed-web-pago',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BarraSuperiorComponent, FranjaMarcaComponent],
  templateUrl: './pago.component.html',
  styleUrls: ['./pago.component.css']
})
export class PagoComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private http = inject(HttpClient);
  private checkout = inject(CheckoutService);
  cart = inject(CartService);
  pay = inject(PaymentStateService);
  ubigeo = inject(UbigeoService);
  auth = inject(AuthService);
  orderSrv = inject(OrderService);

  // Modal selector de comprobante
  @ViewChild('docModal') docModalRef!: ElementRef<HTMLDivElement>;
  private docModal?: any;

  // Selección explícita
  selectedDoc: 'FA' | 'BO' | null = null;
  private pendingCharge: { id: string; method: 'tarjeta' | 'yape' } | null = null;

  // Totales
  get subtotal() { return this.cart.getSubtotal(); }
  get discount() { return this.checkout.value.discount; }
  get fee() { return this.checkout.value.fee; }
  get total() { return this.subtotal + this.fee - this.discount; }

  // Modo entrega
  get mode() { return this.checkout.value.mode as 'STORE_PICKUP' | 'EXPRESS' | 'NONE'; }
  get canCash() { return this.mode === 'STORE_PICKUP'; }

  // Offcanvas visibles
  showCardDrawer: 'credito' | 'debito' | null = null;
  showFactura = false;
  showBoleta = false;

  // Ubigeo
  deps: string[] = [];
  provs: string[] = [];
  dists: string[] = [];

  // Forms
  cardForm: FormGroup = this.fb.group({
    numero: ['', [Validators.required, Validators.pattern(/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/)]],
    exp: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
    cvv: ['', [Validators.required, Validators.pattern(/^\d{3}$/)]],
    ver: [false]
  });

  yapeForm = this.fb.group({
    phone: ['+51 9', [Validators.required, Validators.pattern(/^\+51 9\d{8}$/)]],
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  facturaForm = this.fb.group({
    ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    razonSocial: ['', Validators.required],
    direccion: ['', Validators.required],
    departamento: ['', Validators.required],
    provincia: ['', Validators.required],
    distrito: ['', Validators.required],
  });

  boletaForm = this.fb.group({
    nombres: ['', [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+)*$/)]],
    dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    direccion: ['', Validators.required],
    departamento: ['', Validators.required],
    provincia: ['', Validators.required],
    distrito: ['', Validators.required],
  });

  ngOnInit() {
    if (!this.cart.items.length) {
      this.router.navigateByUrl('/carrito');
      return;
    }
    this.pay.setHasMethod(true);
    // limpiar selección de doc en esta pantalla
    this.pay.clearInvoice();
    this.pay.clearBoleta();
    this.selectedDoc = null;

    this.ubigeo.getDepartamentos().subscribe(d => this.deps = d);
    // Cascadas FACTURA
    this.facturaForm.get('departamento')!.valueChanges.subscribe(dep => {
      this.facturaForm.patchValue({ provincia: '', distrito: '' }, { emitEvent: false });
      this.provs = []; this.dists = [];
      if (dep) this.ubigeo.getProvincias(dep).subscribe(p => this.provs = p);
    });
    this.facturaForm.get('provincia')!.valueChanges.subscribe(prov => {
      this.facturaForm.patchValue({ distrito: '' }, { emitEvent: false });
      this.dists = [];
      const dep = this.facturaForm.value.departamento!;
      if (dep && prov) this.ubigeo.getDistritos(dep, prov).subscribe(d => this.dists = d);
    });
    // Cascadas BOLETA
    this.boletaForm.get('departamento')!.valueChanges.subscribe(dep => {
      this.boletaForm.patchValue({ provincia: '', distrito: '' }, { emitEvent: false });
      this.provs = []; this.dists = [];
      if (dep) this.ubigeo.getProvincias(dep).subscribe(p => this.provs = p);
    });
    this.boletaForm.get('provincia')!.valueChanges.subscribe(prov => {
      this.boletaForm.patchValue({ distrito: '' }, { emitEvent: false });
      this.dists = [];
      const dep = this.boletaForm.value.departamento!;
      if (dep && prov) this.ubigeo.getDistritos(dep, prov).subscribe(d => this.dists = d);
    });
  }

  ngAfterViewInit(): void {
    // Modal Bootstrap para el selector de comprobante
    if ((window as any).bootstrap && this.docModalRef) {
      this.docModal = new bootstrap.Modal(this.docModalRef.nativeElement, { backdrop: 'static', keyboard: false });
    }
    this.initCulqi();
  }

  private initCulqi() {
    const tryInit = () => {
      if (typeof (window as any).Culqi === 'undefined') return false;
      (window as any).Culqi.publicKey = environment.culqiPublicKey || 'pk_test_vJYOwLgj0Zghy6SF';
      // ÚNICO callback oficial
      (window as any).culqi = () => {
        const C = (window as any).Culqi;
        if (C?.token?.id) {
          // tarjeta: token -> tu backend
          this.postCulqiToken(C.token.id, C.token.email || (this.auth.user?.email ?? 'cliente@correo.com'));
          return;
        }
        if (C?.order?.id) {
          // yape: id de orden (si no requieres backend extra)
          this.onCulqiSuccess({ id: C.order.id as string, method: 'yape' });
          return;
        }
        if (C?.error) {
          alert(C.error.user_message || 'Pago cancelado.');
        }
      };
      return true;
    };
    if (tryInit()) return;
    const id = setInterval(() => { if (tryInit()) clearInterval(id); }, 300);
    setTimeout(() => clearInterval(id), 5000);
  }

  pagarConCulqi() {
    if (typeof (window as any).Culqi === 'undefined') {
      alert('No se cargó Culqi. Revisa que el script esté en index.html');
      return;
    }
    const userEmail = this.auth.user?.email || 'cliente@correo.com';
    Culqi.settings({
      title: 'Estilo Dorado',
      currency: 'PEN',
      description: 'Compra en Estilo Dorado',
      amount: Math.round(this.total * 100),
      email: userEmail
    });
    Culqi.open();
  }

  /** Pedido de prueba sin pasar por Culqi (demo académica / Render sin claves). */
  pagarDemoAcademico() {
    const ok = confirm(
      'Pago de demostración: no se cobra dinero real.\n\n¿Registrar el pedido como pagado (prueba)?'
    );
    if (!ok) return;
    this.onCulqiSuccess({
      id: 'tok_demo_' + Date.now(),
      method: 'tarjeta',
    });
  }

  private postCulqiToken(token: string, email: string) {
    this.http.post<{ success: boolean; message?: string }>(
      `${environment.apiBaseUrl}/pagar-con-culqi`,
      { token, monto: this.total, descripcion: 'Compra Estilo Dorado', correo: email }
    ).subscribe({
      next: (r) => {
        if (r.success) this.onCulqiSuccess({ id: token, method: 'tarjeta' });
        else alert('❌ Error procesando pago: ' + (r.message ?? 'intenta de nuevo'));
      },
      error: () => alert('❌ Error de pago. Revisa consola / Network.')
    });
  }

  // === Flujo con selector (CULQI) ===
  private openDocModal() { if (this.docModal) this.docModal.show(); }
  private closeDocModal() { if (this.docModal) this.docModal.hide(); }

  async onCulqiSuccess(payload: { id: string; method: 'tarjeta' | 'yape' }) {
    this.pendingCharge = payload;

    const factura = this.pay.currentInvoice();
    const boleta = this.pay.currentBoleta();

    // Si no hay datos, pedir selección
    if (!factura && !boleta) {
      this.selectedDoc = null;
      this.openDocModal();
      return;
    }

    // Si hay ambos y no hay selección explícita
    if (factura && boleta && !this.selectedDoc) {
      this.openDocModal();
      return;
    }

    const tipo: 'FA' | 'BO' = this.selectedDoc ?? (factura ? 'FA' : 'BO');
    this.finalizeOrder(tipo);
  }

  pickDoc(tipo: 'FA' | 'BO') {
    this.selectedDoc = tipo;

    const factura = this.pay.currentInvoice();
    const boleta = this.pay.currentBoleta();

    if (tipo === 'FA' && !factura) { this.closeDocModal(); this.openFactura(); return; }
    if (tipo === 'BO' && !boleta) { this.closeDocModal(); this.openBoleta(); return; }

    if (this.pendingCharge) {
      this.closeDocModal();
      this.finalizeOrder(tipo);
    }
  }

  /** CULQI: crea pedido en backend */
  private finalizeOrder(tipo: 'FA' | 'BO') {
    const payload = this.pendingCharge;
    if (!payload) { alert('Transacción no disponible. Intenta de nuevo.'); return; }

    const direccion = this.mode === 'STORE_PICKUP'
      ? 'Retiro en tienda -'
      : (this.checkout.value.address?.full ?? '');

    const items = this.cart.items.map(i => ({ id_producto: Number(i.id), cantidad: i.qty }));
    if (!items.length) { alert('Tu carrito está vacío.'); return; }

    const factura = this.pay.currentInvoice();
    const boleta = this.pay.currentBoleta();

    const body: ConfirmarReq = {
      forma_pago: payload.method,           // 'tarjeta' | 'yape'
      culqi_id: payload.id,
      direccion_entrega: direccion || null,
      items,
      comprobante: tipo,
      ...(tipo === 'FA' ? { factura: factura! } : { boleta: boleta! })
    };

    this.orderSrv.confirmar(body).subscribe({
      next: (res) => {
        this.cart.clear();
        this.pendingCharge = null;
        // cierra modal Culqi si siguiera abierto
        try { if ((window as any).Culqi?.close) (window as any).Culqi.close(); } catch {}
        this.router.navigate(['/resumen', res.id_pedido], {
          state: { comprobante: res.comprobante, ventaOk: true }
        });
      },
      error: () => alert('Pago OK, pero hubo un problema creando el pedido/boleta.')
    });
  }

  /** EFECTIVO (solo retiro en tienda) */
  pagarEnEfectivo() {
    if (!this.canCash) {
      alert('El pago en efectivo solo está disponible para Retiro en tienda.');
      return;
    }
    const direccion = 'Retiro en tienda -';
    const items = this.cart.items.map(i => ({ id_producto: Number(i.id), cantidad: i.qty }));
    if (!items.length) { alert('Tu carrito está vacío.'); return; }

    const body: ConfirmarReq = {
      forma_pago: 'efectivo',
      direccion_entrega: direccion,
      items
    };

    this.orderSrv.confirmar(body).subscribe({
      next: (res) => {
        this.cart.clear();
        this.router.navigate(['/resumen', res.id_pedido], { state: { ventaOk: true } });
      },
      error: (err) => {
        console.error('[EFECTIVO] error:', err);
        alert('No se pudo registrar tu pedido en efectivo.');
      }
    });
  }

  // ======= Timeline (navegación con restricciones) =======
  goToCart() { this.router.navigateByUrl('/carrito'); /* ajusta si tu ruta de carrito difiere */ }
  goToEntrega() { this.router.navigateByUrl('/entrega'); }

  // ======= UI helpers =======
  onCardInput(e: Event) {
    const el = e.target as HTMLInputElement;
    let v = el.value.replace(/\D/g, '').slice(0, 16);
    v = v.replace(/(\d{4})(?=\d)/g, '$1 ');
    this.cardForm.patchValue({ numero: v }, { emitEvent: false }); el.value = v;
  }
  onExpInput(e: Event) {
    const el = e.target as HTMLInputElement;
    let v = el.value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
    this.cardForm.patchValue({ exp: v }, { emitEvent: false }); el.value = v;
  }
  onCvvInput(e: Event) {
    const el = e.target as HTMLInputElement;
    const v = el.value.replace(/\D/g, '').slice(0, 3);
    this.cardForm.patchValue({ cvv: v }, { emitEvent: false }); el.value = v;
  }

  onYapePhone(e: Event) {
    const el = e.target as HTMLInputElement;
    const digits = el.value.replace(/[^\d]/g, '');
    const body = digits.replace(/^519?/, '');
    const v = '+51 9' + body.slice(0, 8);
    this.yapeForm.patchValue({ phone: v }, { emitEvent: false }); el.value = v;
  }
  onYapeCode(e: Event) {
    const el = e.target as HTMLInputElement;
    const v = el.value.replace(/[^\d]/g, '').slice(0, 6);
    this.yapeForm.patchValue({ code: v }, { emitEvent: false }); el.value = v;
  }

  onRucInput(e: Event) {
    const el = e.target as HTMLInputElement;
    const v = el.value.replace(/\D/g, '').slice(0, 11);
    this.facturaForm.patchValue({ ruc: v }, { emitEvent: false }); el.value = v;
  }
  onDniInput(e: Event) {
    const el = e.target as HTMLInputElement;
    const v = el.value.replace(/\D/g, '').slice(0, 8);
    this.boletaForm.patchValue({ dni: v }, { emitEvent: false }); el.value = v;
  }

  /** Solo letras y espacios (nombres de persona) */
  onPersonNameInput(e: Event) {
    const el = e.target as HTMLInputElement;
    const cleaned = el.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, '');
    el.value = cleaned;
    this.boletaForm.patchValue({ nombres: cleaned }, { emitEvent: false });
  }

  openCard(t: 'credito' | 'debito') { this.cardForm.reset({ ver: false }); this.showCardDrawer = t; }
  closeDrawers() { this.showCardDrawer = null; this.showFactura = false; this.showBoleta = false; }

  guardarFactura() {
    if (this.facturaForm.invalid) { this.facturaForm.markAllAsTouched(); return; }

    const hasBoleta = !!this.pay.currentBoleta();
    if (hasBoleta) {
      const ok = confirm('Ya tienes datos de BOLETA guardados. Solo puedes emitir un comprobante. ¿Reemplazar por FACTURA?');
      if (!ok) return;
      this.pay.clearBoleta();
    }

    this.pay.saveInvoice(this.facturaForm.value as InvoiceData);
    this.selectedDoc = 'FA';
    alert('Datos de facturación guardados');
    this.closeDrawers();

    if (this.pendingCharge) this.finalizeOrder('FA');
  }

  guardarBoleta() {
    if (this.boletaForm.invalid) { this.boletaForm.markAllAsTouched(); return; }

    const hasFactura = !!this.pay.currentInvoice();
    if (hasFactura) {
      const ok = confirm('Ya tienes datos de FACTURA guardados. Solo puedes emitir un comprobante. ¿Reemplazar por BOLETA?');
      if (!ok) return;
      this.pay.clearInvoice();
    }

    this.pay.saveBoleta(this.boletaForm.value as BoletaData);
    this.selectedDoc = 'BO';
    alert('Datos de boleta guardados');
    this.closeDrawers();

    if (this.pendingCharge) this.finalizeOrder('BO');
  }

  openFactura() {
    this.showBoleta = false;
    this.showCardDrawer = null;
    this.selectedDoc = 'FA';
    this.facturaForm.reset({
      ruc: '', razonSocial: '', direccion: '',
      departamento: '', provincia: '', distrito: ''
    });
    const inv = this.pay.currentInvoice();
    if (inv) {
      this.facturaForm.patchValue(inv, { emitEvent: false });
      this.ubigeo.getProvincias(inv.departamento).subscribe(p => {
        this.provs = p;
        this.ubigeo.getDistritos(inv.departamento, inv.provincia).subscribe(d => this.dists = d);
      });
    } else { this.provs = []; this.dists = []; }
    this.showFactura = true;
  }

  openBoleta() {
    this.showFactura = false;
    this.showCardDrawer = null;
    this.selectedDoc = 'BO';
    this.boletaForm.reset({
      nombres: '', dni: '', direccion: '',
      departamento: '', provincia: '', distrito: ''
    });
    const bol = this.pay.currentBoleta();
    if (bol) {
      this.boletaForm.patchValue(bol, { emitEvent: false });
      this.ubigeo.getProvincias(bol.departamento).subscribe(p => {
        this.provs = p;
        this.ubigeo.getDistritos(bol.departamento, bol.provincia).subscribe(d => this.dists = d);
      });
    } else { this.provs = []; this.dists = []; }
    this.showBoleta = true;
  }

  eliminarFactura() { if (confirm('¿Eliminar datos de facturación?')) { this.pay.clearInvoice(); if (this.selectedDoc === 'FA') this.selectedDoc = null; this.closeDrawers(); } }
  eliminarBoleta() { if (confirm('¿Eliminar datos de boleta?')) { this.pay.clearBoleta(); if (this.selectedDoc === 'BO') this.selectedDoc = null; this.closeDrawers(); } }

  addCard() {
    if (this.cardForm.invalid) { this.cardForm.markAllAsTouched(); return; }
    const numero = (this.cardForm.value.numero as string);
    const last4 = numero.replace(/\s/g, '').slice(-4);
    const card: SavedCard = { id: crypto.randomUUID(), type: this.showCardDrawer!, last4, brand: numero.startsWith('4') ? 'visa' : 'desconocida' };
    this.pay.addCard(card); this.closeDrawers();
  }
  removeCard(id: string) { this.pay.removeCard(id); }
}
