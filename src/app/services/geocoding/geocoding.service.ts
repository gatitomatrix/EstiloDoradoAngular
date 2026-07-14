import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private http = inject(HttpClient);
  private API = environment.apiBaseUrl;

  /** Forward geocoding via backend proxy */
  async searchAddress(query: string): Promise<{ lat: number; lon: number } | null> {
    const params = new HttpParams().set('q', query);
    const res = await firstValueFrom(
      this.http.get<any[]>(`${this.API}/geo/search`, { params })
    ).catch(() => null);
    if (!res?.length) return null;
    return { lat: +res[0].lat, lon: +res[0].lon };
  }

  /** Reverse via backend proxy → ya normalizado por el backend */
  async reverseAddress(lat: number, lon: number): Promise<{
    via?: string; numero?: string;
    distrito?: string; provincia?: string; departamento?: string;
    display?: string;
  } | null> {
    const params = new HttpParams().set('lat', String(lat)).set('lon', String(lon));
    const r = await firstValueFrom(
      this.http.get<{
        via?: string; numero?: string;
        distrito?: string; provincia?: string; departamento?: string;
        display?: string;
      }>(`${this.API}/geo/reverse`, { params })
    ).catch(() => null);
    return r ?? null;
  }
}
