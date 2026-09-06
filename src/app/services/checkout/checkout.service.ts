import { Injectable } from '@angular/core';

export type DeliveryMode = 'NONE' | 'STORE_PICKUP' | 'EXPRESS';
export type TipoEnvio = 'AGENCIA' | 'DOMICILIO';

export interface Address {
  departamento: string;
  provincia: string;
  distrito: string;
  via: string;      // avenida/calle/jirón o nombre de agencia
  numero: string;
  full?: string;    // texto completo generado
  lat?: number;
  lng?: number;
  envioTipo?: TipoEnvio;
  agenciaId?: string;
  agenciaNombre?: string;
  agenciaDireccion?: string;
}

export interface CheckoutState {
  mode: DeliveryMode;
  address?: Address;
  /** Borrador de dirección (aunque no hayan confirmado aún). */
  draft?: Partial<Address> | null;
  fee: number;       // costo de entrega
  discount: number;  // descuento aplicado
  telefono?: string;
}

const KEY = 'ed_checkout_state';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private state: CheckoutState = this.read() ?? { mode: 'NONE', fee: 0, discount: 0 };

  get value(): CheckoutState { return this.state; }

  setMode(mode: DeliveryMode) {
    this.state.mode = mode;
    this.persist();
  }

  /** Dirección de envío ya confirmada (no el recojo en tienda). */
  get savedExpress(): Address | null {
    const a = this.state.address;
    return this.envioListo(a) ? a! : null;
  }

  /** Agencia o domicilio ya elegido (no solo el tipo "Envío"). */
  envioListo(a?: Address | null): boolean {
    if (!a || a.via === 'Retiro en tienda') return false;
    if (!a.departamento || !a.provincia || !a.distrito) return false;
    if (a.envioTipo === 'AGENCIA') {
      return !!(a.agenciaNombre || a.agenciaId || (a.via && a.via.trim()));
    }
    if (a.envioTipo === 'DOMICILIO') {
      return !!(a.via && String(a.via).trim());
    }
    return false;
  }

  get puedePagar(): boolean {
    if (this.state.mode === 'STORE_PICKUP') return true;
    return this.state.mode === 'EXPRESS' && this.envioListo(this.state.address) && this.telefonoOk;
  }

  get telefono(): string {
    return (this.state.telefono || '').replace(/\D/g, '').slice(0, 9);
  }

  get telefonoOk(): boolean {
    return /^9\d{8}$/.test(this.telefono);
  }

  setTelefono(raw: string) {
    const d = (raw || '').replace(/\D/g, '').slice(0, 9);
    this.state.telefono = d;
    this.persist();
  }

  setAddress(addr: Address) {
    this.state.address = { ...addr, full: addr.full || `${addr.via} ${addr.numero}, ${addr.distrito}, ${addr.provincia}, ${addr.departamento}` };
    if (addr.via !== 'Retiro en tienda') {
      this.state.draft = { ...this.state.address };
    }
    this.persist();
  }

  setDraft(partial: Partial<Address>) {
    this.state.draft = { ...(this.state.draft || {}), ...partial };
    this.persist();
  }

  setCosts(fee: number, discount = 0) {
    this.state.fee = fee;
    this.state.discount = discount;
    this.persist();
  }

  reset() {
    this.state = { mode: 'NONE', fee: 0, discount: 0, draft: this.state.draft ?? null, telefono: this.state.telefono };
    this.persist();
  }

  private persist() {
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch {}
  }
  private read(): CheckoutState | null {
    try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
}
