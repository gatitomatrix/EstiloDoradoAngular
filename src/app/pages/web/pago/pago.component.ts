import { Component, inject, AfterViewInit, ElementRef, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';

import { CheckoutService } from '../../../services/checkout/checkout.service';
import { CartService } from '../../../services/cart/cart.service';
import { TEXTO_RECOJO, DIRECCION_TIENDA } from '../../../core/utils/tarifa-envio';
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
  imports: [CommonModule, ReactiveFormsModule, FormsModule, BarraSuperiorComponent, FranjaMarcaComponent],
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
  private zone = inject(NgZone);
  procesandoPago = false;
  otroCorreo = false;
  correoPago = '';
  rucEstado = '';
  private rucTimer: ReturnType<typeof setTimeout> | null = null;

  get correoCuenta(): string {
    return (this.auth.user?.email || '').trim();
  }

  get correoCulqi(): string {
    return this.otroCorreo ? this.correoPago.trim() : this.correoCuenta;
  }

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
  readonly direccionTienda = DIRECCION_TIENDA;

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
    if (this.mode === 'STORE_PICKUP' || this.checkout.envioListo(this.checkout.value.address)) {
      // ok
    } else {
      this.router.navigate(['/entrega'], { state: { openAddress: true } });
      return;
    }
    this.pay.setHasMethod(true);
    this.correoPago = this.correoCuenta;
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
      (window as any).culqi = () => {
        this.zone.run(() => this.handleCulqiResult());
      };
      return true;
    };
    if (tryInit()) return;
    const id = setInterval(() => { if (tryInit()) clearInterval(id); }, 300);
    setTimeout(() => clearInterval(id), 8000);
  }

  private handleCulqiResult() {
    this.handleCulqiFrom((window as any).Culqi);
  }

  private handleCulqiFrom(C: any) {
    try { C?.close?.(); } catch {}
    if (C?.token?.id) {
      this.procesandoPago = true;
      this.postCulqiToken(C.token.id, C.token.email || this.correoCulqi || (this.auth.user?.email ?? 'cliente@correo.com'));
      return;
    }
    if (C?.order?.id) {
      this.onCulqiSuccess({ id: C.order.id as string, method: 'yape' });
      return;
    }
    this.procesandoPago = false;
    if (C?.error) {
      alert(C.error.user_message || C.error.merchant_message || 'No se pudo completar el pago.');
    }
  }

  onToggleOtroCorreo() {
    if (this.otroCorreo && !this.correoPago) {
      this.correoPago = this.correoCuenta;
    }
  }

  pagarConCulqi() {
    if (this.mode !== 'STORE_PICKUP' && !this.checkout.envioListo(this.checkout.value.address)) {
      this.router.navigate(['/entrega'], { state: { openAddress: true } });
      return;
    }
    const email = this.correoCulqi;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Indica un correo válido para el pago.');
      return;
    }
    if (this.docListo()) {
      this.abrirCulqi();
      return;
    }
    this.selectedDoc = null;
    this.openDocModal();
  }

  private docListo(): boolean {
    if (this.selectedDoc === 'FA') return !!this.pay.currentInvoice();
    if (this.selectedDoc === 'BO') return !!this.pay.currentBoleta();
    const fa = this.pay.currentInvoice();
    const bo = this.pay.currentBoleta();
    if (fa && !bo) { this.selectedDoc = 'FA'; return true; }
    if (bo && !fa) { this.selectedDoc = 'BO'; return true; }
    return false;
  }

  private abrirCulqi() {
    const email = this.correoCulqi;
    const pk = environment.culqiPublicKey || 'pk_test_vJYOwLgj0Zghy6SF';
    const amount = Math.round(this.total * 100);
    const Ctor = (window as any).CulqiCheckout;

    if (typeof Ctor === 'function') {
      const checkout = new Ctor(pk, {
        settings: {
          title: 'Estilo Dorado',
          currency: 'PEN',
          amount,
        },
        client: { email },
        options: {
          lang: 'es',
          installments: false,
          modal: true,
          paymentMethods: { tarjeta: true, yape: true },
        },
        appearance: {
          hiddenEmail: true,
          theme: 'default',
          defaultStyle: {
            bannerColor: '#2D2418',
            buttonBackground: '#D4AF37',
            buttonTextColor: '#2D2418',
          },
        },
      });
      checkout.culqi = () => this.zone.run(() => this.handleCulqiFrom(checkout));
      checkout.open();
      return;
    }

    if (typeof (window as any).Culqi === 'undefined') {
      alert('No se cargó Culqi. Revisa que el script esté en index.html');
      return;
    }
    Culqi.publicKey = pk;
    Culqi.settings({
      title: 'Estilo Dorado',
      currency: 'PEN',
      description: 'Compra en Estilo Dorado',
      amount,
      email,
    });
    Culqi.open();
  }

  private postCulqiToken(token: string, email: string) {
    this.http.post<{ success: boolean; message?: string }>(
      `${environment.apiBaseUrl}/pagar-con-culqi`,
      { token, monto: this.total, descripcion: 'Compra Estilo Dorado', correo: email }
    ).subscribe({
      next: (r) => {
        this.procesandoPago = false;
        if (r.success) this.onCulqiSuccess({ id: token, method: 'tarjeta' });
        else alert('Error procesando pago: ' + (r.message ?? 'intenta de nuevo'));
      },
      error: (err) => {
        this.procesandoPago = false;
        const msg = err?.error?.message || err?.message || 'Laravel no respondió. ¿php artisan serve está en el 8000?';
        alert('Error de pago: ' + msg);
      }
    });
  }

  // === Flujo con selector (CULQI) ===
  private openDocModal() { if (this.docModal) this.docModal.show(); }
  private closeDocModal() { if (this.docModal) this.docModal.hide(); }

  async onCulqiSuccess(payload: { id: string; method: 'tarjeta' | 'yape' }) {
    this.pendingCharge = payload;
    if (!this.docListo()) {
      this.openDocModal();
      return;
    }
    const tipo: 'FA' | 'BO' = this.selectedDoc ?? (this.pay.currentInvoice() ? 'FA' : 'BO');
    this.finalizeOrder(tipo);
  }

  pickDoc(tipo: 'FA' | 'BO') {
    this.selectedDoc = tipo;
    const factura = this.pay.currentInvoice();
    const boleta = this.pay.currentBoleta();

    if (tipo === 'FA' && !factura) { this.closeDocModal(); this.openFactura(); return; }
    if (tipo === 'BO' && !boleta) { this.closeDocModal(); this.openBoleta(); return; }

    this.closeDocModal();
    if (this.pendingCharge) {
      this.finalizeOrder(tipo);
      return;
    }
    this.abrirCulqi();
  }

  /** CULQI: crea pedido en backend */
  private finalizeOrder(tipo: 'FA' | 'BO') {
    const payload = this.pendingCharge;
    if (!payload) { alert('Transacción no disponible. Intenta de nuevo.'); return; }

    const direccion = this.mode === 'STORE_PICKUP'
      ? TEXTO_RECOJO
      : (this.checkout.value.address?.full ?? '');

    const items = this.cart.items.map(i => ({ id_producto: Number(i.id), cantidad: i.qty }));
    if (!items.length) { alert('Tu carrito está vacío.'); return; }

    const factura = this.pay.currentInvoice();
    const boleta = this.pay.currentBoleta();

    const addr = this.checkout.value.address;
    const body: ConfirmarReq = {
      forma_pago: payload.method,           // 'tarjeta' | 'yape'
      culqi_id: payload.id,
      direccion_entrega: direccion || null,
      envio_tipo: addr?.envioTipo === 'DOMICILIO' ? 'DOMICILIO' : 'AGENCIA',
      ubigeo: addr ? {
        departamento: addr.departamento,
        provincia: addr.provincia,
        distrito: addr.distrito,
      } : undefined,
      items,
      telefono: this.checkout.telefono || undefined,
      comprobante: tipo,
      ...(tipo === 'FA' ? { factura: factura! } : { boleta: boleta! })
    };

    this.orderSrv.confirmar(body).subscribe({
      next: (res) => {
        this.cart.clear();
        this.checkout.reset();
        this.pendingCharge = null;
        // cierra modal Culqi si siguiera abierto
        try { if ((window as any).Culqi?.close) (window as any).Culqi.close(); } catch {}
        this.router.navigate(['/resumen', res.id_pedido], {
          state: { comprobante: res.comprobante, ventaOk: true }
        });
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Error al registrar el pedido.';
        alert('Pago OK, pero hubo un problema creando el pedido/boleta: ' + msg);
      }
    });
  }

  /** EFECTIVO (solo retiro en tienda) */
  pagarEnEfectivo() {
    if (!this.canCash) {
      alert('El pago en efectivo solo está disponible para Retiro en tienda.');
      return;
    }
    const direccion = TEXTO_RECOJO;
    const items = this.cart.items.map(i => ({ id_producto: Number(i.id), cantidad: i.qty }));
    if (!items.length) { alert('Tu carrito está vacío.'); return; }

    const body: ConfirmarReq = {
      forma_pago: 'efectivo',
      direccion_entrega: direccion,
      telefono: this.checkout.telefono || undefined,
      items
    };

    this.orderSrv.confirmar(body).subscribe({
      next: (res) => {
        this.cart.clear();
        this.checkout.reset();
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
    if (this.rucTimer) clearTimeout(this.rucTimer);
    if (v.length === 11) {
      this.rucTimer = setTimeout(() => this.buscarRuc(v), 300);
    } else {
      this.rucEstado = v.length ? 'Completa los 11 dígitos para autocompletar.' : '';
    }
  }

  private matchDep(name?: string | null): string {
    if (!name) return '';
    const n = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return this.deps.find(d => d.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === n) || '';
  }

  private buscarRuc(ruc: string) {
    this.rucEstado = 'Buscando RUC…';
    this.http.get<{ ok: boolean; data?: any }>(`${environment.apiBaseUrl}/consulta-ruc/${ruc}`).subscribe({
      next: (r) => {
        const d = r?.data;
        if (!d) {
          this.rucEstado = 'No se encontró. Completa a mano.';
          return;
        }
        const dep = this.matchDep(d.departamento);
        this.facturaForm.patchValue({
          razonSocial: d.razon_social || '',
          direccion: d.direccion || '',
          ...(dep ? { departamento: dep } : {}),
        });
        this.rucEstado = d.estado && String(d.estado).toUpperCase() !== 'ACTIVO'
          ? `Encontrado (${d.estado}). Revisa y elige provincia/distrito.`
          : 'Datos completados. Elige provincia y distrito.';
      },
      error: () => {
        this.rucEstado = 'No se encontró. Completa a mano.';
      }
    });
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
    this.closeDrawers();

    if (this.pendingCharge) this.finalizeOrder('FA');
    else this.abrirCulqi();
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
    this.closeDrawers();

    if (this.pendingCharge) this.finalizeOrder('BO');
    else this.abrirCulqi();
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
    } else {
      const u = this.auth.user;
      const addr = this.checkout.value.address;
      const nombre = [u?.nombre, u?.apellido].filter(Boolean).join(' ').trim();
      this.boletaForm.patchValue({
        nombres: nombre,
        direccion: addr?.full || addr?.via || u?.direccion || '',
        departamento: addr?.departamento || '',
        provincia: addr?.provincia || '',
        distrito: addr?.distrito || '',
      }, { emitEvent: false });
      if (addr?.departamento) {
        this.ubigeo.getProvincias(addr.departamento).subscribe(p => {
          this.provs = p;
          if (addr.provincia) {
            this.ubigeo.getDistritos(addr.departamento, addr.provincia).subscribe(d => this.dists = d);
          }
        });
      } else {
        this.provs = [];
        this.dists = [];
      }
    }
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
