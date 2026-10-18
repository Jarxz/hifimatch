// PURO — sin DOM. "Mis sistemas": configuraciones guardadas en el navegador
// (localStorage), sin cuenta ni sincronización. Sólo se guarda lo que se puede
// volver a resolver mañana: ids del catálogo curado y las medidas/elecciones de
// la sala. Un equipo hallado por búsqueda web o ingresado a mano (ids `web:` /
// `manual:`) NO se guarda — vive en memoria y no habría cómo reconstruirlo — y
// el código lo declara en vez de guardar un id huérfano.
//
// Lo leído del almacenamiento se trata como no confiable (pudo editarlo una
// extensión o venir de otra versión): cada campo se revalida y lo inválido se
// descarta, nunca se "repara" con un valor por defecto en silencio.
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';
import { ABSORCION_MURO_BANDAS, ABSORCION_PISO_BANDAS, ABSORCION_TECHO_BANDAS } from '../../../../packages/engine/src/reverberacion.ts';
import { CREST_FACTOR_DB } from '../../../../packages/engine/src/genero.ts';
import { validarDimension } from '../vista/dimensiones.ts';
import type { NivelUI } from '../estado.ts';

export const CLAVE_ALMACEN = 'cadena.sistemas';
export const VERSION_ALMACEN = 1;
export const MAX_SISTEMAS = 30;
export const LARGO_MAX_NOMBRE = 80;

export interface ConfiguracionGuardada {
  spk: string;
  amp: string;
  streamer: string | null;
  dac: string | null;
  W: number;
  L: number;
  H: number;
  lvl: NivelUI;
  genero: string;
  muroFrontal: string;
  muroPosterior: string;
  muroIzquierdo: string;
  muroDerecho: string;
  piso: string;
  techo: string;
}

export interface SistemaGuardado {
  id: string;
  nombre: string;
  guardadoEn: number; // ms desde epoch
  config: ConfiguracionGuardada;
}

/** Lo mínimo de `Storage` que se usa — permite probar sin navegador. */
export interface AlmacenLike {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
}

export type CodigoGuardado = 'nombre-vacio' | 'sin-equipos' | 'equipo-fuera-de-catalogo' | 'almacen-bloqueado' | 'limite-alcanzado';

export type ResultadoGuardado = { ok: true; sistemas: SistemaGuardado[] } | { ok: false; codigo: CodigoGuardado };

const NIVELES: readonly NivelUI[] = ['mod', 'alto', 'ref'];

const ids = (lista: readonly { id: string }[]): Set<string> => new Set(lista.map((x) => x.id));
const IDS = {
  spk: ids(CATALOGO.parlantes),
  amp: ids(CATALOGO.amplificadores),
  streamer: ids(CATALOGO.streamers),
  dac: ids(CATALOGO.dacs),
};

/** Nombre listo para guardar: sin espacios de más y acotado; `null` si queda vacío. */
export function sanearNombre(entrada: string): string | null {
  const limpio = entrada.replace(/\s+/g, ' ').trim().slice(0, LARGO_MAX_NOMBRE).trim();
  return limpio === '' ? null : limpio;
}

function esNumero(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Revalida una configuración leída del almacenamiento: `null` si cualquier
 * campo no es válido. Los ids deben existir HOY en el catálogo curado. */
export function validarConfiguracion(x: unknown): ConfiguracionGuardada | null {
  if (typeof x !== 'object' || x === null) return null;
  const c = x as Record<string, unknown>;
  const opcional = (v: unknown, conjunto: Set<string>): string | null | undefined =>
    v === null ? null : typeof v === 'string' && conjunto.has(v) ? v : undefined;

  if (typeof c.spk !== 'string' || !IDS.spk.has(c.spk)) return null;
  if (typeof c.amp !== 'string' || !IDS.amp.has(c.amp)) return null;
  const streamer = opcional(c.streamer, IDS.streamer);
  const dac = opcional(c.dac, IDS.dac);
  if (streamer === undefined || dac === undefined) return null;

  if (!esNumero(c.W) || !esNumero(c.L) || !esNumero(c.H)) return null;
  if (validarDimension('W', c.W) !== 'ok' || validarDimension('L', c.L) !== 'ok' || validarDimension('H', c.H) !== 'ok') return null;

  if (typeof c.lvl !== 'string' || !NIVELES.includes(c.lvl as NivelUI)) return null;
  if (typeof c.genero !== 'string' || !(c.genero in CREST_FACTOR_DB)) return null;

  const muro = (v: unknown): v is string => typeof v === 'string' && v in ABSORCION_MURO_BANDAS;
  if (!muro(c.muroFrontal) || !muro(c.muroPosterior) || !muro(c.muroIzquierdo) || !muro(c.muroDerecho)) return null;
  if (typeof c.piso !== 'string' || !(c.piso in ABSORCION_PISO_BANDAS)) return null;
  if (typeof c.techo !== 'string' || !(c.techo in ABSORCION_TECHO_BANDAS)) return null;

  return {
    spk: c.spk,
    amp: c.amp,
    streamer,
    dac,
    W: c.W,
    L: c.L,
    H: c.H,
    lvl: c.lvl as NivelUI,
    genero: c.genero,
    muroFrontal: c.muroFrontal,
    muroPosterior: c.muroPosterior,
    muroIzquierdo: c.muroIzquierdo,
    muroDerecho: c.muroDerecho,
    piso: c.piso,
    techo: c.techo,
  };
}

/** Lo que `main.ts` tiene en `estado` (estructural: no importa el módulo). */
export type EstadoGuardable = {
  spk: string | null;
  amp: string | null;
  streamer: string | null;
  dac: string | null;
  W: number;
  L: number;
  H: number;
  lvl: NivelUI;
  genero: string;
  muroFrontal: string;
  muroPosterior: string;
  muroIzquierdo: string;
  muroDerecho: string;
  piso: string;
  techo: string;
};

/** Toma la configuración actual o dice por qué no se puede guardar. Un equipo
 * fuera del catálogo curado no se guarda (ver cabecera). */
export function configDesdeEstado(e: EstadoGuardable): { ok: true; config: ConfiguracionGuardada } | { ok: false; codigo: 'sin-equipos' | 'equipo-fuera-de-catalogo' } {
  if (!e.spk || !e.amp) return { ok: false, codigo: 'sin-equipos' };
  const config = validarConfiguracion({ ...e });
  return config ? { ok: true, config } : { ok: false, codigo: 'equipo-fuera-de-catalogo' };
}

/** Lista guardada, revalidada y acotada; cualquier fallo de lectura → lista vacía. */
export function leerSistemas(almacen: AlmacenLike | null): SistemaGuardado[] {
  if (!almacen) return [];
  let crudo: unknown;
  try {
    const texto = almacen.getItem(CLAVE_ALMACEN);
    if (texto === null) return [];
    crudo = JSON.parse(texto);
  } catch {
    return [];
  }
  if (typeof crudo !== 'object' || crudo === null) return [];
  const raiz = crudo as { version?: unknown; sistemas?: unknown };
  if (raiz.version !== VERSION_ALMACEN || !Array.isArray(raiz.sistemas)) return [];
  const validos: SistemaGuardado[] = [];
  for (const item of raiz.sistemas) {
    if (typeof item !== 'object' || item === null) continue;
    const s = item as Record<string, unknown>;
    const nombre = typeof s.nombre === 'string' ? sanearNombre(s.nombre) : null;
    const config = validarConfiguracion(s.config);
    if (typeof s.id !== 'string' || s.id === '' || !nombre || !esNumero(s.guardadoEn) || !config) continue;
    if (validos.some((v) => v.id === s.id)) continue;
    validos.push({ id: s.id, nombre, guardadoEn: s.guardadoEn, config });
    if (validos.length === MAX_SISTEMAS) break;
  }
  return validos;
}

/** `false` si el navegador no dejó escribir (almacenamiento bloqueado o lleno). */
export function escribirSistemas(almacen: AlmacenLike | null, sistemas: readonly SistemaGuardado[]): boolean {
  if (!almacen) return false;
  try {
    almacen.setItem(CLAVE_ALMACEN, JSON.stringify({ version: VERSION_ALMACEN, sistemas }));
    return true;
  } catch {
    return false;
  }
}

export function crearId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return c?.randomUUID ? c.randomUUID() : `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Agrega un sistema al principio (más reciente primero) y lo persiste.
 * No descarta nada en silencio: pasado el tope, pide eliminar uno. */
export function guardarSistema(
  almacen: AlmacenLike | null,
  actuales: readonly SistemaGuardado[],
  nombre: string,
  config: ConfiguracionGuardada,
  ahoraMs: number,
  id: string = crearId()
): ResultadoGuardado {
  const limpio = sanearNombre(nombre);
  if (!limpio) return { ok: false, codigo: 'nombre-vacio' };
  if (actuales.length >= MAX_SISTEMAS) return { ok: false, codigo: 'limite-alcanzado' };
  const sistemas = [{ id, nombre: limpio, guardadoEn: ahoraMs, config }, ...actuales];
  return escribirSistemas(almacen, sistemas) ? { ok: true, sistemas } : { ok: false, codigo: 'almacen-bloqueado' };
}

export function eliminarSistema(almacen: AlmacenLike | null, actuales: readonly SistemaGuardado[], id: string): ResultadoGuardado {
  const sistemas = actuales.filter((s) => s.id !== id);
  return escribirSistemas(almacen, sistemas) ? { ok: true, sistemas } : { ok: false, codigo: 'almacen-bloqueado' };
}
