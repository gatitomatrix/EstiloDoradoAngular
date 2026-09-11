import { environment } from '../../../environments/environment';

/** WhatsApp de la tienda (9 dígitos). Nunca se usa como celular del cliente. */
export function celularTienda(): string {
  let d = String((environment as { whatsappNumber?: string }).whatsappNumber || '51916464315').replace(/\D/g, '');
  if (d.startsWith('51') && d.length >= 11) d = d.slice(2);
  d = d.slice(0, 9);
  return /^9\d{8}$/.test(d) ? d : '916464315';
}

/** 9 dígitos que empiezan en 9, o vacío. Descarta el número de la tienda. */
export function celularCliente(raw?: string | null): string {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('51') && d.length >= 11) d = d.slice(2);
  d = d.slice(0, 9);
  if (!/^9\d{8}$/.test(d)) return '';
  if (d === celularTienda()) return '';
  return d;
}
