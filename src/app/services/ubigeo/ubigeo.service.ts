// src/app/services/ubigeo/ubigeo.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, shareReplay, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

type UbigeoData = Record<string, Record<string, string[]>>;

@Injectable({ providedIn: 'root' })
export class UbigeoService {
  private http = inject(HttpClient);

  private data$: Observable<UbigeoData> = this.http
    .get<UbigeoData>('assets/ubigeo-peru.json') // <-- OJO la ruta
    .pipe(
      catchError(err => {
        console.error('[UbigeoService] No se pudo cargar assets/ubigeo-peru.json', err);
        return of({} as UbigeoData);
      }),
      shareReplay(1)
    );

  getDepartamentos() {
    return this.data$.pipe(
      map(data => {
        const deps = Object.keys(data || {}).sort();
        console.log('[Ubigeo] departamentos:', deps);
        return deps;
      })
    );
  }

  getProvincias(departamento: string) {
    return this.data$.pipe(
      map(data => {
        const provs = Object.keys(data?.[departamento] || {}).sort();
        console.log(`[Ubigeo] provincias de ${departamento}:`, provs);
        return provs;
      })
    );
  }

  getDistritos(departamento: string, provincia: string) {
    return this.data$.pipe(
      map(data => {
        const dists = [...(data?.[departamento]?.[provincia] || [])].sort();
        console.log(`[Ubigeo] distritos de ${departamento} / ${provincia}:`, dists);
        return dists;
      })
    );
  }
}


