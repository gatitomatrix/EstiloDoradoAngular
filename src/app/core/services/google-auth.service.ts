import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

declare const google: any;

export interface GoogleTokens {
  id_token?: string;
  access_token?: string;
}

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  readonly clientId = ((environment as any).googleClientId || '').trim();

  get configured(): boolean {
    return this.clientId.length > 10;
  }

  /** Abre el selector de cuentas de Google (internet). */
  async signIn(): Promise<GoogleTokens> {
    if (!this.configured) {
      throw new Error('NO_CLIENT_ID');
    }
    await this.loadGis();
    return new Promise((resolve, reject) => {
      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: 'openid email profile',
          prompt: 'select_account',
          callback: (resp: any) => {
            if (resp?.access_token) {
              resolve({ access_token: resp.access_token });
              return;
            }
            reject(new Error(resp?.error || 'Sin token de Google'));
          },
          error_callback: (err: any) => {
            reject(new Error(err?.message || err?.type || 'Google cancelado'));
          },
        });
        client.requestAccessToken();
      } catch (e) {
        reject(e);
      }
    });
  }

  private loadGis(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google?.accounts?.oauth2) {
        resolve();
        return;
      }
      const existing = document.getElementById('gis-script') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('GIS')));
        return;
      }
      const s = document.createElement('script');
      s.id = 'gis-script';
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('No se cargó Google. ¿Hay internet?'));
      document.head.appendChild(s);
    });
  }
}
