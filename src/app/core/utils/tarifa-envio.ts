/** Estimado tipo Shalom desde Huancayo. No es cotización en vivo. */
export interface TarifaEnvio {
  costo: number;
  zona: string;
  etiqueta: string;
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
  if (d.includes('LIMA') || d.includes('CALLAO') || p.includes('CALLAO') || p.includes('LIMA')) {
    return { costo: 18, zona: 'lima', etiqueta: 'Lima / Callao · estimado Shalom' };
  }
  return { costo: 25, zona: 'resto', etiqueta: 'Resto del Perú · estimado Shalom' };
}

export function tarifaRecojo(): TarifaEnvio {
  return { costo: 0, zona: 'tienda', etiqueta: 'Recojo en tienda' };
}

function norm(s?: string | null): string {
  return (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .trim();
}
