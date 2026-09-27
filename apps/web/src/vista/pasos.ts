/** Configurar en 3 pasos (Equipos / Sala y escucha / Revisión). Sólo
 * presentación: qué paso se ve, qué botones se habilitan y el resumen
 * "Tu cadena de escucha". Las selecciones y su validación siguen en
 * main.ts (`estado`, `pick`, `setDim`…): esto no las toca ni las duplica. */
import type { FilaResumen } from './resumenConfig.ts';

export interface EstadoPasos {
  /** Parlante y amplificador elegidos. */
  listo: boolean;
  /** Las tres dimensiones de sala están dentro de sus límites. */
  salaValida: boolean;
  /** "1 de 2 equipos seleccionados", ya redactado. */
  contador: string;
  filas: FilaResumen[];
}

export interface ControlPasos {
  actualizar(estado: EstadoPasos): void;
  /** Lleva a un paso (respetando qué pasos están habilitados). */
  ir(paso: number): void;
}

function pintarFilas(destino: HTMLElement, filas: FilaResumen[]): void {
  destino.replaceChildren();
  for (const f of filas) {
    const dt = document.createElement('dt');
    dt.textContent = f.etiqueta;
    const dd = document.createElement('dd');
    dd.textContent = f.valor;
    if (f.vacio) dd.classList.add('vacio');
    destino.append(dt, dd);
  }
}

export function iniciarPasos(): ControlPasos | null {
  const pantalla = document.getElementById('s-config');
  const secciones = [0, 1, 2].map((i) => document.getElementById(`pc-paso-${i}`));
  const contador = document.getElementById('pc-contador');
  const aSala = document.getElementById('pc-a-sala') as HTMLButtonElement | null;
  const aRevision = document.getElementById('pc-a-revision') as HTMLButtonElement | null;
  const analizar = document.getElementById('btn-an') as HTMLButtonElement | null;
  const filasCadena = document.getElementById('pc-cadena-filas');
  const filasRevision = document.getElementById('pc-revision-filas');
  const nav = pantalla?.querySelector<HTMLElement>('.pc-stepper');
  const stepper = pantalla?.querySelectorAll<HTMLButtonElement>('.pc-stepper [data-paso]');
  const irA = pantalla?.querySelectorAll<HTMLButtonElement>('[data-paso-ir]');
  if (!pantalla || secciones.some((s) => !s) || !contador || !aSala || !aRevision || !analizar) return null;
  if (!filasCadena || !filasRevision || !nav || !stepper || !irA) return null;
  const pasos = secciones as HTMLElement[];

  let paso = 0;
  let listo = false;
  let salaValida = true;

  function permitido(n: number): number {
    // Sin parlante y amplificador no se sale del primer paso; con una
    // dimensión inválida no se pasa de "Sala y escucha".
    if (!listo) return 0;
    if (!salaValida) return Math.min(n, 1);
    return n;
  }

  function mostrar(n: number, enfocar: boolean): void {
    paso = permitido(Math.max(0, Math.min(2, n)));
    // El CSS lo lee para pintar la revisión como franja marfil (sólo paso 3).
    pantalla!.dataset.paso = String(paso);
    pasos.forEach((el, i) => {
      el.hidden = i !== paso;
    });
    stepper!.forEach((b) => {
      const i = Number(b.dataset.paso);
      if (i === paso) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
      b.disabled = i > permitido(i);
    });
    aSala!.disabled = !listo;
    aRevision!.disabled = !salaValida;
    analizar!.disabled = !listo || !salaValida;
    if (enfocar) {
      const destino = pasos[paso]!;
      destino.focus({ preventScroll: true });
      nav!.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  stepper.forEach((b) => b.addEventListener('click', () => mostrar(Number(b.dataset.paso), true)));
  irA.forEach((b) => b.addEventListener('click', () => mostrar(Number(b.dataset.pasoIr), true)));
  mostrar(0, false);

  return {
    actualizar(estado) {
      listo = estado.listo;
      salaValida = estado.salaValida;
      contador!.textContent = estado.contador;
      pintarFilas(filasCadena!, estado.filas);
      pintarFilas(filasRevision!, estado.filas);
      mostrar(paso, false);
    },
    ir(n) {
      mostrar(n, false);
    },
  };
}
