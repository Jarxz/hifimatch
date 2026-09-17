/**
 * Búsqueda de equipos fuera del catálogo curado — un solo archivo a
 * propósito (mismo motivo que packages/contact/src/contacto.ts: un import
 * relativo interno entre dos archivos queda atrapado entre lo que exige
 * `node --test` en desarrollo y lo que acepta el compilador de Vercel en
 * `/api/**`, dos exigencias contrapuestas confirmadas en producción con
 * `api/contact.ts`. Un solo archivo elimina el punto donde chocarían).
 *
 * Contiene, en este orden:
 *   1. Rangos físicos declarados — la única defensa contra una extracción
 *      absurda, ya que el usuario eligió "sin pantalla de confirmación".
 *   2. Validación por `codigo`, nunca texto armado (misma doctrina que
 *      packages/contact/src/contacto.ts).
 *   3. Construcción de la ficha `ParlanteCat`/`AmplificadorCat`/`FuenteCat`
 *      "no curada" — con confianza 'baja' siempre, id con prefijo
 *      reservado `web:`, y la URL real devuelta por el proveedor como
 *      única entrada de `fuentes` (nunca una cita inventada).
 *   4. `manejarBusqueda()` — orquestación con caché y proveedor
 *      INYECTADOS como dependencias (mismo patrón que `manejarContacto`),
 *      así el flujo completo se testea con `node --test`, sin red ni
 *      credenciales.
 *
 * Un equipo construido acá NUNCA entra a `packages/data/src/catalogo.ts`
 * — vive sólo en el registro en memoria del cliente
 * (`apps/web/src/datos/registroEquipos.ts`) o en la caché del servidor.
 * `packages/data` queda intacto, con sus conteos y tests sin tocar.
 */
import type { Confianza } from '../../engine/src/tipos.ts';
import type { ParlanteCat, AmplificadorCat, FuenteCat } from '../../data/src/tipos-catalogo.ts';
import type { Localizado } from '../../data/src/idioma.ts';

// ── 1. Rangos físicos declarados ───────────────────────────────────────
// Ninguno es un umbral del motor (esos siguen viviendo en packages/engine,
// sin tocar) — son un filtro de sanidad sobre lo que un proveedor de
// búsqueda puede devolver, para descartar una extracción disparatada
// (ej. confundir potencia pico con continua, o mV con V) antes de que
// llegue al veredicto. Declarados como constantes, testeados en el borde.
export const SENSIBILIDAD_MIN_DB = 70;
export const SENSIBILIDAD_MAX_DB = 115;
export const IMPEDANCIA_NOMINAL_MIN_OHM = 1;
export const IMPEDANCIA_NOMINAL_MAX_OHM = 16;
export const IMPEDANCIA_MIN_MIN_OHM = 0.5;
export const IMPEDANCIA_MIN_MAX_OHM = 16;
export const POTENCIA_8OHM_MIN_W = 1;
export const POTENCIA_8OHM_MAX_W = 2000;
export const POTENCIA_4OHM_MIN_W = 1;
export const POTENCIA_4OHM_MAX_W = 3000;
export const CARGA_MIN_MIN_OHM = 0.5;
export const CARGA_MIN_MAX_OHM = 16;
export const SENS_ENTRADA_MIN_MV = 10;
export const SENS_ENTRADA_MAX_MV = 5000;
export const IMPEDANCIA_ENTRADA_MIN_OHM = 1;
export const IMPEDANCIA_ENTRADA_MAX_OHM = 100_000;
export const SALIDA_MIN_V = 0.1;
export const SALIDA_MAX_V = 15;
export const IMPEDANCIA_SALIDA_MIN_OHM = 1;
export const IMPEDANCIA_SALIDA_MAX_OHM = 5000;

/** Prefijo reservado de todo id construido acá — ningún id de
 * `packages/data/src/catalogo.ts` empieza así (test de invariante en
 * apps/web/src/datos/registroEquipos.test.ts, que sí puede importar
 * CATALOGO). */
export const EQUIPO_WEB_PREFIJO = 'web:';

function dentroDe(valor: number, min: number, max: number): boolean {
  return Number.isFinite(valor) && valor >= min && valor <= max;
}

// ── 2. Formas crudas que el proveedor puede devolver ───────────────────
// Sólo números — el `tipo`/`descripcion` bilingües se sintetizan acá
// mismo (plantilla fija por categoría, ver más abajo) en vez de pedirle
// prosa en dos idiomas al proveedor: menos tokens, cero riesgo de que la
// traducción del proveedor sea de mala calidad o mezcle idiomas.
export interface SpecsCrudasParlante {
  sensibilidadDb: number | null;
  impedanciaNominalOhm: number | null;
  impedanciaMinOhm: number | null;
  potenciaRecMinW: number | null;
  potenciaRecMaxW: number | null;
}

export interface SpecsCrudasAmplificador {
  potencia8OhmW: number | null;
  potencia4OhmW: number | null;
  cargaMinOhm: number | null;
  sensEntradaMv: number | null;
  impedanciaEntradaOhm: number | null;
}

export interface SpecsCrudasFuente {
  salidaV: number | null;
  impedanciaSalidaOhm: number | null;
}

export type CategoriaBusqueda = 'parlante' | 'amplificador' | 'streamer' | 'dac';

// ── 3. Validación por código ────────────────────────────────────────────
export type CodigoValidacionParlante =
  | 'ok'
  | 'sensibilidad-faltante'
  | 'sensibilidad-fuera-de-rango'
  | 'impedancia-nominal-faltante'
  | 'impedancia-nominal-fuera-de-rango'
  | 'impedancia-minima-fuera-de-rango'
  | 'potencia-recomendada-fuera-de-rango';

export function validarParlante(s: SpecsCrudasParlante): CodigoValidacionParlante {
  if (s.sensibilidadDb === null) return 'sensibilidad-faltante';
  if (!dentroDe(s.sensibilidadDb, SENSIBILIDAD_MIN_DB, SENSIBILIDAD_MAX_DB)) return 'sensibilidad-fuera-de-rango';
  if (s.impedanciaNominalOhm === null) return 'impedancia-nominal-faltante';
  if (!dentroDe(s.impedanciaNominalOhm, IMPEDANCIA_NOMINAL_MIN_OHM, IMPEDANCIA_NOMINAL_MAX_OHM)) return 'impedancia-nominal-fuera-de-rango';
  if (s.impedanciaMinOhm !== null && !dentroDe(s.impedanciaMinOhm, IMPEDANCIA_MIN_MIN_OHM, IMPEDANCIA_MIN_MAX_OHM)) return 'impedancia-minima-fuera-de-rango';
  if (s.potenciaRecMinW !== null && !dentroDe(s.potenciaRecMinW, POTENCIA_8OHM_MIN_W, POTENCIA_8OHM_MAX_W)) return 'potencia-recomendada-fuera-de-rango';
  if (s.potenciaRecMaxW !== null && !dentroDe(s.potenciaRecMaxW, POTENCIA_8OHM_MIN_W, POTENCIA_8OHM_MAX_W)) return 'potencia-recomendada-fuera-de-rango';
  return 'ok';
}

export type CodigoValidacionAmplificador =
  | 'ok'
  | 'potencia-8ohm-faltante'
  | 'potencia-8ohm-fuera-de-rango'
  | 'potencia-4ohm-fuera-de-rango'
  | 'carga-minima-fuera-de-rango'
  | 'sens-entrada-fuera-de-rango'
  | 'impedancia-entrada-fuera-de-rango';

export function validarAmplificador(s: SpecsCrudasAmplificador): CodigoValidacionAmplificador {
  if (s.potencia8OhmW === null) return 'potencia-8ohm-faltante';
  if (!dentroDe(s.potencia8OhmW, POTENCIA_8OHM_MIN_W, POTENCIA_8OHM_MAX_W)) return 'potencia-8ohm-fuera-de-rango';
  if (s.potencia4OhmW !== null && !dentroDe(s.potencia4OhmW, POTENCIA_4OHM_MIN_W, POTENCIA_4OHM_MAX_W)) return 'potencia-4ohm-fuera-de-rango';
  if (s.cargaMinOhm !== null && !dentroDe(s.cargaMinOhm, CARGA_MIN_MIN_OHM, CARGA_MIN_MAX_OHM)) return 'carga-minima-fuera-de-rango';
  if (s.sensEntradaMv !== null && !dentroDe(s.sensEntradaMv, SENS_ENTRADA_MIN_MV, SENS_ENTRADA_MAX_MV)) return 'sens-entrada-fuera-de-rango';
  if (s.impedanciaEntradaOhm !== null && !dentroDe(s.impedanciaEntradaOhm, IMPEDANCIA_ENTRADA_MIN_OHM, IMPEDANCIA_ENTRADA_MAX_OHM)) return 'impedancia-entrada-fuera-de-rango';
  return 'ok';
}

export type CodigoValidacionFuente = 'ok' | 'salida-fuera-de-rango' | 'impedancia-salida-fuera-de-rango';

/** Fuente (streamer/DAC) no exige ningún numérico — el motor las oculta
 * solas si faltan (mismo mecanismo que ya usa Cambridge CXN V2 en el
 * catálogo real). Sólo se valida lo que sí llegó. */
export function validarFuente(s: SpecsCrudasFuente): CodigoValidacionFuente {
  if (s.salidaV !== null && !dentroDe(s.salidaV, SALIDA_MIN_V, SALIDA_MAX_V)) return 'salida-fuera-de-rango';
  if (s.impedanciaSalidaOhm !== null && !dentroDe(s.impedanciaSalidaOhm, IMPEDANCIA_SALIDA_MIN_OHM, IMPEDANCIA_SALIDA_MAX_OHM)) return 'impedancia-salida-fuera-de-rango';
  return 'ok';
}

// ── Normalización compartida (marca/modelo → id, clave de caché) ──────
function normalizarTexto(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita diacríticos (acentos)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function slug(s: string): string {
  return normalizarTexto(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Clave de caché estable ante may/min, acentos y espacios de más —
 * "Wharfdale" y "wharfdale " deben pegar en la misma entrada. */
export function claveCache(categoria: CategoriaBusqueda, marca: string, modelo: string): string {
  return `${categoria}:${slug(marca)}:${slug(modelo)}`;
}

function idWeb(categoria: CategoriaBusqueda, marca: string, modelo: string): string {
  return `${EQUIPO_WEB_PREFIJO}${categoria}:${slug(marca)}-${slug(modelo)}`;
}

/** Marca y modelo terminan interpolados en HTML sin escapar
 * (`descripcionWeb`, `nombre`) tanto en la tarjeta `.info` del cliente
 * como en cualquier informe futuro — sanear ACÁ, en el único chokepoint
 * por el que pasan los tres `construir*Web`, cierra la inyección en la
 * fuente en vez de tener que acordarse de escapar en cada sitio que
 * renderiza. Mismo criterio defensivo que ya aplica
 * packages/contact/src/contacto.ts (`sanearNombre`) al nombre del
 * formulario de contacto. */
function sanearMarcaModelo(s: string): string {
  return s.replace(/[<>"'&]/g, '').trim().slice(0, 100);
}

/** Cita corta bilingüe — igual rol que "KEF (ficha oficial)" en el
 * catálogo real, pero declarando el origen no curado. Dos variantes,
 * según haya o no una URL real detrás: la búsqueda web SIEMPRE trae una
 * (si no, `manejarBusqueda` nunca llega a construir la ficha — ver
 * `buscarEquipoEnLaWeb`, api/proveedor-busqueda.ts); la ficha manual
 * (tipeada por el usuario, sea porque
 * la búsqueda no encontró nada, la región está restringida, el cupo se
 * agotó, o el sitio corre por `file://` sin red) nunca tiene una. */
function fuenteCita(fuenteUrl: string | null): Localizado {
  if (fuenteUrl) return { es: 'Búsqueda web automática — no verificada', en: 'Automated web search — unverified' };
  return { es: 'Ingresado manualmente por el usuario — no verificado', en: 'Manually entered by the user — unverified' };
}

const CONFIANZA_WEB: Confianza = 'baja';

const TIPO_POR_CATEGORIA: Record<CategoriaBusqueda, Localizado> = {
  parlante: { es: 'Parlante (hallado por búsqueda web, no curado)', en: 'Speaker (found via web search, uncurated)' },
  amplificador: { es: 'Amplificador (hallado por búsqueda web, no curado)', en: 'Amplifier (found via web search, uncurated)' },
  streamer: { es: 'Streamer (hallado por búsqueda web, no curado)', en: 'Streamer (found via web search, uncurated)' },
  dac: { es: 'DAC (hallado por búsqueda web, no curado)', en: 'DAC (found via web search, uncurated)' },
};

function descripcionWeb(marca: string, modelo: string): Localizado {
  return {
    es: `Datos obtenidos automáticamente de la web para ${marca} ${modelo}. No forman parte del catálogo curado del sitio: nadie los revisó a mano, y pueden contener errores de la extracción.`,
    en: `Data obtained automatically from the web for ${marca} ${modelo}. Not part of the site's curated catalog: no one reviewed it by hand, and it may contain extraction errors.`,
  };
}

// ── 3b. Construcción de la ficha — nunca entra a CATALOGO ──────────────
// `fuenteUrl: string | null` — una URL real (búsqueda web) o `null`
// (ficha manual tipeada por el usuario, ver comentario de `fuenteCita`).
export function construirParlanteWeb(marcaCruda: string, modeloCrudo: string, specs: SpecsCrudasParlante, fuenteUrl: string | null): ParlanteCat {
  if (specs.sensibilidadDb === null || specs.impedanciaNominalOhm === null) {
    throw new Error('construirParlanteWeb: llamar sólo tras validarParlante() === "ok"');
  }
  const marca = sanearMarcaModelo(marcaCruda);
  const modelo = sanearMarcaModelo(modeloCrudo);
  return {
    id: idWeb('parlante', marca, modelo),
    marca,
    nombre: `${marca} ${modelo}`.trim(),
    tipo: TIPO_POR_CATEGORIA.parlante,
    descripcion: descripcionWeb(marca, modelo),
    sensibilidadDb: { valor: specs.sensibilidadDb, fuente: fuenteCita(fuenteUrl), confianza: CONFIANZA_WEB },
    sensibilidadConvencion: null, // nunca se asume una convención que el proveedor no declaró explícito
    impedanciaNominalOhm: specs.impedanciaNominalOhm,
    impedanciaMinOhm: specs.impedanciaMinOhm,
    impedanciaMaxOhm: null,
    anguloFaseGrados: null,
    potenciaRecMinW: specs.potenciaRecMinW,
    potenciaRecMaxW: specs.potenciaRecMaxW,
    maxSplDb: null,
    chipsExtra: [],
    fuentes: fuenteUrl ? [fuenteUrl] : [],
  };
}

export function construirAmplificadorWeb(marcaCruda: string, modeloCrudo: string, specs: SpecsCrudasAmplificador, fuenteUrl: string | null): AmplificadorCat {
  if (specs.potencia8OhmW === null) {
    throw new Error('construirAmplificadorWeb: llamar sólo tras validarAmplificador() === "ok"');
  }
  const marca = sanearMarcaModelo(marcaCruda);
  const modelo = sanearMarcaModelo(modeloCrudo);
  const cita = fuenteCita(fuenteUrl);
  return {
    id: idWeb('amplificador', marca, modelo),
    marca,
    nombre: `${marca} ${modelo}`.trim(),
    tipo: TIPO_POR_CATEGORIA.amplificador,
    descripcion: descripcionWeb(marca, modelo),
    potencia8OhmW: { valor: specs.potencia8OhmW, fuente: cita, confianza: CONFIANZA_WEB },
    potencia4OhmW: specs.potencia4OhmW !== null ? { valor: specs.potencia4OhmW, fuente: cita, confianza: CONFIANZA_WEB } : null,
    cargaMinOhm: specs.cargaMinOhm,
    sensEntradaMv: specs.sensEntradaMv,
    impedanciaEntradaOhm: specs.impedanciaEntradaOhm,
    factorAmortiguamiento: null,
    chipsExtra: [],
    fuentes: fuenteUrl ? [fuenteUrl] : [],
  };
}

export function construirFuenteWeb(categoria: 'streamer' | 'dac', marcaCruda: string, modeloCrudo: string, specs: SpecsCrudasFuente, fuenteUrl: string | null): FuenteCat {
  const marca = sanearMarcaModelo(marcaCruda);
  const modelo = sanearMarcaModelo(modeloCrudo);
  return {
    id: idWeb(categoria, marca, modelo),
    marca,
    nombre: `${marca} ${modelo}`.trim(),
    tipo: TIPO_POR_CATEGORIA[categoria],
    descripcion: descripcionWeb(marca, modelo),
    salidaV: specs.salidaV,
    impedanciaSalidaOhm: specs.impedanciaSalidaOhm,
    fuente: fuenteCita(fuenteUrl),
    confianza: CONFIANZA_WEB,
    chipsExtra: [],
    fuentes: fuenteUrl ? [fuenteUrl] : [],
  };
}

// ── 4. Orquestación con proveedor + caché inyectados ───────────────────
export type EquipoWeb = ParlanteCat | AmplificadorCat | FuenteCat;

export type SpecsCrudas = SpecsCrudasParlante | SpecsCrudasAmplificador | SpecsCrudasFuente;

export interface SolicitudBusqueda {
  categoria: CategoriaBusqueda;
  marca: string;
  modelo: string;
}

export type ResultadoProveedor =
  | { ok: true; specs: SpecsCrudas; fuenteUrl: string }
  | { ok: false; codigo: 'proveedor-error' | 'sin-resultado' | 'cupo-agotado' };

export interface CacheEquipoBuscado {
  get(clave: string): Promise<EquipoWeb | null>;
  set(clave: string, equipo: EquipoWeb): Promise<void>;
}

export interface DependenciasBusqueda {
  cache: CacheEquipoBuscado;
  buscarEnProveedor(solicitud: SolicitudBusqueda): Promise<ResultadoProveedor>;
}

export type CodigoResultadoBusqueda = 'proveedor-error' | 'sin-resultado' | 'cupo-agotado' | 'datos-insuficientes';

export type ResultadoBusqueda = { ok: true; equipo: EquipoWeb; cacheado: boolean } | { ok: false; codigo: CodigoResultadoBusqueda };

/**
 * Igual estructura que `manejarContacto` (packages/contact/src/contacto.ts):
 * `codigo`, nunca texto armado; proveedor y caché inyectados, así el flujo
 * completo corre bajo `node --test` con fakes, sin red ni credenciales.
 * El geo-gate y el límite por IP/cupo diario NO viven acá — son chequeos
 * de infraestructura (headers de la request, contador en Upstash) que
 * corren en el adaptador (api/buscar-equipo.ts) ANTES de llamar a esta
 * función; acá sólo se orquesta caché → proveedor → validación → caché.
 */
export async function manejarBusqueda(solicitud: SolicitudBusqueda, deps: DependenciasBusqueda): Promise<ResultadoBusqueda> {
  const marca = solicitud.marca.trim();
  const modelo = solicitud.modelo.trim();
  const clave = claveCache(solicitud.categoria, marca, modelo);

  const cacheado = await deps.cache.get(clave);
  if (cacheado) return { ok: true, equipo: cacheado, cacheado: true };

  const resultado = await deps.buscarEnProveedor({ categoria: solicitud.categoria, marca, modelo });
  if (!resultado.ok) return { ok: false, codigo: resultado.codigo };

  const equipo = validarYConstruir(solicitud.categoria, marca, modelo, resultado.specs, resultado.fuenteUrl);
  if (!equipo) return { ok: false, codigo: 'datos-insuficientes' };

  await deps.cache.set(clave, equipo);
  return { ok: true, equipo, cacheado: false };
}

function validarYConstruir(categoria: CategoriaBusqueda, marca: string, modelo: string, specs: SpecsCrudas, fuenteUrl: string): EquipoWeb | null {
  if (categoria === 'parlante') {
    const s = specs as SpecsCrudasParlante;
    if (validarParlante(s) !== 'ok') return null;
    return construirParlanteWeb(marca, modelo, s, fuenteUrl);
  }
  if (categoria === 'amplificador') {
    const s = specs as SpecsCrudasAmplificador;
    if (validarAmplificador(s) !== 'ok') return null;
    return construirAmplificadorWeb(marca, modelo, s, fuenteUrl);
  }
  const s = specs as SpecsCrudasFuente;
  if (validarFuente(s) !== 'ok') return null;
  return construirFuenteWeb(categoria, marca, modelo, s, fuenteUrl);
}
