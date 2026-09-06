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
  private cart = inject(CartService);
  private checkout = inject(CheckoutService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private ubigeo = inject(UbigeoService);
  private geocode = inject(GeocodingService);

  departamentos: string[] = [];
  provincias: string[] = [];
  distritos: string[] = [];

  private map?: L.Map;
  private marker?: L.Marker;
  private lastCoords?: { lat: number; lng: number };
  private lastDisplay?: string; // 👈 para deducir número
  private restoring = false;

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
  get fee() { return this.checkout.value.fee; }
  get discount() { return this.checkout.value.discount; }
  get total() { return this.subtotal + this.fee - this.discount; }
  get enablePay() { return this.mode === 'STORE_PICKUP' || this.mode === 'EXPRESS' || this.showAddressModal; }
  get envioListo() { return this.checkout.envioListo(this.checkout.value.address); }
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
    this.addrForm.get('via')!.valueChanges.subscribe(() => this.persistDraft());
    this.addrForm.get('numero')!.valueChanges.subscribe(() => this.persistDraft());

    const st = history.state as any;
    if (st?.openAddress) this.openAddressModal(true);
    else {
      const saved = this.checkout.value.address || this.checkout.value.draft;
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
      this.router.navigateByUrl('/pago');
      return;
    }
    if (this.envioListo) {
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
    setTimeout(() => this.initMap(point.lat, point.lng), 80);
  }

  private fallbackCoords(dep?: string | null, prov?: string | null, dist?: string | null): { lat: number; lng: number } {
    const z = zonaEnvio(dep, prov, dist);
    if (z === 'lima') {
      const d = (dist || '').toUpperCase();
      if (d.includes('CALLAO') || (dep || '').toUpperCase().includes('CALLAO')) {
        return { lat: -12.05659, lng: -77.11814 };
      }
      return { lat: -12.04637, lng: -77.04279 };
    }
    if (z === 'pasco') return { lat: -10.66848, lng: -76.25688 };
    return { lat: -12.06866, lng: -75.21027 };
  }

  private async geocodeBest(): Promise<{ lat: number; lng: number }> {
    const v = this.addrForm.value;
    const queries = [
      this.buildQueryFromForm(),
      [v.via?.trim(), v.distrito, v.provincia, v.departamento, 'Perú'].filter(Boolean).join(', '),
      [v.distrito, v.provincia, v.departamento, 'Perú'].filter(Boolean).join(', '),
    ];
    for (const q of queries) {
      const res = await this.geocode.searchAddress(q);
      if (res) return { lat: res.lat, lng: res.lon };
    }
    return this.fallbackCoords(v.departamento, v.provincia, v.distrito);
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

    this.marker.on('dragend', async () => {
      const pos = this.marker!.getLatLng();
      this.lastCoords = { lat: pos.lat, lng: pos.lng };
      await this.fillFromReverse(pos.lat, pos.lng);
    });

    this.map.on('click', async (e: L.LeafletMouseEvent) => {
      const pos = e.latlng;
      this.marker!.setLatLng(pos);
      this.lastCoords = { lat: pos.lat, lng: pos.lng };
      await this.fillFromReverse(pos.lat, pos.lng);
    });

    setTimeout(() => this.map?.invalidateSize(), 120);
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
    const r = await this.geocode.reverseAddress(lat, lng); // va por tu backend (sin CORS)
    if (!r) return;

    this.lastDisplay = r.display || undefined;

    const viaUser = (this.addrForm.value.via ?? '').toString().trim();
    const numUser = (this.addrForm.value.numero ?? '').toString().trim();
    const via = viaUser || (r.via ?? '').toString().trim();
    const numFromReverse = (r.numero ?? '').toString().trim();
    const numFromDisplay = this.guessNumberFromDisplay(this.lastDisplay, via);
    const numero = numUser || numFromReverse || numFromDisplay || '0';

    this.addrForm.patchValue({ via, numero }, { emitEvent: false });
    this.persistDraft();
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
    return [via?.trim() || '', numero?.trim() || '', distrito || '', provincia || '', departamento || 'Perú']
      .filter(Boolean).join(', ');
  }
}
