export interface AgenciaShalom {
  id: string;
  nombre: string;
  direccion: string;
  distrito: string;
  provincia: string;
  departamento: string;
}

export interface ResultadoAgencias {
  agencias: AgenciaShalom[];
  exacto: boolean;
  distritoPedido: string;
  distritoSugerido: string | null;
}

function n(s?: string | null): string {
  return (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .trim();
}

/** Oficinas Shalom de cobertura (Lima Metropolitana, Callao, Huancayo). No incluir Pasco. */
export const AGENCIAS_SHALOM: AgenciaShalom[] = [
  // Huancayo
  { id: 'hyo-ica', nombre: 'Shalom Jr. Ica', direccion: 'Jr. Ica 1143', distrito: 'Huancayo', provincia: 'Huancayo', departamento: 'Junín' },
  { id: 'hyo-andes', nombre: 'Shalom Terminal Los Andes', direccion: 'Av. Ferrocarril S/N, Counter 14', distrito: 'Huancayo', provincia: 'Huancayo', departamento: 'Junín' },
  { id: 'hyo-sancarlos', nombre: 'Shalom San Carlos', direccion: 'Pj. San Fernando 209', distrito: 'Huancayo', provincia: 'Huancayo', departamento: 'Junín' },
  { id: 'hyo-chilca', nombre: 'Shalom Chilca', direccion: 'Jr. 28 de Julio 935', distrito: 'Chilca', provincia: 'Huancayo', departamento: 'Junín' },
  { id: 'hyo-castilla', nombre: 'Shalom Mariscal Castilla', direccion: 'Av. Mariscal Castilla 2769', distrito: 'El Tambo', provincia: 'Huancayo', departamento: 'Junín' },
  { id: 'hyo-piopata', nombre: 'Shalom Pio Pata', direccion: 'Av. Huancavelica 1201', distrito: 'El Tambo', provincia: 'Huancayo', departamento: 'Junín' },
  { id: 'hyo-circun', nombre: 'Shalom Circunvalación', direccion: 'Av. Circunvalación 480', distrito: 'El Tambo', provincia: 'Huancayo', departamento: 'Junín' },

  // Callao
  { id: 'cal-saenz', nombre: 'Shalom Callao Sáenz Peña', direccion: 'Av. Sáenz Peña 164', distrito: 'Callao', provincia: 'Callao', departamento: 'Callao' },
  { id: 'cal-bellavista', nombre: 'Shalom Bellavista', direccion: 'Av. Oscar R. Benavides 3860', distrito: 'Bellavista', provincia: 'Callao', departamento: 'Callao' },
  { id: 'cal-ventanilla', nombre: 'Shalom Ventanilla', direccion: 'Av. Néstor Gambetta km 14.5', distrito: 'Ventanilla', provincia: 'Callao', departamento: 'Callao' },
  { id: 'cal-perla', nombre: 'Shalom La Perla', direccion: 'Av. Costanera 1450', distrito: 'La Perla', provincia: 'Callao', departamento: 'Callao' },
  { id: 'cal-faucett', nombre: 'Shalom Carmen de la Legua', direccion: 'Av. Elmer Faucett 2095', distrito: 'Carmen de la Legua Reynoso', provincia: 'Callao', departamento: 'Callao' },
  { id: 'cal-miperu', nombre: 'Shalom Mi Perú', direccion: 'Av. 200 Millas', distrito: 'Mi Perú', provincia: 'Callao', departamento: 'Callao' },

  // Lima Metropolitana (1–2 por distrito con agencia conocida)
  { id: 'lim-lima1', nombre: 'Shalom Cercado Tingo María', direccion: 'Av. Tingo María 1252-A', distrito: 'Lima', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-lima2', nombre: 'Shalom Nicolás Dueñas', direccion: 'Av. Nicolás Dueñas 584', distrito: 'Lima', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-ate1', nombre: 'Shalom Ate Esperanza', direccion: 'Av. Esperanza Mz. K Lt. 6', distrito: 'Ate', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-sjl1', nombre: 'Shalom SJL Zárate', direccion: 'Av. Malecón Checa 167', distrito: 'San Juan de Lurigancho', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-smp1', nombre: 'Shalom SMP Bertello', direccion: 'Av. Alejandro Bertello', distrito: 'San Martín de Porres', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-olivos1', nombre: 'Shalom Los Olivos Huandoy', direccion: 'Av. Huandoy con Av. Central', distrito: 'Los Olivos', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-comas1', nombre: 'Shalom Comas Universitaria', direccion: 'Av. Universitaria 7241', distrito: 'Comas', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-carabayllo1', nombre: 'Shalom Carabayllo Túpac Amaru', direccion: 'Av. Túpac Amaru km 19', distrito: 'Carabayllo', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-pp1', nombre: 'Shalom Puente Piedra', direccion: 'Av. Buenos Aires', distrito: 'Puente Piedra', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-indep1', nombre: 'Shalom Independencia', direccion: 'Av. Túpac Amaru 4708', distrito: 'Independencia', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-molina1', nombre: 'Shalom La Molina Fontana', direccion: 'Av. La Fontana 440', distrito: 'La Molina', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-sjm1', nombre: 'Shalom SJM Atocongo', direccion: 'Av. Los Héroes 228', distrito: 'San Juan de Miraflores', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-vmt1', nombre: 'Shalom VMT Lima', direccion: 'Av. Lima 2208, José Gálvez', distrito: 'Villa María del Triunfo', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-ves1', nombre: 'Shalom Villa El Salvador', direccion: 'Av. 1° de Mayo, sector 1', distrito: 'Villa El Salvador', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-chorrillos1', nombre: 'Shalom Chorrillos', direccion: 'Av. Santa Anita 580', distrito: 'Chorrillos', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-surco1', nombre: 'Shalom Surco Higuereta', direccion: 'Calle Barlovento 134', distrito: 'Santiago de Surco', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-victoria1', nombre: 'Shalom La Victoria México', direccion: 'Av. México 1125', distrito: 'La Victoria', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-brena1', nombre: 'Shalom Breña Venezuela', direccion: 'Av. Venezuela 1670', distrito: 'Breña', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-agustino1', nombre: 'Shalom El Agustino', direccion: 'Av. 1° de Mayo 3071', distrito: 'El Agustino', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-jm1', nombre: 'Shalom Jesús María', direccion: 'Av. Mariscal Luzuriaga 584', distrito: 'Jesús María', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-lince1', nombre: 'Shalom Lince José Leal', direccion: 'Av. José Leal 648', distrito: 'Lince', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-pl1', nombre: 'Shalom Pueblo Libre Bolívar', direccion: 'Av. Bolívar 1097', distrito: 'Pueblo Libre', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-rimac1', nombre: 'Shalom Rímac Amancaes', direccion: 'Av. Amancaes 644', distrito: 'Rímac', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-sb1', nombre: 'Shalom San Borja Angamos', direccion: 'Av. Angamos Este 2521', distrito: 'San Borja', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-mira1', nombre: 'Shalom Miraflores', direccion: 'Av. Petit Thouars 4799', distrito: 'Miraflores', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-smiguel1', nombre: 'Shalom San Miguel La Marina', direccion: 'Av. La Marina 2100', distrito: 'San Miguel', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-mag1', nombre: 'Shalom Magdalena del Mar', direccion: 'Jr. Ayacucho 756', distrito: 'Magdalena del Mar', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-surquillo1', nombre: 'Shalom Surquillo Angamos', direccion: 'Av. Angamos Oeste 1100', distrito: 'Surquillo', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-santaanita1', nombre: 'Shalom Santa Anita', direccion: 'Av. Los Eucaliptos', distrito: 'Santa Anita', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-chosica1', nombre: 'Shalom Chosica', direccion: 'El Sol 124, Parque Echenique', distrito: 'Lurigancho', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-lurin1', nombre: 'Shalom Lurín', direccion: 'Antigua Panamericana Sur km 37', distrito: 'Lurín', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-pacha1', nombre: 'Shalom Pachacámac Manchay', direccion: 'Av. Prolongación La Molina', distrito: 'Pachacámac', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-ancon1', nombre: 'Shalom Ancón', direccion: 'Av. Micaela Bastidas', distrito: 'Ancón', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-chacla1', nombre: 'Shalom Chaclacayo', direccion: 'Av. Nicolás Ayllón', distrito: 'Chaclacayo', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-ciene1', nombre: 'Shalom Cieneguilla', direccion: 'Av. Nueva Toledo', distrito: 'Cieneguilla', provincia: 'Lima', departamento: 'Lima' },
  { id: 'lim-srosa1', nombre: 'Shalom Santa Rosa', direccion: 'Av. Santa Rosa', distrito: 'Santa Rosa', provincia: 'Lima', departamento: 'Lima' },
];

const VECINOS: Record<string, string[]> = {
  'SAN ISIDRO': ['MIRAFLORES', 'SAN BORJA', 'MAGDALENA DEL MAR', 'LINCE', 'SURQUILLO'],
  'BARRANCO': ['CHORRILLOS', 'MIRAFLORES', 'SANTIAGO DE SURCO'],
  'SAN LUIS': ['LA VICTORIA', 'SAN BORJA', 'ATE', 'SANTA ANITA'],
  'LA PUNTA': ['LA PERLA', 'CALLAO', 'BELLAVISTA'],
  'PUNTA HERMOSA': ['LURIN', 'PUNTA NEGRA', 'SAN BARTOLO'],
  'PUNTA NEGRA': ['PUNTA HERMOSA', 'SAN BARTOLO', 'LURIN'],
  'SAN BARTOLO': ['PUNTA NEGRA', 'SANTA MARIA DEL MAR', 'LURIN'],
  'SANTA MARIA DEL MAR': ['SAN BARTOLO', 'PUNTA HERMOSA', 'LURIN'],
  'PUCUSANA': ['SAN BARTOLO', 'LURIN', 'PUNTA HERMOSA'],
  'MI PERU': ['VENTANILLA', 'CALLAO'],
};

function sameZona(a: AgenciaShalom, dep: string, prov: string): boolean {
  const d = n(dep);
  const p = n(prov);
  const ad = n(a.departamento);
  const ap = n(a.provincia);
  if (d.includes('CALLAO') || p === 'CALLAO') {
    return ad.includes('CALLAO') || ap === 'CALLAO';
  }
  if (d.includes('JUNIN') || p === 'HUANCAYO') {
    return ad.includes('JUNIN') || ap === 'HUANCAYO';
  }
  return ad.includes('LIMA') && !ad.includes('CALLAO');
}

export function buscarAgenciasShalom(
  departamento?: string | null,
  provincia?: string | null,
  distrito?: string | null,
): ResultadoAgencias {
  const dist = n(distrito);
  const zona = AGENCIAS_SHALOM.filter((a) => sameZona(a, departamento || '', provincia || ''));
  const exactas = dist ? zona.filter((a) => n(a.distrito) === dist) : [];
  if (exactas.length) {
    return { agencias: exactas, exacto: true, distritoPedido: distrito || '', distritoSugerido: null };
  }
  for (const vecino of VECINOS[dist] || []) {
    const found = zona.filter((a) => n(a.distrito) === vecino);
    if (found.length) {
      return {
        agencias: found,
        exacto: false,
        distritoPedido: distrito || '',
        distritoSugerido: found[0].distrito,
      };
    }
  }
  return {
    agencias: zona.slice(0, 6),
    exacto: false,
    distritoPedido: distrito || '',
    distritoSugerido: zona[0]?.distrito || null,
  };
}
