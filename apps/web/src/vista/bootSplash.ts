/**
 * Intro de arranque ("boot splash") de la portada — capa decorativa que
 * corre una sola vez al cargar, antes de que el logo animado de `.splash`
 * aparezca debajo. Ningún paso corresponde a una carga asíncrona real: el
 * sitio es un único archivo autocontenido (`vite-plugin-singlefile`), todo
 * ya está en memoria antes de que esto corra — es ritmo visual, mismo
 * espíritu que `iniciarContadorProof()` en `main.ts` (cuenta hasta un valor
 * ya conocido de antemano, no mide nada en vivo). Toca `document` directo,
 * mismo criterio que `vista/pintar.ts`/`vista/medidor.ts`: la única capa
 * de `apps/web` que un test de Node no puede ejercitar sin DOM — se
 * verifica con Chrome headless, no con `node --test`.
 */

const DURACION_MS = 2100;

/** Instantes (0–1, proporción de DURACION_MS) en que cada paso pasa de
 * pendiente a activo — criterio propio de esta intro, no del motor. */
const UMBRAL_PASO_2 = 0.35;
const UMBRAL_PASO_3 = 0.72;
const UMBRAL_FIN = 0.96;

/** Curva de easing "se asienta hacia el final" — misma familia que el resto
 * de animaciones del sitio, sin ser literalmente `cubic-bezier(.22,.61,.36,1)`
 * porque acá hace falta un exponente evaluable en JS, no en CSS. */
function easeOutAtenuado(t: number): number {
  return 1 - Math.pow(1 - t, 2.5);
}

type EstadoPaso = 'pendiente' | 'activo' | 'hecho';

function pintarEstadoPaso(
  contenedor: HTMLElement,
  n: 1 | 2 | 3,
  estado: EstadoPaso,
  textoProcesando: string,
  textoListo: string,
): void {
  const paso = contenedor.querySelector<HTMLElement>(`#boot-paso-${n}`);
  const badge = contenedor.querySelector<HTMLElement>(`#boot-estado-${n}`);
  if (!paso || !badge) return;
  paso.classList.toggle('boot-activo', estado === 'activo');
  paso.classList.toggle('boot-hecho', estado === 'hecho');
  badge.textContent = estado === 'activo' ? textoProcesando : estado === 'hecho' ? textoListo : '';
}

function ocultar(contenedor: HTMLElement): void {
  contenedor.classList.add('boot-oculto');
  // Se saca del flujo recién después del fundido — así el foco de teclado
  // nunca puede quedar atrapado dentro de un elemento ya invisible.
  setTimeout(() => contenedor.remove(), 320);
}

/**
 * Arranca la animación una sola vez. `textoProcesando`/`textoListo` llegan
 * ya resueltos del idioma activo (mismo criterio que `actualizarMedidor` en
 * `medidor.ts`: quien llama pasa el idioma, esta función no lo lee de un
 * global propio). El texto fijo de cada paso (`splash.bootPaso1/2/3` y
 * "Saltar intro") ya está en el HTML vía `data-i18n` — lo puebla
 * `aplicarCromoEstatico()` como cualquier otro cromo estático del sitio,
 * no esta función.
 *
 * Respeta `prefers-reduced-motion`: se saca del DOM directo, sin animar —
 * mismo patrón exacto que `iniciarContadorProof()` en `main.ts`.
 */
export function iniciarBootSplash(textoProcesando: string, textoListo: string): void {
  const contenedor = document.getElementById('boot-splash');
  if (!contenedor) return;

  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducido) {
    contenedor.remove();
    return;
  }

  const btnSaltar = contenedor.querySelector<HTMLButtonElement>('#btn-boot-saltar');
  const barra = contenedor.querySelector<HTMLElement>('#boot-bar-fill');
  const porcentaje = contenedor.querySelector<HTMLElement>('#boot-pct');

  let detenido = false;
  const detener = (): void => {
    if (detenido) return;
    detenido = true;
    ocultar(contenedor);
  };
  btnSaltar?.addEventListener('click', detener);

  const inicio = performance.now();
  const frame = (ahora: number): void => {
    if (detenido) return;
    const t = Math.min(1, (ahora - inicio) / DURACION_MS);
    const avance = easeOutAtenuado(t);
    const pct = Math.floor(avance * 100);
    if (barra) barra.style.width = pct + '%';
    if (porcentaje) porcentaje.textContent = pct + '%';

    if (t < UMBRAL_PASO_2) {
      pintarEstadoPaso(contenedor, 1, 'activo', textoProcesando, textoListo);
      pintarEstadoPaso(contenedor, 2, 'pendiente', textoProcesando, textoListo);
      pintarEstadoPaso(contenedor, 3, 'pendiente', textoProcesando, textoListo);
    } else if (t < UMBRAL_PASO_3) {
      pintarEstadoPaso(contenedor, 1, 'hecho', textoProcesando, textoListo);
      pintarEstadoPaso(contenedor, 2, 'activo', textoProcesando, textoListo);
      pintarEstadoPaso(contenedor, 3, 'pendiente', textoProcesando, textoListo);
    } else if (t < UMBRAL_FIN) {
      pintarEstadoPaso(contenedor, 1, 'hecho', textoProcesando, textoListo);
      pintarEstadoPaso(contenedor, 2, 'hecho', textoProcesando, textoListo);
      pintarEstadoPaso(contenedor, 3, 'activo', textoProcesando, textoListo);
    } else {
      pintarEstadoPaso(contenedor, 1, 'hecho', textoProcesando, textoListo);
      pintarEstadoPaso(contenedor, 2, 'hecho', textoProcesando, textoListo);
      pintarEstadoPaso(contenedor, 3, 'hecho', textoProcesando, textoListo);
    }

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      setTimeout(detener, 300);
    }
  };
  requestAnimationFrame(frame);
}
