/** Estimado tipo Shalom desde Huancayo. Cobertura: Lima, Callao, Junín y Pasco. */
export interface TarifaEnvio {
  costo: number;
  zona: string;
  etiqueta: string;
}

const COBERTURA = 'Lima, Callao, Junín (Huancayo) y Pasco (Cerro de Pasco)';

export function cubreEnvio(departamento?: string | null, provincia?: string | null): boolean {
  const d = norm(departamento);
  const p = norm(provincia);
  if (p.includes('HUANCAYO') || p.includes('CERRO DE PASCO')) return true;
  if (d.includes('JUNIN') || d.includes('LIMA') || d.includes('CALLAO') || d.includes('PASCO')) return true;
  return false;
}

export function estimarEnvio(departamento?: string | null, provincia?: string | null): TarifaEnvio {
  const d = norm(departamento);
  const p = norm(provincia);

  if (p.includes('HUANCAYO')) {
    return { costo: 8, zona: 'huancayo', etiqueta: 'Huancayo (misma ciudad) · estimado Shalom' };
  }
  if (d.includes('JUNIN')) {
    return { costo: 12, zona: 'junin', etiqueta: 'Junín (otras provincias) · estimado Shalom' };
  }
  if (d.includes('PASCO') || p.includes('CERRO DE PASCO') || p.includes('PASCO')) {
    return { costo: 14, zona: 'pasco', etiqueta: 'Pasco / Cerro de Pasco · estimado Shalom' };
  }
  if (d.includes('LIMA') || d.includes('CALLAO') || p.includes('CALLAO') || p.includes('LIMA')) {
    return { costo: 18, zona: 'lima', etiqueta: 'Lima / Callao · estimado Shalom' };
  }
  return { costo: 0, zona: 'fuera', etiqueta: `Fuera de cobertura. Enviamos a ${COBERTURA}` };
}

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
