import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { estimarEnvio } from '../utils/tarifa-envio';

export type MetodoEntrega = 'retiro' | 'domicilio';

export interface Direccion {
  departamento: string;
  provincia: string;
  distrito: string;
  via: string;
  numero: string;
  lat?: number;
  lng?: number;
  display?: string; // “Huancavelica 2885, El Tambo, Huancayo, Junin”
}

@Injectable({ providedIn: 'root' })
export class EntregaStateService {
  private dir$ = new BehaviorSubject<Direccion | null>(null);
  private metodo$ = new BehaviorSubject<MetodoEntrega | null>(null);
  private entregaSoles$ = new BehaviorSubject<number>(0);
  private descuentoSoles$ = new BehaviorSubject<number>(0);

  // GETTERS como observables
  direccion$ = this.dir$.asObservable();
  metodoEntrega$ = this.metodo$.asObservable();
  entregaSolesObs$ = this.entregaSoles$.asObservable();
  descuentoSolesObs$ = this.descuentoSoles$.asObservable();

  get direccion(): Direccion | null { return this.dir$.value; }
  get metodo(): MetodoEntrega | null { return this.metodo$.value; }
  get entregaSoles(): number { return this.entregaSoles$.value; }
  get descuentoSoles(): number { return this.descuentoSoles$.value; }

  setDireccion(d: Direccion) { this.dir$.next(d); }
  setMetodo(m: MetodoEntrega) { this.metodo$.next(m); }
  setCostoEntrega(n: number) { this.entregaSoles$.next(n); }
  setDescuento(n: number) { this.descuentoSoles$.next(n); }

  /** Atajo para aplicar la política de precios de cada método */
  aplicarPolitica(m: MetodoEntrega) {
    this.setMetodo(m);
    if (m === 'retiro') {
      this.setCostoEntrega(0);
      this.setDescuento(0);
    } else {
      const d = this.dir$.value;
      this.setCostoEntrega(estimarEnvio(d?.departamento, d?.provincia, d?.distrito).costo);
      this.setDescuento(0);
    }
  }
}
