/** Estimado tipo Shalom. Cobertura: Lima Metropolitana, Callao, Pasco y Huancayo (3 distritos). */
export interface TarifaEnvio {
  costo: number;
  zona: string;
  etiqueta: string;
}

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

export function estimarEnvio(
  departamento?: string | null,
  provincia?: string | null,
  distrito?: string | null,
): TarifaEnvio {
  const d = norm(departamento);
  const p = norm(provincia);
  if (!cubreEnvio(departamento, provincia, distrito)) {
    return { costo: 0, zona: 'fuera', etiqueta: `Fuera de cobertura. Enviamos a ${COBERTURA}` };
  }
  if (d.includes('JUNIN') || p === 'HUANCAYO') {
    return { costo: 8, zona: 'huancayo', etiqueta: 'Huancayo · S/ 8' };
  }
  if (d.includes('PASCO') || p === 'PASCO') {
    return { costo: 4, zona: 'pasco', etiqueta: 'Pasco local · S/ 4' };
  }
  return { costo: 10, zona: 'lima', etiqueta: 'Lima – Callao · S/ 10' };
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
