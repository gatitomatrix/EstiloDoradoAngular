import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  get number(): string {
    return String((environment as { whatsappNumber?: string }).whatsappNumber || '').replace(/\D/g, '');
  }

  get enabled(): boolean {
    const n = this.number;
    return n.length >= 9;
  }

  href(text?: string): string {
    let n = this.number;
    if (n.length === 9 && n.startsWith('9')) n = '51' + n;
    const q = text ? `?text=${encodeURIComponent(text)}` : '';
    return `https://wa.me/${n}${q}`;
  }

  open(text?: string): void {
    if (!this.enabled) return;
    window.open(this.href(text), '_blank', 'noopener,noreferrer');
  }
}
