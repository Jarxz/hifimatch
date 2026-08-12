/**
 * Esquema del catálogo curado — la única fuente de datos de equipos del
 * sitio. Reusa `Confianza` de packages/engine/src/tipos.ts (una sola unión,
 * no dos copias que puedan divergir); todo lo demás es propio de esta capa
 * de presentación bilingüe, que el motor nunca ve.
 */
import type { Confianza } from '../../engine/src/tipos.ts';
import type { Localizado } from './idioma.ts';

/**
 * Un dato físico con su cita y confianza, igual disciplina que
 * packages/engine/src/tipos.ts `DatoConFuente<T>` pero con la fuente y la
 * nota localizadas (son prosa, se traducen; el valor y la confianza no).
 */
export interface DatoCitado<T> {
  valor: T;
  fuente: Localizado; // cita corta: "KEF (ficha oficial)" / "KEF (official spec sheet)"
  confianza: Confianza;
  nota?: Localizado; // prosa larga sobre el dato (ej. medición independiente que lo confirma/corrige)
  calificador?: Localizado; // sufijo del chip derivado, ej. "anecoica" / "anechoic"
}

export interface ParlanteCat {
  id: string;
  nombre: string; // nombre de producto — NO se traduce
  tipo: Localizado;
  descripcion: Localizado; // admite <b>…</b>
  sensibilidadDb: DatoCitado<number>; // dB/2.83V·m
  impedanciaNominalOhm: number;
  impedanciaMinOhm: number | null;
  potenciaRecMinW: number | null;
  potenciaRecMaxW: number | null;
  maxSplDb: number | null;
  chipsExtra: readonly Localizado[]; // chips que no se pueden derivar de campos numéricos
  fuentes: readonly string[]; // referencias bibliográficas — NO se traducen
  pendiente?: Localizado; // qué dato falta y por qué, si aplica
}

export interface AmplificadorCat {
  id: string;
  nombre: string;
  tipo: Localizado;
  descripcion: Localizado;
  potencia8OhmW: DatoCitado<number>;
  potencia4OhmW: DatoCitado<number> | null;
  cargaMinOhm: number | null;
  sensEntradaMv: number | null;
  impedanciaEntradaOhm: number | null;
  chipsExtra: readonly Localizado[];
  fuentes: readonly string[];
  pendiente?: Localizado;
}

/**
 * Streamer o DAC — el motor no distingue entre ambos (packages/engine/src
 * /tipos.ts `Fuente`), así que tampoco lo hace el catálogo: una sola lista.
 */
export interface FuenteCat {
  id: string;
  nombre: string;
  tipo: Localizado;
  descripcion: Localizado;
  salidaV: number | null; // tensión de salida analógica, RMS
  impedanciaSalidaOhm: number | null;
  fuente: Localizado; // Fuente lleva un solo par fuente/confianza, no por campo (igual que tipos.ts)
  confianza: Confianza;
  chipsExtra: readonly Localizado[];
  fuentes: readonly string[];
  pendiente?: Localizado;
}

/**
 * Curados con la misma disciplina (fuente + confianza, null en vez de
 * estimar) aunque todavía no exista una regla que los use — ver
 * docs/motor-mvp.md sección 5.
 */
export interface CableCat {
  id: string;
  nombre: string;
  tipo: Localizado;
  descripcion: Localizado;
  calibreAwg: number | null;
  resistenciaOhmM: number;
  capacitanciaPfM: number;
  inductanciaUhM: number;
  fuente: Localizado;
  confianza: Confianza;
  chipsExtra: readonly Localizado[];
  fuentes: readonly string[];
  pendiente?: Localizado;
}

export interface Catalogo {
  parlantes: readonly ParlanteCat[];
  amplificadores: readonly AmplificadorCat[];
  fuentes: readonly FuenteCat[];
  cables: readonly CableCat[];
}
