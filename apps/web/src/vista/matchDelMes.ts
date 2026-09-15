/**
 * Modelo de pantalla de "The Match Recomendado" — PURO, nunca toca
 * `document`. Reusa `chipsParlante`/`chipsAmplificador`/`chipsFuente`
 * (los mismos chips físicos que ya muestra la tarjeta de equipo elegido
 * en Configurar) y `tituloYSubtextoVeredicto` (el mismo titular que ya
 * usa la tarjeta de veredicto en Resultado) — cero texto nuevo sobre
 * física o sonido, sólo re-presentación de datos y textos ya calculados
 * en otro lado.
 */
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import type { MatchDelMes } from '../datos/matchDelMes.ts';
import { chipsParlante, chipsAmplificador, chipsFuente } from '../datos/etiquetas.ts';
import { iconoEquipoSvg } from './iconosCategoria.ts';
import type { CategoriaEquipo } from './iconosCategoria.ts';
import { tituloYSubtextoVeredicto } from './resultado.ts';
import { textosDe } from '../idioma/idioma.ts';

export interface ItemMatchDelMes {
  categoria: CategoriaEquipo;
  categoriaLabel: string; // "Parlante"/"Amplificador"/"Streamer"/"DAC" — config.* reusado
  marca: string; // no se traduce, igual que en toda tarjeta de equipo
  nombre: string;
  tipo: string; // localizado
  chips: string[];
  iconoSvg: string;
}

export interface ModeloMatchDelMes {
  tituloSeccion: string;
  introHtml: string;
  mesEtiqueta: string;
  rotuloCriterio: string;
  notaSalaReferencia: string;
  items: ItemMatchDelMes[]; // 2 a 4 piezas: parlante, amplificador, y streamer/dac si hay uno compatible
  veredictoTituloHtml: string;
  veredictoSubtextoHtml: string;
  veredictoClase: 'ok' | 'warn' | 'alert';
  verFicha: string;
}

function capitalizar(s: string): string {
  return s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s;
}

export function modeloMatchDelMes(match: MatchDelMes, idioma: Idioma): ModeloMatchDelMes | null {
  const t = textosDe(idioma);

  const parlanteCat = CATALOGO.parlantes.find((p) => p.id === match.parlanteId);
  const ampCat = CATALOGO.amplificadores.find((a) => a.id === match.amplificadorId);
  // No debería pasar nunca con una `MatchDelMes` bien formada (los ids
  // salen del propio catálogo que se está leyendo acá) — si pasa, se
  // declara `null` en vez de romper la portada con equipos a medio
  // construir.
  if (!parlanteCat || !ampCat) return null;

  const streamerCat = match.streamerId ? (CATALOGO.streamers.find((s) => s.id === match.streamerId) ?? null) : null;
  const dacCat = match.dacId ? (CATALOGO.dacs.find((d) => d.id === match.dacId) ?? null) : null;

  const items: ItemMatchDelMes[] = [
    {
      categoria: 'parlante',
      categoriaLabel: t.config.parlantes,
      marca: parlanteCat.marca,
      nombre: parlanteCat.nombre,
      tipo: parlanteCat.tipo[idioma],
      chips: chipsParlante(parlanteCat, idioma),
      iconoSvg: iconoEquipoSvg('parlante', parlanteCat.tipo.es, parlanteCat.descripcion.es),
    },
    {
      categoria: 'amplificador',
      categoriaLabel: t.config.amplificador,
      marca: ampCat.marca,
      nombre: ampCat.nombre,
      tipo: ampCat.tipo[idioma],
      chips: chipsAmplificador(ampCat, idioma),
      iconoSvg: iconoEquipoSvg('amplificador', ampCat.tipo.es, ampCat.descripcion.es),
    },
  ];
  if (streamerCat) {
    items.push({
      categoria: 'streamer',
      categoriaLabel: t.config.streamer,
      marca: streamerCat.marca,
      nombre: streamerCat.nombre,
      tipo: streamerCat.tipo[idioma],
      chips: chipsFuente(streamerCat, idioma),
      iconoSvg: iconoEquipoSvg('streamer', streamerCat.tipo.es, streamerCat.descripcion.es),
    });
  }
  if (dacCat) {
    items.push({
      categoria: 'dac',
      categoriaLabel: t.config.dac,
      marca: dacCat.marca,
      nombre: dacCat.nombre,
      tipo: dacCat.tipo[idioma],
      chips: chipsFuente(dacCat, idioma),
      iconoSvg: iconoEquipoSvg('dac', dacCat.tipo.es, dacCat.descripcion.es),
    });
  }

  const { tituloHtml, subtextoHtml } = tituloYSubtextoVeredicto(match.veredicto, idioma);

  const fechaMes = new Date(match.anio, match.mes, 1);
  const mesEtiqueta = capitalizar(new Intl.DateTimeFormat(idioma === 'es' ? 'es-CL' : 'en-US', { month: 'long', year: 'numeric' }).format(fechaMes));

  return {
    tituloSeccion: t.splash.recomendadoTitulo,
    introHtml: t.splash.recomendadoIntro,
    mesEtiqueta,
    rotuloCriterio: t.resultado.capaCriterioEditorial,
    notaSalaReferencia: t.splash.recomendadoNotaSala,
    items,
    veredictoTituloHtml: tituloHtml,
    veredictoSubtextoHtml: subtextoHtml,
    veredictoClase: match.veredicto.general,
    verFicha: t.config.verFicha,
  };
}
