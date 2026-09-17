/**
 * Búsqueda difusa (Fuse.js) sobre el catálogo YA CURADO — resuelve la
 * mitad del problema de "catálogo limitado" que no tiene que ver con
 * datos faltantes, sino con encontrar lo que el catálogo YA tiene: una
 * marca que no se conoce de memoria, o un nombre tipeado con un error
 * ("Wharfdale" en vez de "Wharfedale"). Corre 100% en el navegador
 * contra datos ya cargados — instantáneo, $0, sin red.
 *
 * Cuando esto no encuentra nada razonable, `main.ts` recién ahí intenta
 * la búsqueda web (`/api/buscar-equipo`, packages/buscador) — ver
 * apps/web/src/main.ts, la función que orquesta el flujo de dos pasos.
 */
import Fuse from 'fuse.js';
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';
import type { ParlanteCat, AmplificadorCat, FuenteCat } from '../../../../packages/data/src/tipos-catalogo.ts';

export type CategoriaLocal = 'spk' | 'amp' | 'streamer' | 'dac';
export type EquipoCatalogo = ParlanteCat | AmplificadorCat | FuenteCat;

const RESULTADOS_MAX = 8;
/** 0=exacto, 1=cualquier cosa. Más bajo que el default de Fuse (0.6) —
 * se prefiere no mostrar nada antes que un resultado irrelevante en una
 * lista de sólo 8 huecos. Calibrado contra vectores reales del catálogo
 * (ver buscadorLocal.test.ts): suficiente para "wharfdale"→Wharfedale,
 * no tan laxo como para que cualquier palabra traiga resultados. */
const UMBRAL = 0.4;

/** Duplicado deliberado de la normalización de
 * packages/buscador/src/buscador.ts (NFD + quitar diacríticos +
 * minúsculas) — evita acoplar esta búsqueda LOCAL sobre el catálogo
 * curado al paquete orientado a servidor que arma equipos no-curados,
 * por 3 líneas de lógica. Mismo criterio que ya usa el proyecto para
 * otras duplicaciones chicas y deliberadas (ver el módulo de AR en
 * CLAUDE.md, "lógica de omisión duplicada a propósito"). */
function normalizarTexto(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function catalogoDe(categoria: CategoriaLocal): readonly EquipoCatalogo[] {
  if (categoria === 'spk') return CATALOGO.parlantes;
  if (categoria === 'amp') return CATALOGO.amplificadores;
  if (categoria === 'streamer') return CATALOGO.streamers;
  return CATALOGO.dacs;
}

const indicesPorCategoria = new Map<CategoriaLocal, Fuse<EquipoCatalogo>>();

function indiceDe(categoria: CategoriaLocal): Fuse<EquipoCatalogo> {
  let indice = indicesPorCategoria.get(categoria);
  if (!indice) {
    indice = new Fuse(catalogoDe(categoria) as EquipoCatalogo[], {
      keys: [
        { name: 'marca', weight: 2, getFn: (item) => normalizarTexto(item.marca) },
        { name: 'nombre', weight: 1.5, getFn: (item) => normalizarTexto(item.nombre) },
      ],
      threshold: UMBRAL,
      ignoreLocation: true, // sin esto Fuse sólo acierta cerca del principio de la cadena
    });
    indicesPorCategoria.set(categoria, indice);
  }
  return indice;
}

/**
 * Busca en el catálogo curado de una categoría. Si `marca` y `modelo`
 * están AMBOS vacíos, devuelve el catálogo completo de esa categoría
 * (sin ordenar de nuevo — `vista/resultadosBusqueda.ts` lo agrupa por
 * marca) — permite seguir explorando sin saber qué buscar, lo único
 * bueno que tenían los dos `<select>` en cascada que esto reemplaza.
 */
export function buscarLocal(categoria: CategoriaLocal, marca: string, modelo: string): EquipoCatalogo[] {
  const m = marca.trim();
  const mo = modelo.trim();
  if (m === '' && mo === '') return [...catalogoDe(categoria)];

  const consulta = normalizarTexto(`${m} ${mo}`.trim());
  if (consulta === '') return [];
  return indiceDe(categoria)
    .search(consulta, { limit: RESULTADOS_MAX })
    .map((r) => r.item);
}
