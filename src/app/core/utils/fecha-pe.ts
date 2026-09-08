/** Fechas en pantalla: 07 sep 2026 (español). La API sigue en ISO. */
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

function toLimaDate(raw: string): Date | null {
  const s = String(raw).trim();
  if (!s) return null;
  let iso = s;
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
    iso = s.replace(' ', 'T') + '-05:00';
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    iso = s + 'T12:00:00-05:00';
  }
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function formatFechaPe(raw?: string | Date | null, conHora = false): string {
  if (raw == null || raw === '') return '—';
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return '—';
    return formatParts(raw, conHora);
  }
  const d = toLimaDate(String(raw));
  if (!d) return String(raw);
  return formatParts(d, conHora);
}

export function formatFechaHoraPe(raw?: string | Date | null): string {
  return formatFechaPe(raw, true);
}

function formatParts(d: Date, conHora: boolean): string {
  const parts = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value || '';
  const mesNum = Math.max(1, Math.min(12, parseInt(g('month'), 10) || 1));
  const mes = MESES[mesNum - 1];
  const base = `${g('day')} ${mes} ${g('year')}`;
  if (!conHora) return base;
  const h = g('hour');
  const min = g('minute');
  if (!h) return base;
  return `${base}, ${h}:${min}`;
}
