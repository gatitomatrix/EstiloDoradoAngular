import { Injectable } from '@angular/core';

export type DeliveryMode = 'NONE' | 'STORE_PICKUP' | 'EXPRESS';

export interface Address {
  departamento: string;
  provincia: string;
  distrito: string;
  via: string;      // avenida/calle/jirón
  numero: string;
  full?: string;    // texto completo generado
  lat?: number;
  lng?: number;
}

export interface CheckoutState {
  mode: DeliveryMode;
  address?: Address;
  fee: number;       // costo de entrega
  discount: number;  // descuento aplicado
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

  setAddress(addr: Address) {
    // genera textual
    this.state.address = { ...addr, full: `${addr.via} ${addr.numero}, ${addr.distrito}, ${addr.provincia}, ${addr.departamento}` };
    this.persist();
  }

  setCosts(fee: number, discount = 0) {
    this.state.fee = fee;
    this.state.discount = discount;
    this.persist();
  }

  reset() {
    this.state = { mode: 'NONE', fee: 0, discount: 0 };
    this.persist();
  }

  private persist() {
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch {}
  }
  private read(): CheckoutState | null {
    try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
}
