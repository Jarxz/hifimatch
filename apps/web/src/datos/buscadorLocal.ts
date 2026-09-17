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
/** 0=exacto, 1=cualquier cosa. Umbral INTERNO de Fuse — genera candidatos,
 * no rechaza el conjunto marca+modelo (ver UMBRAL_ACEPTACION más abajo,
 * que sí lo hace). */
const UMBRAL = 0.4;

/**
 * Hallazgo real, no documentado en ningún lado de Fuse.js hasta que se
 * midió con vectores del catálogo: con varias `keys` ponderadas, Fuse
 * incluye un ítem si CUALQUIER campo matchea bien — acá "marca" sola con
 * score ~0 — no si el score COMBINADO (marca+modelo) es bueno. El score
 * combinado sólo ordena, nunca excluye. Consecuencia real observada:
 * buscar "WiiM" + "Ultra" (que no existe en el catálogo) devolvía "WiiM
 * Pro Plus" — mismo fabricante, modelo completamente distinto — y la
 * búsqueda web nunca llegaba a intentarse, porque el catálogo local
 * "encontraba algo" aunque fuera lo que no era.
 *
 * Corte calibrado con vectores reales (ver buscadorLocal.test.ts):
 * "Wharfdale Linton" (typo real que SÍ debe aceptarse) da 0,504;
 * "WiiM Ultra"→WiiM Pro Plus y "Sonos Move"→Sonus Faber (falsos
 * positivos que SÍ deben rechazarse) dan 0,797 y 0,567. 0,55 separa
 * limpio los dos casos, con margen de sobra a ambos lados.
 */
const UMBRAL_ACEPTACION = 0.55;

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
      includeScore: true, // necesario para el filtro explícito por UMBRAL_ACEPTACION de abajo
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
    .filter((r) => (r.score ?? 1) <= UMBRAL_ACEPTACION) // ver UMBRAL_ACEPTACION: Fuse no rechaza esto solo
    .map((r) => r.item);
}
