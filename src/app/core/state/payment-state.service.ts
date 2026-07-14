import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../../services/auth/auth.service';


export type CardType = 'credito' | 'debito';
export interface SavedCard {
  id: string;           // uuid
  type: CardType;       // crédito o débito
  last4: string;        // últimos 4 dígitos
  brand: 'visa' | 'mc' | 'amex' | 'desconocida';
}

export interface InvoiceData {
  ruc: string; razonSocial: string; direccion: string;
  departamento: string; provincia: string; distrito: string;
}
export interface BoletaData {
  nombres: string; dni: string; direccion: string;
  departamento: string; provincia: string; distrito: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentStateService {
  private auth = inject(AuthService);

  private keyBase(): string {
    const uid = this.auth.user?.id_cliente ?? 'anon';
    return `ed_pay_${uid}`;
  }

  // tarjetas guardadas
  private _cards$ = new BehaviorSubject<SavedCard[]>(this.load<SavedCard[]>('cards') ?? []);
  cards$ = this._cards$.asObservable();

  // método seleccionado (para habilitar “Pagar”)
  private _hasMethod$ = new BehaviorSubject<boolean>(false);
  hasMethod$ = this._hasMethod$.asObservable();

  // comprobantes
  private _invoice$ = new BehaviorSubject<InvoiceData | null>(this.load('invoice'));
  invoice$ = this._invoice$.asObservable();
  private _boleta$ = new BehaviorSubject<BoletaData | null>(this.load('boleta'));
  boleta$ = this._boleta$.asObservable();

  setHasMethod(v: boolean) { this._hasMethod$.next(v); }

  addCard(c: SavedCard) {
    const list = [...this._cards$.value, c];
    this._cards$.next(list); this.save('cards', list);
    this._hasMethod$.next(true);
  }
  removeCard(id: string) {
    const list = this._cards$.value.filter(c => c.id !== id);
    this._cards$.next(list); this.save('cards', list);
    this._hasMethod$.next(list.length > 0);
  }

  saveInvoice(i: InvoiceData) { this._invoice$.next(i); this.save('invoice', i); }
  saveBoleta(b: BoletaData) { this._boleta$.next(b); this.save('boleta', b); }

  private save<T>(k: string, v: T) { localStorage.setItem(`${this.keyBase()}_${k}`, JSON.stringify(v)); }
  private load<T>(k: string): T | null {
    try { const raw = localStorage.getItem(`${this.keyBase()}_${k}`); return raw ? JSON.parse(raw) as T : null; } catch { return null; }
  }

  // >>> NUEVO: accesos rápidos al valor actual
  currentInvoice(): InvoiceData | null { return this._invoice$.value; }
  currentBoleta(): BoletaData | null { return this._boleta$.value; }

  // >>> NUEVO: limpiar datos guardados
  clearInvoice(): void { this._invoice$.next(null); }
  clearBoleta(): void { this._boleta$.next(null); }
}
