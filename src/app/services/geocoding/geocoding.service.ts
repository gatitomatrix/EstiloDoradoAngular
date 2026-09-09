import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ReverseHit = {
  via?: string;
  numero?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  display?: string;
};

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private http = inject(HttpClient);
  private API = environment.apiBaseUrl;

  async searchAddress(query: string, bias?: { lat: number; lon: number }): Promise<{ lat: number; lon: number } | null> {
    let params = new HttpParams().set('q', query);
    if (bias) {
      params = params.set('lat', String(bias.lat)).set('lon', String(bias.lon));
    }
    const res = await firstValueFrom(
      this.http.get<any[]>(`${this.API}/geo/search`, { params })
    ).catch(() => null);
    if (res?.length) {
      const lat = +res[0].lat;
      const lon = +res[0].lon;
      if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
    }
    return this.searchDirect(query, bias);
  }

  async reverseAddress(lat: number, lon: number): Promise<ReverseHit | null> {
    const params = new HttpParams().set('lat', String(lat)).set('lon', String(lon));
    const r = await firstValueFrom(
      this.http.get<ReverseHit>(`${this.API}/geo/reverse`, { params })
    ).catch(() => null);
    if (this.usable(r)) return r;
    return this.reverseDirect(lat, lon);
  }

  private usable(r: ReverseHit | null | undefined): r is ReverseHit {
    if (!r) return false;
    const via = (r.via || '').trim();
    const display = (r.display || '').trim();
    if (/^ubicaci[oó]n\s+-?\d/i.test(display)) return false;
    return via.length > 1 || (display.length > 3 && !/^-?\d+(\.\d+)?\s*,\s*-?\d+/.test(display));
  }

  private async searchDirect(query: string, bias?: { lat: number; lon: number }): Promise<{ lat: number; lon: number } | null> {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('countrycodes', 'pe');
      url.searchParams.set('accept-language', 'es');
      url.searchParams.set('q', query);
      const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      if (!res.ok) return this.searchPhoton(query, bias);
      const json = await res.json();
      const first = Array.isArray(json) ? json[0] : null;
      if (first?.lat && first?.lon) return { lat: +first.lat, lon: +first.lon };
    } catch { /* photon */ }
    return this.searchPhoton(query, bias);
  }

  private async searchPhoton(query: string, bias?: { lat: number; lon: number }): Promise<{ lat: number; lon: number } | null> {
    try {
      const url = new URL('https://photon.komoot.io/api/');
      url.searchParams.set('q', query);
      url.searchParams.set('limit', '1');
      url.searchParams.set('lang', 'en');
      if (bias) {
        url.searchParams.set('lat', String(bias.lat));
        url.searchParams.set('lon', String(bias.lon));
      }
      const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      const json = await res.json();
      const c = json?.features?.[0]?.geometry?.coordinates;
      if (Array.isArray(c) && c.length >= 2) return { lat: +c[1], lon: +c[0] };
    } catch { /* ignore */ }
    return null;
  }

  private async reverseDirect(lat: number, lon: number): Promise<ReverseHit | null> {
    const fromNomi = await this.reverseNominatim(lat, lon);
    if (this.usable(fromNomi)) return fromNomi;
    const fromPhoton = await this.reversePhoton(lat, lon);
    return this.usable(fromPhoton) ? fromPhoton : fromNomi || fromPhoton;
  }

  private async reverseNominatim(lat: number, lon: number): Promise<ReverseHit | null> {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('format', 'json');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('zoom', '18');
      url.searchParams.set('accept-language', 'es');
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lon));
      const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      const j = await res.json();
      const a = j?.address || {};
      const via = String(a.road || a.pedestrian || a.residential || a.footway || a.path || j?.name || '').trim();
      const numero = String(a.house_number || '').trim();
      const display = String(j?.display_name || [via, numero, a.suburb, a.city, a.state].filter(Boolean).join(', '));
      return {
        via,
        numero,
        distrito: String(a.city_district || a.suburb || a.town || a.village || a.city || ''),
        provincia: String(a.province || a.county || a.city || ''),
        departamento: String(a.state || a.region || ''),
        display,
      };
    } catch {
      return null;
    }
  }

  private async reversePhoton(lat: number, lon: number): Promise<ReverseHit | null> {
    try {
      const url = new URL('https://photon.komoot.io/reverse');
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lon));
      url.searchParams.set('lang', 'en');
      const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      const p = (await res.json())?.features?.[0]?.properties || {};
      const via = String(p.street || p.name || '').trim();
      const numero = String(p.housenumber || '').trim();
      const parts = [(`${via} ${numero}`).trim(), p.district, p.locality, p.city, p.state, p.country].filter(Boolean);
      return {
        via,
        numero,
        distrito: String(p.district || p.locality || p.city || ''),
        provincia: String(p.city || p.county || ''),
        departamento: String(p.state || ''),
        display: parts.join(', '),
      };
    } catch {
      return null;
    }
  }
}
