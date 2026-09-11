import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../../services/cart/cart.service';
import { CheckoutService } from '../../../services/checkout/checkout.service';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { UbigeoService } from '../../../services/ubigeo/ubigeo.service';
import { GeocodingService } from '../../../services/geocoding/geocoding.service';
import { firstValueFrom } from 'rxjs';
import { cubreEnvio, filtrarProvinciasEnvio, filtrarDistritosEnvio, TEXTO_COBERTURA, TEXTO_RECOJO, DIRECCION_TIENDA, zonaEnvio, costoEnvio } from '../../../core/utils/tarifa-envio';
import { AgenciaShalom, buscarAgenciasShalom, ResultadoAgencias } from '../../../core/utils/agencias-shalom';
import { AuthService } from '../../../services/auth/auth.service';

// widgets
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';

@Component({
  selector: 'ed-web-entrega',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, BarraSuperiorComponent, FranjaMarcaComponent, RouterLink],
  templateUrl: './entrega.component.html',
  styleUrls: ['./entrega.component.css']
})
export class EntregaComponent {
  // Recojo vs envío. Pasco = domicilio 5 (sin Shalom). Lima/Huancayo: agencia o domicilio extra.
  // Si elige envío y no hay agencia/dirección, Pago no deja ir a Culqi.
  private cart = inject(CartService);
  private checkout = inject(CheckoutService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private ubigeo = inject(UbigeoService);
  private geocode = inject(GeocodingService);
  private auth = inject(AuthService);

  constructor() {
    this.cart.refreshPrecios();
  }

  departamentos: string[] = [];
  provincias: string[] = [];
  distritos: string[] = [];

  private map?: L.Map;
  private marker?: L.Marker;
  lastCoords?: { lat: number; lng: number };
  private lastDisplay?: string; // 👈 para deducir número
  private restoring = false;
  private fillingFromMap = false;
  private geoTimer?: ReturnType<typeof setTimeout>;
  private mapMoveTimer?: ReturnType<typeof setTimeout>;
  mapLabel = '';
  geoBusy = false;

  // UI
  showAddressModal = false;
  stepMap = false;
  fase: 'ubigeo' | 'agencia' | 'mapa' = 'ubigeo';
  quiereDomicilio = false;
  agenciasRes: ResultadoAgencias | null = null;
  agenciaSel: AgenciaShalom | null = null;
  submitting = false;
  cobertura = TEXTO_COBERTURA;
  direccionTienda = DIRECCION_TIENDA;

  // Resumen
  get subtotal() { return this.cart.getSubtotal(); }
  get listado() { return this.cart.getListado(); }
  get promoDesc() { return this.cart.getDescuentos(); }
  get fee() { return this.checkout.value.fee; }
  get discount() { return this.checkout.value.discount; }
  get total() { return this.subtotal + this.fee - this.discount; }
  get enablePay() { return this.mode === 'STORE_PICKUP' || this.mode === 'EXPRESS' || this.showAddressModal; }
  get envioListo() { return this.checkout.envioListo(this.checkout.value.address); }
  get telefonoOk() { return this.checkout.telefonoOk; }
  get telefono() { return this.checkout.telefono; }
  get addressFull() { return this.checkout.value.address?.full || ''; }
  get payLabel() {
    if (this.mode === 'STORE_PICKUP') return 'Ir a pagar';
    if (this.envioListo) return 'Ir a pagar';
    return 'Elegir lugar de envío';
  }
  get mode() { return this.checkout.value.mode; }

  // Formulario paso 1
  addrForm = this.fb.group({
    departamento: ['', Validators.required],
    provincia: ['', Validators.required],
    distrito: ['', Validators.required],
    via: [''],
    numero: [''],
  });

  // ---------- INIT ----------
  ngOnInit() {
    if (!this.cart.items.length) {
      this.router.navigateByUrl('/carrito');
      return;
    }
    if (this.checkout.value.mode === 'NONE') {
      this.checkout.setCosts(0, 0);
    }

    this.ubigeo.getDepartamentos().subscribe(d => {
      this.departamentos = d.filter(x => cubreEnvio(x));
    });

    this.addrForm.get('departamento')!.valueChanges.subscribe(dep => {
      this.provincias = []; this.distritos = [];
      this.addrForm.patchValue({ provincia: '', distrito: '' }, { emitEvent: false });
      if (dep) {
        this.ubigeo.getProvincias(dep).subscribe(p => {
          this.provincias = filtrarProvinciasEnvio(dep, p);
          if (this.provincias.length === 1) {
            this.addrForm.patchValue({ provincia: this.provincias[0] });
          }
        });
      }
      this.persistDraft();
    });

    this.addrForm.get('provincia')!.valueChanges.subscribe(prov => {
      this.distritos = [];
      this.addrForm.patchValue({ distrito: '' }, { emitEvent: false });
      const dep = this.addrForm.value.departamento!;
      if (dep && prov) {
        this.ubigeo.getDistritos(dep, prov).subscribe(d => {
          this.distritos = filtrarDistritosEnvio(dep, prov, d);
        });
      }
      this.persistDraft();
    });

    this.addrForm.get('distrito')!.valueChanges.subscribe(() => this.persistDraft());
    this.addrForm.get('via')!.valueChanges.subscribe(() => {
      this.persistDraft();
      this.scheduleMapFromForm();
    });
    this.addrForm.get('numero')!.valueChanges.subscribe(() => {
      this.persistDraft();
      this.scheduleMapFromForm();
    });

    const st = history.state as any;
    this.checkout.bindCliente(this.auth.user?.id_cliente, this.auth.user?.telefono);
    if (st?.openAddress) {
      this.openAddressModal(true);
    } else {
      this.openPickup();
      const saved = this.checkout.value.draft;
      if (saved?.lat && saved?.lng) {
        this.lastCoords = { lat: Number(saved.lat), lng: Number(saved.lng) };
      }
    }
  }

  // ---------- UI ----------
  openPickup() {
    this.checkout.setMode('STORE_PICKUP');
    this.checkout.setAddress({
      departamento: 'Pasco',
      provincia: 'Pasco',
      distrito: 'Chaupimarca',
      via: 'Retiro en tienda',
      numero: 'S/N',
      full: TEXTO_RECOJO,
    } as any);
    this.checkout.setCosts(0, 0);
  }

  openExpress() { this.openAddressModal(true); }

  goPay() {
    if (this.mode === 'STORE_PICKUP') {
      if (!this.telefonoOk) {
        alert('Indica un celular de 9 dígitos que empiece con 9. Así te recordamos el recojo.');
        return;
      }
      this.router.navigateByUrl('/pago');
      return;
    }
    if (this.envioListo) {
      if (!this.telefonoOk) {
        alert('Indica un celular de 9 dígitos que empiece con 9.');
        return;
      }
      this.router.navigateByUrl('/pago');
      return;
    }
    this.openAddressModal(true);
  }

  get esPasco(): boolean {
    return zonaEnvio(this.addrForm.value.departamento, this.addrForm.value.provincia, this.addrForm.value.distrito) === 'pasco';
  }

  get tarifaAgencia() {
    return costoEnvio(this.addrForm.value.departamento, this.addrForm.value.provincia, this.addrForm.value.distrito, 'AGENCIA');
  }

  get tarifaDomicilio() {
    return costoEnvio(this.addrForm.value.departamento, this.addrForm.value.provincia, this.addrForm.value.distrito, 'DOMICILIO');
  }

  private persistDraft() {
    if (this.restoring) return;
    const v = this.addrForm.getRawValue();
    this.checkout.setDraft({
      departamento: v.departamento || '',
      provincia: v.provincia || '',
      distrito: v.distrito || '',
      via: v.via || '',
      numero: v.numero || '',
      lat: this.lastCoords?.lat,
      lng: this.lastCoords?.lng,
    });
  }

  private openAddressModal(prefill: boolean) {
    this.fase = 'ubigeo';
    this.stepMap = false;
    this.quiereDomicilio = false;
    this.agenciasRes = null;
    this.agenciaSel = null;
    this.showAddressModal = true;
    if (!prefill) return;

    const a = (this.checkout.value.draft || this.checkout.value.address) as any;
    if (!a || (a.via === 'Retiro en tienda')) {
      const d = this.checkout.value.draft;
      if (!d || d.via === 'Retiro en tienda') return;
    }
    const src = (this.checkout.value.draft && this.checkout.value.draft.via !== 'Retiro en tienda')
      ? this.checkout.value.draft
      : this.checkout.value.address;
    if (!src) return;
    if (src.lat && src.lng) this.lastCoords = { lat: Number(src.lat), lng: Number(src.lng) };

    this.restoring = true;
    this.addrForm.patchValue({
      departamento: src.departamento || '',
      provincia: '',
      distrito: '',
      via: src.via || '',
      numero: src.numero || ''
    }, { emitEvent: true });

    if (src.departamento) {
      this.ubigeo.getProvincias(src.departamento).subscribe(provs => {
        this.provincias = filtrarProvinciasEnvio(src.departamento!, provs);
        const prov = this.provincias.includes(src.provincia || '')
          ? src.provincia
          : (this.provincias[0] || '');
        this.addrForm.patchValue({ provincia: prov || '' }, { emitEvent: true });

        if (prov) {
          this.ubigeo.getDistritos(src.departamento!, prov).subscribe(dists => {
            this.distritos = filtrarDistritosEnvio(src.departamento!, prov, dists);
            const dist = this.distritos.includes(src.distrito || '') ? src.distrito : '';
            this.addrForm.patchValue({ distrito: dist || '' }, { emitEvent: false });
            this.restoring = false;
            this.persistDraft();
          });
        } else {
          this.restoring = false;
        }
      });
    } else {
      this.restoring = false;
    }
  }

  onPhoneInput(ev: Event) {
    const el = ev.target as HTMLInputElement;
    let d = el.value.replace(/\D/g, '');
    if (d.length > 9) d = d.slice(0, 9);
    el.value = d;
    this.checkout.setTelefono(d);
  }

  closeModal() { this.showAddressModal = false; }

  // ---------- GEOCODING ----------
  continuarUbigeo() {
    const v = this.addrForm.value;
    if (!v.departamento || !v.provincia || !v.distrito) {
      this.addrForm.markAllAsTouched();
      return;
    }
    if (!cubreEnvio(v.departamento, v.provincia, v.distrito)) {
      alert(TEXTO_COBERTURA);
      return;
    }
    if (this.esPasco) {
      this.quiereDomicilio = true;
      if (!v.via?.trim() || !v.numero?.trim()) {
        this.addrForm.get('via')?.markAsTouched();
        this.addrForm.get('numero')?.markAsTouched();
        return;
      }
      this.continuarDireccion();
      return;
    }
    this.agenciasRes = buscarAgenciasShalom(v.departamento, v.provincia, v.distrito);
    this.agenciaSel = this.agenciasRes.agencias[0] || null;
    this.fase = 'agencia';
  }

  elegirAgencia(a: AgenciaShalom) {
    this.agenciaSel = a;
  }

  continuarDesdeAgencia() {
    if (!this.agenciaSel) return;
    if (this.quiereDomicilio) {
      const v = this.addrForm.value;
      if (!v.via?.trim() || !v.numero?.trim()) {
        this.addrForm.get('via')?.markAsTouched();
        this.addrForm.get('numero')?.markAsTouched();
        alert('Para domicilio escribe calle y número, luego Ir al mapa.');
        return;
      }
      this.continuarDireccion();
      return;
    }
    this.guardarAgencia();
  }

  private guardarAgencia() {
    const v = this.addrForm.value;
    const a = this.agenciaSel!;
    this.checkout.setMode('EXPRESS');
    this.checkout.setAddress({
      departamento: v.departamento!,
      provincia: v.provincia!,
      distrito: v.distrito!,
      via: a.nombre,
      numero: 'S/N',
      full: `${a.nombre} — ${a.direccion} (${a.distrito})`,
      envioTipo: 'AGENCIA',
      agenciaId: a.id,
      agenciaNombre: a.nombre,
      agenciaDireccion: a.direccion,
    } as any);
    this.checkout.setCosts(this.tarifaAgencia.costo, 0);
    this.showAddressModal = false;
    this.router.navigateByUrl('/confirmar-entrega');
  }

  async continuarDireccion() {
    const v = this.addrForm.value;
    if (!v.departamento || !v.provincia || !v.distrito || !v.via?.trim() || !v.numero?.trim()) {
      this.addrForm.markAllAsTouched();
      return;
    }
    this.fase = 'mapa';
    this.stepMap = true;

    const point = await this.geocodeBest();
    this.lastCoords = { lat: point.lat, lng: point.lng };
    this.mapLabel = `${(this.addrForm.value.via || '').trim()} ${(this.addrForm.value.numero || '').trim()}`.trim();
    setTimeout(() => this.initMap(point.lat, point.lng), 80);
  }

  private fallbackCoords(dep?: string | null, prov?: string | null, dist?: string | null): { lat: number; lng: number } {
    const z = zonaEnvio(dep, prov, dist);
    if (z === 'lima') {
      const d = (dist || '').toUpperCase();
      if (d.includes('CALLAO') || (dep || '').toUpperCase().includes('CALLAO')) {
        return { lat: -12.05659, lng: -77.11814 };
      }
      if (d.includes('JESUS') || d.includes('JESÚS')) return { lat: -12.0782, lng: -77.0465 };
      if (d.includes('MIRAFLORES')) return { lat: -12.1211, lng: -77.0297 };
      if (d.includes('SAN ISIDRO')) return { lat: -12.0979, lng: -77.0353 };
      if (d.includes('SURCO')) return { lat: -12.1395, lng: -76.9967 };
      if (d.includes('LA MOLINA')) return { lat: -12.0790, lng: -76.9294 };
      if (d.includes('SAN MIGUEL')) return { lat: -12.0785, lng: -77.0821 };
      if (d.includes('PUEBLO LIBRE')) return { lat: -12.0764, lng: -77.0626 };
      if (d.includes('LINCE')) return { lat: -12.0855, lng: -77.0364 };
      if (d.includes('MAGDALENA')) return { lat: -12.0906, lng: -77.0701 };
      if (d.includes('BREÑA') || d.includes('BRENA')) return { lat: -12.0589, lng: -77.0506 };
      if (d.includes('LA VICTORIA')) return { lat: -12.0714, lng: -77.0166 };
      if (d.includes('SAN JUAN DE LURIGANCHO') || d.includes('SJL')) return { lat: -12.0299, lng: -76.9928 };
      if (d.includes('COMAS')) return { lat: -11.9329, lng: -77.0408 };
      if (d.includes('LOS OLIVOS')) return { lat: -11.9910, lng: -77.0734 };
      return { lat: -12.04637, lng: -77.04279 };
    }
    if (z === 'pasco') return { lat: -10.66848, lng: -76.25688 };
    return { lat: -12.06866, lng: -75.21027 };
  }

  private expandVia(via: string): string {
    return (via || '')
      .replace(/\bAvda\.?\s*/gi, 'Avenida ')
      .replace(/\bAv\.?\s*/gi, 'Avenida ')
      .replace(/\bJr\.?\s*/gi, 'Jirón ')
      .replace(/\bCal\.?\s*/gi, 'Calle ')
      .replace(/\bPje\.?\s*/gi, 'Pasaje ')
      .replace(/\bUrb\.?\s*/gi, 'Urbanización ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async geocodeBest(): Promise<{ lat: number; lng: number }> {
    const v = this.addrForm.value;
    const bias = this.fallbackCoords(v.departamento, v.provincia, v.distrito);
    const via = this.expandVia(v.via || '');
    const num = (v.numero || '').trim();
    const dist = (v.distrito || '').trim();
    const queries = [
      [via, num, dist, 'Lima', 'Perú'].filter(Boolean).join(', '),
      [via, num, dist, v.provincia, 'Perú'].filter(Boolean).join(', '),
      [via, dist, 'Perú'].filter(Boolean).join(', '),
      [via, num, 'Lima', 'Perú'].filter(Boolean).join(', '),
    ].filter((q, i, a) => q.length > 5 && a.indexOf(q) === i);

    for (const q of queries) {
      const res = await this.geocode.searchAddress(q, { lat: bias.lat, lon: bias.lng });
      if (res) return { lat: res.lat, lng: res.lon };
    }
    return bias;
  }

  private initMap(lat: number, lng: number) {
    const el = document.getElementById('edMap');
    if (!el) {
      setTimeout(() => this.initMap(lat, lng), 80);
      return;
    }
    if (this.map) { this.map.remove(); this.map = undefined; }

    this.map = L.map(el, { zoomControl: true }).setView([lat, lng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });

    this.marker = L.marker([lat, lng], { draggable: true, icon }).addTo(this.map);

    const fromMap = async (pos: L.LatLng, pan = false) => {
      this.lastCoords = { lat: pos.lat, lng: pos.lng };
      this.marker!.setLatLng(pos);
      if (pan) {
        this.fillingFromMap = true;
        this.map!.panTo(pos, { animate: false });
        this.fillingFromMap = false;
      }
      await this.fillFromReverse(pos.lat, pos.lng);
    };

    this.marker.on('dragend', async () => {
      await fromMap(this.marker!.getLatLng(), true);
    });

    this.map.on('click', async (e: L.LeafletMouseEvent) => {
      await fromMap(e.latlng);
    });

    this.map.on('moveend', () => {
      if (this.fillingFromMap) return;
      clearTimeout(this.mapMoveTimer);
      this.mapMoveTimer = setTimeout(async () => {
        if (!this.map || this.fillingFromMap) return;
        const c = this.map.getCenter();
        if (this.marker) this.marker.setLatLng(c);
        this.lastCoords = { lat: c.lat, lng: c.lng };
        await this.fillFromReverse(c.lat, c.lng);
      }, 280);
    });

    setTimeout(() => {
      this.map?.invalidateSize();
      void this.fillFromReverse(lat, lng);
    }, 120);
  }

  // === Normalizador y matching suave ===
  private norm(s: string | undefined | null): string {
    return (s || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();
  }
  private bestMatch(name: string | undefined, list: string[]): string | null {
    if (!name) return null;
    const n = this.norm(name);
    if (!n) return null;
    return (
      list.find(x => this.norm(x) === n) ??
      list.find(x => this.norm(x).startsWith(n)) ??
      list.find(x => this.norm(x).includes(n) || n.includes(this.norm(x))) ??
      null
    );
  }

  private async applyUbigeoFromReverse(dep?: string, prov?: string, dist?: string) {
    if (!this.departamentos.length) {
      this.departamentos = (await firstValueFrom(this.ubigeo.getDepartamentos())).filter(x => cubreEnvio(x));
    }

    const matchDep = this.bestMatch(dep, this.departamentos);
    if (!matchDep) return;

    const currentDep = this.addrForm.value.departamento || '';
    if (matchDep !== currentDep) {
      this.addrForm.patchValue({ departamento: matchDep, provincia: '', distrito: '' }, { emitEvent: true });
      this.provincias = filtrarProvinciasEnvio(matchDep, await firstValueFrom(this.ubigeo.getProvincias(matchDep)));
    } else if (!this.provincias.length) {
      this.provincias = filtrarProvinciasEnvio(matchDep, await firstValueFrom(this.ubigeo.getProvincias(matchDep)));
    }

    const matchProv = this.bestMatch(prov, this.provincias);
    if (!matchProv) return;

    const currentProv = this.addrForm.value.provincia || '';
    if (matchProv !== currentProv) {
      this.addrForm.patchValue({ provincia: matchProv, distrito: '' }, { emitEvent: true });
      this.distritos = filtrarDistritosEnvio(
        matchDep,
        matchProv,
        await firstValueFrom(this.ubigeo.getDistritos(matchDep, matchProv)),
      );
    } else if (!this.distritos.length) {
      this.distritos = filtrarDistritosEnvio(
        matchDep,
        matchProv,
        await firstValueFrom(this.ubigeo.getDistritos(matchDep, matchProv)),
      );
    }

    const matchDist = this.bestMatch(dist, this.distritos);
    if (matchDist && matchDist !== (this.addrForm.value.distrito || '')) {
      this.addrForm.patchValue({ distrito: matchDist }, { emitEvent: false });
    }
  }

  // --- Deducción de número si el reverse no lo entrega ---
  private guessNumberFromDisplay(display?: string, via?: string): string {
    if (!display) return '';
    const head = display.split(',')[0] || display; // “Calle X 123 …”
    if (via) {
      const i = head.toUpperCase().indexOf(via.toUpperCase());
      if (i >= 0) {
        const tail = head.slice(i + via.length);
        const m = tail.match(/(\d{1,6}[A-Za-z0-9\-]*)/);
        if (m) return m[1];
      }
    }
    const m2 = head.match(/\b(\d{1,6}[A-Za-z0-9\-]*)\b/);
    return m2 ? m2[1] : '';
  }

  private async fillFromReverse(lat: number, lng: number) {
    this.geoBusy = true;
    const r = await this.geocode.reverseAddress(lat, lng);
    this.fillingFromMap = true;

    if (!r || (!(r.via || '').trim() && /ubicaci[oó]n\s+-?\d/i.test((r.display || '')))) {
      this.mapLabel = 'Mueve el pin: buscamos la calle en el mapa…';
      this.geoBusy = false;
      this.fillingFromMap = false;
      this.persistDraft();
      return;
    }

    this.lastDisplay = r.display || undefined;
    const viaRev = (r.via ?? '').toString().trim();
    const numRev = (r.numero ?? '').toString().trim();
    const via = viaRev || (this.addrForm.value.via ?? '').toString().trim();
    const numero = numRev || this.guessNumberFromDisplay(this.lastDisplay, via) || (this.addrForm.value.numero ?? '').toString().trim() || '0';

    this.addrForm.patchValue({ via, numero }, { emitEvent: false });
    const rawDisplay = (r.display || '').trim();
    const coordOnly = /^ubicaci[oó]n\s+-?\d/i.test(rawDisplay) || /^-?\d+(\.\d+)?\s*,\s*-?\d+/.test(rawDisplay);
    this.mapLabel = (!coordOnly && rawDisplay)
      ? rawDisplay
      : `${via} ${numero}`.trim()
        || 'Mueve el pin para fijar la calle';
    await this.applyUbigeoFromReverse(r.departamento, r.provincia, r.distrito);
    this.persistDraft();
    this.geoBusy = false;
    this.fillingFromMap = false;
  }

  private scheduleMapFromForm() {
    if (!this.stepMap || !this.map || this.fillingFromMap) return;
    clearTimeout(this.geoTimer);
    this.geoTimer = setTimeout(() => this.moveMapFromForm(), 700);
  }

  private async moveMapFromForm() {
    if (!this.map || this.fillingFromMap) return;
    const point = await this.geocodeBest();
    this.fillingFromMap = true;
    this.lastCoords = { lat: point.lat, lng: point.lng };
    this.map.setView([point.lat, point.lng], Math.max(this.map.getZoom(), 17));
    this.marker?.setLatLng([point.lat, point.lng]);
    this.fillingFromMap = false;
  }

  // ---------- CONFIRMAR ----------
  confirmarYGuardar() {
    const v = this.addrForm.value;

    // Seguridad extra: si llega vacío, volvemos a deducir y ponemos '0' como último recurso
    let numero = (v.numero ?? '').toString().trim();
    if (!numero) {
      numero = this.guessNumberFromDisplay(this.lastDisplay, v.via!) || '0';
      this.addrForm.patchValue({ numero }, { emitEvent: false });
    }

    if (!cubreEnvio(v.departamento, v.provincia, v.distrito)) {
      alert(TEXTO_COBERTURA);
      return;
    }

    this.checkout.setMode('EXPRESS');
    this.checkout.setAddress({
      departamento: v.departamento!,
      provincia: v.provincia!,
      distrito: v.distrito!,
      via: v.via!,
      numero,
      lat: this.lastCoords?.lat,
      lng: this.lastCoords?.lng,
      full: this.composeFullAddress(v.via!, numero, v.distrito!, v.provincia!, v.departamento!),
      envioTipo: 'DOMICILIO',
      agenciaId: this.agenciaSel?.id,
      agenciaNombre: this.agenciaSel?.nombre,
      agenciaDireccion: this.agenciaSel?.direccion,
    } as any);
    this.checkout.setCosts(costoEnvio(v.departamento, v.provincia, v.distrito, 'DOMICILIO').costo, 0);

    this.showAddressModal = false;
    this.router.navigateByUrl('/confirmar-entrega');
  }

  private composeFullAddress(via: string, numero: string, dist: string, prov: string, dep: string) {
    const left = [via?.trim(), numero?.trim()].filter(Boolean).join(' ');
    const right = [dist, prov, dep].filter(Boolean).join('/');
    return right ? `${left} – ${right}` : left;
  }

  // ---------- UTILS ----------
  private buildQueryFromForm(): string {
    const { via, numero, distrito, provincia, departamento } = this.addrForm.value;
    return [via?.trim() || '', numero?.trim() || '', distrito || '', provincia || '', departamento || '', 'Perú']
      .filter(Boolean).join(', ');
  }
}
