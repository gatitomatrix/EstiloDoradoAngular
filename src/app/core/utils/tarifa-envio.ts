/** Estimado tipo Shalom. Cobertura: solo provincia de Lima. */
export interface TarifaEnvio {
  costo: number;
  zona: string;
  etiqueta: string;
}

const COBERTURA = 'Lima (provincia de Lima)';

export function cubreEnvio(departamento?: string | null, provincia?: string | null): boolean {
  const d = norm(departamento);
  const p = norm(provincia);
  if (d.includes('CALLAO') || d.includes('JUNIN') || d.includes('PASCO')) return false;
  if (p && p !== 'LIMA') return false;
  return d.includes('LIMA') || p === 'LIMA';
}

export function filtrarProvinciasEnvio(departamento: string, todas: string[]): string[] {
  return todas.filter((p) => cubreEnvio(departamento, p));
}

export function estimarEnvio(departamento?: string | null, provincia?: string | null): TarifaEnvio {
  if (cubreEnvio(departamento, provincia)) {
    return { costo: 18, zona: 'lima', etiqueta: 'Lima · estimado Shalom' };
  }
  return { costo: 0, zona: 'fuera', etiqueta: `Fuera de cobertura. Enviamos a ${COBERTURA}` };
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
