/**
 * Los dos únicos archivos que conocen proveedores externos — aislados a
 * propósito para que cambiar de proveedor sea sustituir este archivo,
 * no rehacer `packages/buscador` ni el resto del flujo.
 *
 * DOS proveedores, no uno — decisión forzada por una prueba real, no de
 * estilo. El diseño original usaba sólo Gemini: una llamada con
 * `google_search` (grounding) para buscar, otra con `responseSchema`
 * para extraer. Verificado en vivo con una clave real de un proyecto
 * nuevo: **`google_search` devuelve 429 RESOURCE_EXHAUSTED en cualquier
 * modelo (2.5, 3.5, 3.6), sin haber hecho una sola búsqueda antes** —
 * confirmado que no es un problema de esta cuenta ni de este código: es
 * un problema abierto y reportado por múltiples desarrolladores en el
 * foro oficial de Google (discuss.ai.google.dev, "Google Search
 * grounding is broken", septiembre 2026), incluso con facturación
 * habilitada. Reemplazado por:
 *   1) **Tavily** (`api.tavily.com/search`) hace la búsqueda real —
 *      1.000 búsquedas/mes gratis, sin tarjeta, sin el bloqueo de
 *      arriba (servicio dedicado a esto, no una función lateral de un
 *      modelo de lenguaje).
 *   2) **Gemini, SIN `google_search`** (`generateContent` con
 *      `responseSchema` nada más) extrae el JSON tipado a partir del
 *      texto que Tavily ya trajo — confirmado en vivo que esta llamada
 *      SÍ funciona sin problema con la misma clave que grounding
 *      rechaza: el bloqueo es específico de la herramienta de búsqueda,
 *      no del modelo en general.
 * Las URLs de origen siguen siendo reales (las de Tavily, no
 * inventadas) — cada dato conserva su `fuente` verificable, mismo
 * principio que regía el diseño original.
 *
 * Nunca se llama desde el navegador — las dos claves viven sólo acá, en
 * el servidor; el frontend jamás las ve (la CSP del sitio, `connect-src
 * 'self'`, tampoco lo permitiría).
 */
import { GoogleGenAI, Type } from '@google/genai';
import type { Schema } from '@google/genai';
import type { CategoriaBusqueda, ResultadoProveedor, SolicitudBusqueda, SpecsCrudas } from '../packages/buscador/src/buscador.js';

// Verificado en vivo (múltiples corridas reales): 'gemini-flash-latest' y
// 'gemini-3.6-flash' devuelven 503 "high demand" con frecuencia real ahora
// mismo; 'gemini-3.5-flash-lite' respondió bien al primer intento en cada
// prueba — además es el tamaño correcto para extraer JSON de un texto ya
// dado, no hace falta razonamiento pesado. El reintento de abajo cubre
// igual un 503 puntual en cualquier modelo, esto sólo minimiza cuántas
// veces hace falta reintentar.
const MODELO_EXTRACCION = 'gemini-3.5-flash-lite';

/** Reintento corto con backoff — 503 "high demand" es, según el propio
 * mensaje de error de Google, transitorio ("Spikes in demand are usually
 * temporary. Please try again later"), confirmado en pruebas reales
 * donde el segundo intento sí funcionó. 3 intentos, backoff simple. */
async function conReintento<T>(fn: () => Promise<T>, intentos = 3): Promise<T> {
  let ultimoError: unknown;
  for (let i = 0; i < intentos; i++) {
    try {
      return await fn();
    } catch (err) {
      ultimoError = err;
      if (i < intentos - 1) await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw ultimoError;
}

const NOMBRE_CATEGORIA: Record<CategoriaBusqueda, string> = {
  parlante: 'parlante (speaker) de hi-fi',
  amplificador: 'amplificador integrado o de potencia de hi-fi',
  streamer: 'streamer/transporte de red de audio',
  dac: 'DAC (conversor digital-analógico) de audio',
};

// ── 1. Búsqueda real — Tavily ───────────────────────────────────────────
interface ResultadoTavily {
  contenido: string; // resultados concatenados, cada uno con su URL
  fuenteUrl: string; // la URL del primer resultado, la más relevante
}

async function buscarEnTavily(categoria: CategoriaBusqueda, marca: string, modelo: string): Promise<ResultadoTavily | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;

  const query = `especificaciones técnicas ficha oficial ${NOMBRE_CATEGORIA[categoria]} ${marca} ${modelo}`;
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      max_results: 5,
      search_depth: 'basic', // 1 crédito por búsqueda (no 2) — alcanza y estira el cupo gratuito mensual
    }),
  });
  if (!res.ok) {
    console.error('proveedor-busqueda: Tavily respondió', res.status, await res.text().catch(() => ''));
    return null;
  }

  const datos = (await res.json()) as { results?: Array<{ url?: string; title?: string; content?: string }> };
  const resultados = (datos.results ?? []).filter((r): r is { url: string; title: string; content: string } => typeof r.url === 'string' && r.url.length > 0);
  if (resultados.length === 0) return null;

  const contenido = resultados.map((r) => `Fuente: ${r.url}\nTítulo: ${r.title ?? ''}\n${r.content ?? ''}`).join('\n\n---\n\n');
  return { contenido, fuenteUrl: resultados[0]!.url };
}

// ── 2. Extracción estructurada — Gemini, sin herramienta de búsqueda ────
/** Campos de descripción, compartidos por los 3 esquemas — ver el
 * comentario de cabecera de `promptExtraccion()` para la restricción de
 * contenido (nunca un juicio de carácter tonal ni de calidad de sonido,
 * misma doctrina que ya rige todo el motor). */
const CAMPOS_DESCRIPCION = {
  descripcionEs: { type: Type.STRING, nullable: true, description: 'Descripción técnica breve (1-2 frases) en español neutro, null si no se pudo redactar una' },
  descripcionEn: { type: Type.STRING, nullable: true, description: 'Same short technical description in English, null if none could be written' },
};
const REQUERIDOS_DESCRIPCION = ['descripcionEs', 'descripcionEn'];

function schemaParlante(): Schema {
  return {
    type: Type.OBJECT,
    properties: {
      sensibilidadDb: { type: Type.NUMBER, nullable: true, description: 'Sensibilidad en dB (2.83V/1m o 1W/1m), null si no se encontró' },
      impedanciaNominalOhm: { type: Type.NUMBER, nullable: true, description: 'Impedancia nominal en ohms, null si no se encontró' },
      impedanciaMinOhm: { type: Type.NUMBER, nullable: true, description: 'Impedancia mínima en ohms, null si no se publica' },
      potenciaRecMinW: { type: Type.NUMBER, nullable: true, description: 'Potencia de amplificador recomendada mínima en W, null si no se publica' },
      potenciaRecMaxW: { type: Type.NUMBER, nullable: true, description: 'Potencia de amplificador recomendada máxima en W, null si no se publica' },
      ...CAMPOS_DESCRIPCION,
    },
    required: ['sensibilidadDb', 'impedanciaNominalOhm', 'impedanciaMinOhm', 'potenciaRecMinW', 'potenciaRecMaxW', ...REQUERIDOS_DESCRIPCION],
  };
}

function schemaAmplificador(): Schema {
  return {
    type: Type.OBJECT,
    properties: {
      potencia8OhmW: { type: Type.NUMBER, nullable: true, description: 'Potencia continua a 8 ohms en W, null si no se encontró' },
      potencia4OhmW: { type: Type.NUMBER, nullable: true, description: 'Potencia continua a 4 ohms en W, null si no se publica' },
      cargaMinOhm: { type: Type.NUMBER, nullable: true, description: 'Impedancia de carga mínima soportada en ohms, null si no se publica' },
      sensEntradaMv: { type: Type.NUMBER, nullable: true, description: 'Sensibilidad de entrada en mV, null si no se publica' },
      impedanciaEntradaOhm: { type: Type.NUMBER, nullable: true, description: 'Impedancia de entrada en ohms, null si no se publica' },
      ...CAMPOS_DESCRIPCION,
    },
    required: ['potencia8OhmW', 'potencia4OhmW', 'cargaMinOhm', 'sensEntradaMv', 'impedanciaEntradaOhm', ...REQUERIDOS_DESCRIPCION],
  };
}

function schemaFuente(): Schema {
  return {
    type: Type.OBJECT,
    properties: {
      salidaV: { type: Type.NUMBER, nullable: true, description: 'Tensión de salida analógica RMS en voltios, null si no tiene salida analógica o no se publica' },
      impedanciaSalidaOhm: { type: Type.NUMBER, nullable: true, description: 'Impedancia de salida en ohms, null si no se publica' },
      ...CAMPOS_DESCRIPCION,
    },
    required: ['salidaV', 'impedanciaSalidaOhm', ...REQUERIDOS_DESCRIPCION],
  };
}

function schemaDe(categoria: CategoriaBusqueda): Schema {
  if (categoria === 'parlante') return schemaParlante();
  if (categoria === 'amplificador') return schemaAmplificador();
  return schemaFuente();
}

/**
 * La restricción de la segunda parte del prompt no es estilo — es la
 * MISMA doctrina que packages/engine nunca rompe (CLAUDE.md,
 * "Prohibiciones absolutas del motor"), aplicada acá por primera vez a
 * un texto que no escribe una persona sino un modelo de lenguaje: nunca
 * un juicio de carácter tonal (cálido, analítico, brillante, musical),
 * nunca una comparación de calidad de sonido, nunca una predicción de
 * sinergia entre marcas. Sin esta instrucción explícita, un LLM
 * describiendo un parlante tiende exactamente a ese vocabulario — es su
 * registro por defecto para "describir audio".
 */
function promptExtraccion(categoria: CategoriaBusqueda, marca: string, modelo: string, resultadosBusqueda: string): string {
  return (
    `Los siguientes son resultados de una búsqueda web sobre un ${NOMBRE_CATEGORIA[categoria]}: marca "${marca}", modelo "${modelo}". ` +
    `Extrae únicamente los campos numéricos pedidos por el esquema, a partir de estos resultados. Si un dato no aparece ` +
    `explícitamente, o los resultados no corresponden a este equipo, usa null — NUNCA estimes ni inventes un número que no esté ahí.\n\n` +
    `Además, redactá una descripción técnica breve (1-2 frases) en español neutro (sin "vos", sin "tú" tampoco) y su ` +
    `traducción al inglés, describiendo qué ES el equipo — topología, construcción, conectividad, tipo de driver o de ` +
    `conversor, lo que los resultados digan de forma factual. Está PROHIBIDO: cualquier juicio de carácter tonal ` +
    `(cálido, analítico, brillante, musical, agresivo...), cualquier afirmación sobre cómo suena o qué tan bien suena, ` +
    `cualquier comparación de calidad con otro producto o marca. Si los resultados no alcanzan para una descripción ` +
    `técnica real (sin caer en esas afirmaciones), usa null en los dos campos de descripción en vez de forzar una.\n\n` +
    `---\n${resultadosBusqueda}\n---`
  );
}

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function stringOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

function parsearSpecs(categoria: CategoriaBusqueda, json: unknown): SpecsCrudas {
  const o = (json ?? {}) as Record<string, unknown>;
  const descripcionEs = stringOrNull(o.descripcionEs);
  const descripcionEn = stringOrNull(o.descripcionEn);
  if (categoria === 'parlante') {
    return {
      sensibilidadDb: numOrNull(o.sensibilidadDb),
      impedanciaNominalOhm: numOrNull(o.impedanciaNominalOhm),
      impedanciaMinOhm: numOrNull(o.impedanciaMinOhm),
      potenciaRecMinW: numOrNull(o.potenciaRecMinW),
      potenciaRecMaxW: numOrNull(o.potenciaRecMaxW),
      descripcionEs,
      descripcionEn,
    };
  }
  if (categoria === 'amplificador') {
    return {
      potencia8OhmW: numOrNull(o.potencia8OhmW),
      potencia4OhmW: numOrNull(o.potencia4OhmW),
      cargaMinOhm: numOrNull(o.cargaMinOhm),
      sensEntradaMv: numOrNull(o.sensEntradaMv),
      impedanciaEntradaOhm: numOrNull(o.impedanciaEntradaOhm),
      descripcionEs,
      descripcionEn,
    };
  }
  return {
    salidaV: numOrNull(o.salidaV),
    impedanciaSalidaOhm: numOrNull(o.impedanciaSalidaOhm),
    descripcionEs,
    descripcionEn,
  };
}

/**
 * Orquesta los dos proveedores: Tavily busca, Gemini extrae. Cualquier
 * fallo en cualquiera de los dos pasos degrada a `sin-resultado`/
 * `proveedor-error`, nunca a una excepción sin capturar.
 */
export async function buscarEquipoEnLaWeb(ai: GoogleGenAI, solicitud: SolicitudBusqueda): Promise<ResultadoProveedor> {
  let busqueda: ResultadoTavily | null;
  try {
    busqueda = await buscarEnTavily(solicitud.categoria, solicitud.marca, solicitud.modelo);
  } catch (err) {
    console.error('proveedor-busqueda: fallo llamando a Tavily', err);
    return { ok: false, codigo: 'proveedor-error' };
  }
  if (!busqueda) return { ok: false, codigo: 'sin-resultado' };

  try {
    const extraccion = await conReintento(() =>
      ai.models.generateContent({
        model: MODELO_EXTRACCION,
        contents: promptExtraccion(solicitud.categoria, solicitud.marca, solicitud.modelo, busqueda.contenido),
        config: { responseMimeType: 'application/json', responseSchema: schemaDe(solicitud.categoria) },
      })
    );

    const crudo = extraccion.text;
    if (!crudo) return { ok: false, codigo: 'proveedor-error' };

    let json: unknown;
    try {
      json = JSON.parse(crudo);
    } catch (err) {
      console.error('proveedor-busqueda: JSON de extracción inválido', err);
      return { ok: false, codigo: 'proveedor-error' };
    }

    return { ok: true, specs: parsearSpecs(solicitud.categoria, json), fuenteUrl: busqueda.fuenteUrl };
  } catch (err) {
    console.error('proveedor-busqueda: fallo llamando a Gemini (extracción)', err);
    return { ok: false, codigo: 'proveedor-error' };
  }
}
