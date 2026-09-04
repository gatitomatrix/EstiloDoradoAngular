import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../../services/cart/cart.service';
import { CheckoutService } from '../../../services/checkout/checkout.service';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import * as L from 'leaflet';
import { UbigeoService } from '../../../services/ubigeo/ubigeo.service';
import { GeocodingService } from '../../../services/geocoding/geocoding.service';
import { firstValueFrom } from 'rxjs';
import { estimarEnvio, cubreEnvio, TEXTO_COBERTURA } from '../../../core/utils/tarifa-envio';

// widgets
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';

@Component({
  selector: 'ed-web-entrega',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BarraSuperiorComponent, FranjaMarcaComponent, RouterLink],
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
  submitting = false;
  cobertura = TEXTO_COBERTURA;

  // Resumen
  get subtotal() { return this.cart.getSubtotal(); }
  get fee() { return this.checkout.value.fee; }
  get discount() { return this.checkout.value.discount; }
  get total() { return this.subtotal + this.fee - this.discount; }
  get enablePay() { return this.checkout.value.mode !== 'NONE'; }

  // Formulario paso 1
  addrForm = this.fb.group({
    departamento: ['', Validators.required],
    provincia: ['', Validators.required],
    distrito: ['', Validators.required],
    via: ['', Validators.required],
    numero: ['', Validators.required],
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
      if (dep) this.ubigeo.getProvincias(dep).subscribe(p => this.provincias = p);
      this.persistDraft();
    });

    this.addrForm.get('provincia')!.valueChanges.subscribe(prov => {
      this.distritos = [];
      this.addrForm.patchValue({ distrito: '' }, { emitEvent: false });
      const dep = this.addrForm.value.departamento!;
      if (dep && prov) this.ubigeo.getDistritos(dep, prov).subscribe(d => this.distritos = d);
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
      departamento: '',
      provincia: '',
      distrito: '',
      via: 'Retiro en tienda',
      numero: '-',
      full: 'Retiro en tienda'
    } as any);
    this.checkout.setCosts(0, 0);
  }

  openExpress() { this.openAddressModal(true); }

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
    this.stepMap = false; this.showAddressModal = true;
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
        this.provincias = provs;
        this.addrForm.patchValue({ provincia: src.provincia || '' }, { emitEvent: true });

        if (src.provincia) {
          this.ubigeo.getDistritos(src.departamento!, src.provincia).subscribe(dists => {
            this.distritos = dists;
            this.addrForm.patchValue({ distrito: src.distrito || '' }, { emitEvent: false });
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
  async continuarDireccion() {
    if (this.addrForm.invalid) { this.addrForm.markAllAsTouched(); return; }
    this.stepMap = true;

    const q = this.buildQueryFromForm();
    const res = await this.geocode.searchAddress(q);

    let lat = -12.06866, lng = -75.21027; // Huancayo fallback
    if (res) { lat = res.lat; lng = res.lon; }

    this.lastCoords = { lat, lng };
    setTimeout(() => this.initMap(lat, lng), 0);
  }

  private initMap(lat: number, lng: number) {
    if (this.map) { this.map.remove(); this.map = undefined; }

    this.map = L.map('edMap', { zoomControl: true }).setView([lat, lng], 16);

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

    // Autocompletar inmediatamente al abrir el mapa
    this.fillFromReverse(lat, lng);

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

    this.map.invalidateSize();
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
      this.provincias = await firstValueFrom(this.ubigeo.getProvincias(matchDep));
    } else if (!this.provincias.length) {
      this.provincias = await firstValueFrom(this.ubigeo.getProvincias(matchDep));
    }

    const matchProv = this.bestMatch(prov, this.provincias);
    if (!matchProv) return;

    const currentProv = this.addrForm.value.provincia || '';
    if (matchProv !== currentProv) {
      this.addrForm.patchValue({ provincia: matchProv, distrito: '' }, { emitEvent: true });
      this.distritos = await firstValueFrom(this.ubigeo.getDistritos(matchDep, matchProv));
    } else if (!this.distritos.length) {
      this.distritos = await firstValueFrom(this.ubigeo.getDistritos(matchDep, matchProv));
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

    // Vía
    const via = (r.via ?? this.addrForm.value.via ?? '').toString().trim();

    // Número: 1) house_number, 2) display_name, 3) lo que ya había escrito, 4) '0'
    const numFromReverse = (r.numero ?? '').toString().trim();
    const numFromDisplay = this.guessNumberFromDisplay(this.lastDisplay, via);
    const prev = (this.addrForm.value.numero ?? '').toString().trim();
    const numero = numFromReverse || numFromDisplay || prev || '0';

    this.addrForm.patchValue({ via, numero }, { emitEvent: false });
    this.persistDraft();

    // Dpto/Prov/Dist
    await this.applyUbigeoFromReverse(r.departamento, r.provincia, r.distrito);
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

    if (!cubreEnvio(v.departamento, v.provincia)) {
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
      full: this.composeFullAddress(v.via!, numero, v.distrito!, v.provincia!, v.departamento!)
    } as any);
    const tarifa = estimarEnvio(v.departamento, v.provincia);
    this.checkout.setCosts(tarifa.costo, 0);

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
