/**
 * Veredicto consolidado del resultado — CAPA CRITERIO-EDITORIAL, no física
 * (ver CLAUDE.md, "Las dos capas"). Agrupa las severidades ya calculadas
 * por las reglas físicas en 3 estados ("Potencia", "Acople eléctrico",
 * "Sala") en vez de un único número compuesto: un promedio ponderado
 * disuelve un problema grave entre varias cosas que están bien (un
 * amplificador que no alcanza en picos puede terminar pareciendo
 * aceptable si el resto promedia bien) — acá gana el peor eslabón de
 * cada grupo, no un promedio. Es el único modelo de evaluación general
 * del sitio: reemplazó por completo a un puntaje 1-10 que existió en una
 * ronda anterior y fue retirado (ver CLAUDE.md).
 *
 * Reusa `peorSeveridad()` de tipos.ts, junto a su análoga `peorConfianza()`.
 *
 * Como en el resto del motor: dato faltante nunca es "malo" — "sin-datos"
 * se excluye del cálculo del grupo, nunca cuenta como reparo. Si un grupo
 * entero queda sin ningún componente con dato, el grupo mismo es
 * "sin-datos" (no se inventa un color), y no participa del veredicto
 * general. El grupo "Sala" usa exactamente el mismo mecanismo desde que
 * `reverberacion.ts` dejó de emitir veredicto sobre el RT60 estimado
 * (siempre `'sin-datos'` ahora, ver su comentario de cabecera): modos
 * siempre tiene valor, así que "Sala" nunca queda vacío, pero
 * reverberacion ya no puede arrastrarlo a "warn" por sí sola.
 */
import { peorSeveridad } from './tipos.ts';
import type { Severidad } from './tipos.ts';

export type EstadoGrupo = Exclude<Severidad, 'sin-datos'> | 'sin-datos';

/** Severidad que puede tener un componente del grupo "Sala" — nunca
 * 'alert' (techo declarado por CLAUDE.md, "Severidad y bloque de sala").
 * 'sin-datos' es un valor real acá, no una posibilidad teórica: es lo que
 * `reverberacion.ts` devuelve siempre desde que el RT60 estimado dejó de
 * emitir veredicto. */
export type SeveridadSala = 'ok' | 'warn' | 'sin-datos';

export interface EntradaVeredicto {
  potencia: Exclude<Severidad, 'sin-datos'>; // potencia siempre tiene valor (nunca sin-datos)
  carga: Severidad;
  amortiguamiento: Severidad; // interacción DF↔curva de impedancia — ver amortiguamiento.ts
  puenteStreamer: Severidad | null; // null = streamer no elegido
  recorridoStreamer: Severidad | null;
  puenteDac: Severidad | null; // null = dac no elegido
  recorridoDac: Severidad | null;
  modos: 'ok' | 'warn'; // techo de severidad de sala — nunca 'alert' (ver CLAUDE.md)
  /** Casi siempre 'sin-datos' en la práctica — ver `SeveridadSala`. */
  reverberacion: SeveridadSala;
  /** Acoplamiento modal del parlante (`modos.ts`, `evaluarAcoplamientoModal`)
   * — misma cos(nπy/L) que `modos`, aplicada a la fuente en vez de sólo al
   * oyente. Siempre tiene valor, nunca `alert` (techo de sala). */
  acoplamientoModal: 'ok' | 'warn';
  /** Filtro peine por reflexión (`colocacion.ts`, `evaluarFiltroPeine`) —
   * peor de las 10 combinaciones (5 reflexiones × 2 canales). */
  filtroPeine: 'ok' | 'warn';
  /** Asimetría izquierda/derecha (`colocacion.ts`, `evaluarAsimetria`) —
   * peor de las 6 categorías (directo + 5 reflexiones). */
  asimetria: 'ok' | 'warn';
  /** Ángulo del triángulo de escucha contra la convención de 60°
   * (`colocacion.ts`, `evaluarAnguloEscucha`). */
  anguloEscucha: 'ok' | 'warn';
}

export interface ResultadoVeredicto {
  potencia: Exclude<Severidad, 'sin-datos'>;
  acopleElectrico: EstadoGrupo;
  sala: 'ok' | 'warn';
  /** Peor de los grupos que sí tienen dato — potencia y sala siempre lo
   * tienen (ninguno de los dos puede ser "sin-datos"), así que `general`
   * nunca es "sin-datos": siempre hay al menos un piso físico real sobre
   * el que apoyar el veredicto. */
  general: Exclude<Severidad, 'sin-datos'>;
}

function sinFaltantes(...valores: Array<Severidad | null>): Array<Exclude<Severidad, 'sin-datos'>> {
  return valores.filter((v): v is Exclude<Severidad, 'sin-datos'> => v !== null && v !== 'sin-datos');
}

export function calcularVeredicto(e: EntradaVeredicto): ResultadoVeredicto {
  const valoresAcople = sinFaltantes(e.carga, e.amortiguamiento, e.puenteStreamer, e.recorridoStreamer, e.puenteDac, e.recorridoDac);
  const acopleElectrico: EstadoGrupo = valoresAcople.length > 0 ? peorSeveridad(...valoresAcople) : 'sin-datos';

  // reverberacion casi siempre 'sin-datos' (ver SeveridadSala) — se excluye
  // igual que cualquier otro componente sin dato, nunca arrastra el grupo.
  // Los otros cinco (modos, acoplamientoModal, filtroPeine, asimetria,
  // anguloEscucha) siempre tienen valor ('ok'|'warn'), así que valoresSala
  // nunca queda vacío: "Sala" nunca es 'sin-datos'.
  const valoresSala = sinFaltantes(e.modos, e.reverberacion, e.acoplamientoModal, e.filtroPeine, e.asimetria, e.anguloEscucha) as Array<'ok' | 'warn'>;
  const sala: 'ok' | 'warn' = valoresSala.length > 0 ? (peorSeveridad(...valoresSala) as 'ok' | 'warn') : 'ok';

  const grupos = acopleElectrico === 'sin-datos' ? [e.potencia, sala] : [e.potencia, acopleElectrico, sala];
  const general = peorSeveridad(...grupos);
  return { potencia: e.potencia, acopleElectrico, sala, general };
}
