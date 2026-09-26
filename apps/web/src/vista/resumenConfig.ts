// PURO — sin DOM. Arma las filas del resumen "Tu cadena de escucha" (columna
// lateral y paso de revisión de Configurar) a partir de nombres ya
// resueltos: no lee `estado` ni el catálogo, sólo ordena y rotula.
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { textosDe } from '../idioma/idioma.ts';

export interface DatosResumenConfig {
  spk: string | null;
  amp: string | null;
  streamer: string | null;
  dac: string | null;
  /** "3,6 × 5,0 × 2,40 m", ya formateado según el idioma. */
  dimensiones: string;
  /** Nivel de escucha y género musical, ya traducidos ("Alto", "Jazz/Vocal"). */
  nivel: string;
  genero: string;
}

export type ClaveFilaResumen = 'spk' | 'amp' | 'streamer' | 'dac' | 'sala' | 'escucha';

export interface FilaResumen {
  clave: ClaveFilaResumen;
  etiqueta: string;
  valor: string;
  /** true cuando falta elegir el equipo: el valor es el texto "Por seleccionar". */
  vacio: boolean;
}

/** Parlante y amplificador van siempre (son los requeridos); streamer y DAC
 * sólo si se eligieron — un opcional sin elegir no es un dato faltante. */
export function filasResumenConfig(d: DatosResumenConfig, idioma: Idioma): FilaResumen[] {
  const t = textosDe(idioma).config;
  const equipo = (clave: ClaveFilaResumen, etiqueta: string, nombre: string | null): FilaResumen => ({
    clave,
    etiqueta,
    valor: nombre ?? t.pcSinSeleccionar,
    vacio: nombre === null,
  });
  const filas: FilaResumen[] = [equipo('spk', t.parlantes, d.spk), equipo('amp', t.amplificador, d.amp)];
  if (d.streamer !== null) filas.push(equipo('streamer', t.streamer, d.streamer));
  if (d.dac !== null) filas.push(equipo('dac', t.dac, d.dac));
  filas.push({ clave: 'sala', etiqueta: t.pcFilaSala, valor: d.dimensiones, vacio: false });
  filas.push({ clave: 'escucha', etiqueta: t.pcFilaEscucha, valor: `${d.nivel} · ${d.genero}`, vacio: false });
  return filas;
}

/** Se puede pasar de "Equipos" a "Sala y escucha" sólo con los dos requeridos. */
export function requeridosCompletos(d: Pick<DatosResumenConfig, 'spk' | 'amp'>): boolean {
  return d.spk !== null && d.amp !== null;
}
