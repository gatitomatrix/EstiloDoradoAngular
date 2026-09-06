/** Envío: Pasco domicilio S/5 (sin Shalom). Huancayo/Lima–Callao: agencia S/12 + extra domicilio. */
export interface TarifaEnvio {
  costo: number;
  zona: string;
  etiqueta: string;
}

export type ZonaEnvio = 'pasco' | 'huancayo' | 'lima' | 'fuera';
export type TipoEnvio = 'AGENCIA' | 'DOMICILIO';

const COBERTURA = 'Lima – Callao, Huancayo y Pasco';
const HUANCAYO_DISTRITOS = ['CHILCA', 'EL TAMBO', 'HUANCAYO'];

export function cubreEnvio(
  departamento?: string | null,
  provincia?: string | null,
  distrito?: string | null,
): boolean {
  const d = norm(departamento);
  const p = norm(provincia);
  const di = norm(distrito);

  const limaMetro = d.includes('LIMA') && !d.includes('CALLAO') && (!p || p === 'LIMA');
  const callao = d.includes('CALLAO') && (!p || p === 'CALLAO');
  const pasco = d.includes('PASCO') && (!p || p === 'PASCO');
  const huancayo = d.includes('JUNIN') && (!p || p === 'HUANCAYO');

  if (limaMetro || callao || pasco) return true;
  if (huancayo) {
    if (!di) return true;
    return HUANCAYO_DISTRITOS.includes(di);
  }
  return false;
}

export function zonaEnvio(
  departamento?: string | null,
  provincia?: string | null,
  distrito?: string | null,
): ZonaEnvio {
  if (!cubreEnvio(departamento, provincia, distrito)) return 'fuera';
  const d = norm(departamento);
  const p = norm(provincia);
  if (d.includes('PASCO') || p === 'PASCO') return 'pasco';
  if (d.includes('JUNIN') || p === 'HUANCAYO') return 'huancayo';
  return 'lima';
}

export function usaShalom(departamento?: string | null, provincia?: string | null): boolean {
  return zonaEnvio(departamento, provincia) !== 'pasco' && zonaEnvio(departamento, provincia) !== 'fuera';
}

export function extraDomicilio(zona: ZonaEnvio): number {
  if (zona === 'pasco') return 5;
  if (zona === 'huancayo') return 5;
  if (zona === 'lima') return 10;
  return 0;
}

export function costoEnvio(
  departamento?: string | null,
  provincia?: string | null,
  distrito?: string | null,
  tipo: TipoEnvio = 'AGENCIA',
): TarifaEnvio {
  const zona = zonaEnvio(departamento, provincia, distrito);
  if (zona === 'fuera') {
    return { costo: 0, zona, etiqueta: `Fuera de cobertura. Enviamos a ${COBERTURA}` };
  }
  if (zona === 'pasco') {
    return { costo: 5, zona, etiqueta: 'Pasco · domicilio S/ 5 (sin Shalom)' };
  }
  if (tipo === 'AGENCIA') {
    const donde = zona === 'huancayo' ? 'Huancayo' : 'Lima – Callao';
    return { costo: 12, zona, etiqueta: `${donde} · Shalom agencia S/ 12` };
  }
  if (zona === 'huancayo') {
    return { costo: 17, zona, etiqueta: 'Huancayo · Shalom + domicilio S/ 12 + 5' };
  }
  return { costo: 22, zona, etiqueta: 'Lima – Callao · Shalom + domicilio S/ 12 + 10' };
}

export function filtrarProvinciasEnvio(departamento: string, todas: string[]): string[] {
  return todas.filter((p) => cubreEnvio(departamento, p));
}

export function filtrarDistritosEnvio(
  departamento: string,
  provincia: string,
  todas: string[],
): string[] {
  return todas.filter((di) => cubreEnvio(departamento, provincia, di));
}

/** Compat: agencia si hay Shalom, domicilio en Pasco. */
export function estimarEnvio(
  departamento?: string | null,
  provincia?: string | null,
  distrito?: string | null,
): TarifaEnvio {
  const zona = zonaEnvio(departamento, provincia, distrito);
  return costoEnvio(departamento, provincia, distrito, zona === 'pasco' ? 'DOMICILIO' : 'AGENCIA');
}

export const DIRECCION_TIENDA =
  'Prolongación Yauli Nro. S/N Pasco - Pasco – Chaupimarca.';

export const TEXTO_RECOJO = `Retiro en tienda — ${DIRECCION_TIENDA}`;

export function tarifaRecojo(): TarifaEnvio {
  return { costo: 0, zona: 'tienda', etiqueta: 'Recojo en tienda' };
}

export const TEXTO_COBERTURA = `Envíos a ${COBERTURA}. Otras ciudades: recojo en tienda.`;

function norm(s?: string | null): string {
  return (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .trim();
}
