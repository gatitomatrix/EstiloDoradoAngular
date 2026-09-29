import { environment } from '../../../environments/environment';

/** WhatsApp de la tienda (9 dígitos). Se usa en el botón de ayuda. */
export function celularTienda(): string {
  let d = String((environment as { whatsappNumber?: string }).whatsappNumber || '51916464315').replace(/\D/g, '');
  if (d.startsWith('51') && d.length >= 11) d = d.slice(2);
  d = d.slice(0, 9);
  return /^9\d{8}$/.test(d) ? d : '916464315';
}

/** 9 dígitos que empiezan en 9, o vacío.
 *  No se descarta el número de la tienda: el dueño puede usarlo para comprar. */
export function celularCliente(raw?: string | null): string {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('51') && d.length >= 11) d = d.slice(2);
  d = d.slice(0, 9);
  if (!/^9\d{8}$/.test(d)) return '';
  return d;
}

export function celularFmt(raw?: string | null): string {
  const d = celularCliente(raw);
  return d ? `+51 ${d}` : '';
}

export function waCliente(raw?: string | null, text?: string): string {
  const d = celularCliente(raw);
  if (!d) return '';
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/51${d}${q}`;
}

/** "pagado" → "Pagado", "tarjeta" → "Tarjeta". */
export function etiqueta(raw?: string | null): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  return s.charAt(0).toLocaleUpperCase('es-PE') + s.slice(1);
}
