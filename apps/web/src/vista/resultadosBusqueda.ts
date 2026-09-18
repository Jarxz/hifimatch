/**
 * HTML puro para el buscador de equipos (marca+modelo → Fuse.js local o
 * búsqueda web) — mismo patrón que `vista/selectores.ts` (infoHtml*):
 * arma strings de HTML sin tocar `document`, así corre con `node --test`.
 * El pintado real (asignar a `.innerHTML`) y los listeners viven en
 * `main.ts`, igual que ya hace `infoHTML()` con estas funciones.
 */
import type { ParlanteCat, AmplificadorCat, FuenteCat } from '../../../../packages/data/src/tipos-catalogo.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { chipsParlante, chipsAmplificador, chipsFuente } from '../datos/etiquetas.ts';
import type { CategoriaLocal } from '../datos/buscadorLocal.ts';
import { textosDe } from '../idioma/idioma.ts';

export type EquipoCatalogo = ParlanteCat | AmplificadorCat | FuenteCat;

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function chipsDe(eq: EquipoCatalogo, categoria: CategoriaLocal, idioma: Idioma): string[] {
  if (categoria === 'spk') return chipsParlante(eq as ParlanteCat, idioma);
  if (categoria === 'amp') return chipsAmplificador(eq as AmplificadorCat, idioma);
  return chipsFuente(eq as FuenteCat, idioma);
}

function filaResultado(eq: EquipoCatalogo, categoria: CategoriaLocal, idioma: Idioma): string {
  const chips = chipsDe(eq, categoria, idioma).slice(0, 3).join(' · ');
  return (
    `<button type="button" class="resultado-item" data-elegir-id="${escapeHtml(eq.id)}">` +
    `<span class="ri-marca">${escapeHtml(eq.marca)}</span>` +
    `<span class="ri-nombre">${escapeHtml(eq.nombre)}</span>` +
    (chips ? `<span class="ri-chips">${escapeHtml(chips)}</span>` : '') +
    `</button>`
  );
}

/** localeCompare para que "explorar todo" (sin marca/modelo tipeados)
 * se lea alfabéticamente por marca, mismo criterio que ya usa
 * `marcasUnicas` en selectores.ts. Un resultado de búsqueda con Fuse.js
 * (`ordenarPorRelevancia:true`) mantiene en cambio el orden que ya trae
 * — reordenar por marca destruiría el ranking por parecido.
 *
 * `mostrarBuscarWeb` (default false, sólo con marca+modelo tipeados —
 * nunca en "explorar todo", donde no hay nada que buscar en la web):
 * agrega un botón para saltar el catálogo local y buscar en la web de
 * todos modos. Bug real encontrado en producción: Fuse.js encuentra un
 * candidato local parecido con bastante frecuencia (ej. "Yamaha
 * A-S3200" → sugiere el "Yamaha A-S1200" ya catalogado, un modelo
 * distinto) y, sin este botón, eso bloqueaba la búsqueda web por
 * completo — el usuario quedaba con una sola sugerencia que no es su
 * equipo, sin ningún camino hacia adelante. */
export function modeloListaResultados(equipos: readonly EquipoCatalogo[], categoria: CategoriaLocal, idioma: Idioma, ordenarPorRelevancia: boolean, mostrarBuscarWeb = false): string {
  if (equipos.length === 0) return '';
  const lista = ordenarPorRelevancia ? equipos : [...equipos].sort((a, b) => a.marca.localeCompare(b.marca) || a.nombre.localeCompare(b.nombre));
  const filas = `<div class="resultados-lista">${lista.map((eq) => filaResultado(eq, categoria, idioma)).join('')}</div>`;
  if (!mostrarBuscarWeb) return filas;
  const t = textosDe(idioma).config;
  return filas + `<button type="button" class="back buscar-ninguno-web">${escapeHtml(t.buscarNingunoEsBuscarWeb)}</button>`;
}

/** Un único párrafo de estado (buscando/sin resultado/error/etc.) —
 * mismo `.resultado-estado` para las 4 categorías, texto ya redactado
 * por el diccionario (idioma/es.ts + en.ts), nunca armado acá. */
export function modeloEstadoBusqueda(texto: string): string {
  return `<p class="resultado-estado">${escapeHtml(texto)}</p>`;
}

/**
 * Sólo en modo "Catálogo" (ver el selector nuevo en `.picker-head`,
 * `main.ts`): Fuse.js no encontró nada y, a diferencia del modo
 * "Búsqueda web", acá NUNCA se llama a la web en automático — el
 * usuario declaró explícitamente que quiere quedarse en el catálogo
 * curado. Reusa la misma clase `.buscar-ninguno-web` y el mismo texto
 * que ya usa `modeloListaResultados` cuando Fuse SÍ encuentra un
 * candidato pero no es el correcto, así el mismo listener delegado de
 * `main.ts` cubre los dos casos sin código nuevo — un solo click pasa a
 * "Búsqueda web" para esta consulta.
 */
export function modeloSinCoincidenciasLocales(idioma: Idioma): string {
  const t = textosDe(idioma).config;
  return modeloEstadoBusqueda(t.buscarSinCoincidenciasLocales) + `<button type="button" class="back buscar-ninguno-web">${escapeHtml(t.buscarNingunoEsBuscarWeb)}</button>`;
}

/**
 * Panel de "no se encontró" — el respaldo universal de todo camino que
 * no llega a un dato (sin conexión, región restringida, cupo agotado,
 * sin resultado, error). Deliberadamente SIN campos numéricos: la
 * sensibilidad/impedancia de un parlante o la potencia de un
 * amplificador las entrega el buscador (catálogo local o búsqueda web),
 * nunca el usuario a mano — pedirle esos números es exactamente la
 * fricción que "escribir marca y modelo" vino a evitar. La única salida
 * para parlante/amplificador es "Avisar al sitio sobre este equipo"
 * (reusa el formulario de contacto). Streamer/DAC son la única
 * excepción real: el motor no exige ningún numérico ahí
 * (packages/engine/src/tipos.ts `Fuente`), así que "usar sin datos de
 * salida" no le pide un solo número a nadie — sigue siendo 100%
 * automático, sólo declara que faltan esos dos campos opcionales.
 */
export function modeloPanelManual(categoria: CategoriaLocal, idioma: Idioma): string {
  const t = textosDe(idioma).config;
  const acciones = (extra: string) => `<div class="manual-acciones">${extra}<button type="button" class="back manual-solicitar-alta">${t.buscarSolicitarAlta}</button></div>`;

  if (categoria === 'streamer' || categoria === 'dac') {
    return `<div class="manual-form">` + `<p class="manual-intro">${t.buscarManualIntroFuente}</p>` + acciones(`<button type="button" class="cta-sec manual-usar-sin-datos">${t.buscarManualUsarSinDatos}</button>`) + `</div>`;
  }
  return `<div class="manual-form">` + `<p class="manual-intro">${t.buscarSinResultadoIntro}</p>` + acciones('') + `</div>`;
}
