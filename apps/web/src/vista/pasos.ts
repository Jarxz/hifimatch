/** Configurar en 3 pasos (Equipos / Sala y escucha / Revisión). Sólo
 * presentación: qué bloque se ve, qué botones se habilitan y el resumen
 * "Tu cadena de escucha". Las selecciones y su validación siguen en
 * main.ts (`estado`, `pick`, `setDim`…): esto no las toca ni las duplica. */
import type { FilaResumen } from './resumenConfig.ts';

export interface ControlPasos {
  /** Repinta el resumen y recalcula qué pasos se pueden abrir. */
  actualizar(listo: boolean, filas: FilaResumen[]): void;
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
  const equipo = pantalla?.querySelector<HTMLElement>('.cfg-col-equipo');
  const sala = pantalla?.querySelector<HTMLElement>('.cfg-col-sala');
  const revision = document.getElementById('pc-revision');
  const anterior = document.getElementById('pc-anterior') as HTMLButtonElement | null;
  const continuar = document.getElementById('pc-continuar') as HTMLButtonElement | null;
  const aviso = document.getElementById('pc-aviso');
  const analizar = document.getElementById('btn-an');
  const filasCadena = document.getElementById('pc-cadena-filas');
  const filasRevision = document.getElementById('pc-revision-filas');
  const nav = pantalla?.querySelector<HTMLElement>('.pc-stepper');
  const botones = pantalla?.querySelectorAll<HTMLButtonElement>('.pc-stepper [data-paso]');
  if (!pantalla || !equipo || !sala || !revision || !anterior || !continuar || !aviso || !analizar) return null;
  if (!filasCadena || !filasRevision || !nav || !botones) return null;

  let paso = 0;
  let listo = false;

  function mostrar(n: number, enfocar: boolean): void {
    paso = Math.max(0, Math.min(2, n));
    // Sin parlante y amplificador no se sale del primer paso.
    if (!listo && paso > 0) paso = 0;
    equipo!.hidden = paso !== 0;
    sala!.hidden = paso !== 1;
    revision!.hidden = paso !== 2;
    anterior!.hidden = paso === 0;
    continuar!.hidden = paso === 2;
    continuar!.disabled = !listo;
    aviso!.hidden = listo || paso !== 0;
    // "Analizar" sólo aparece en la revisión; la barra inferior sigue mostrando el estado.
    analizar!.hidden = paso !== 2;
    botones!.forEach((b) => {
      const i = Number(b.dataset.paso);
      if (i === paso) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
      b.disabled = i > 0 && !listo;
    });
    if (enfocar) {
      const destino = paso === 0 ? equipo! : paso === 1 ? sala! : revision!;
      destino.tabIndex = -1;
      destino.focus({ preventScroll: true });
      nav!.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  anterior.addEventListener('click', () => mostrar(paso - 1, true));
  continuar.addEventListener('click', () => mostrar(paso + 1, true));
  botones.forEach((b) => b.addEventListener('click', () => mostrar(Number(b.dataset.paso), true)));
  mostrar(0, false);

  return {
    actualizar(nuevoListo, filas) {
      listo = nuevoListo;
      pintarFilas(filasCadena, filas);
      pintarFilas(filasRevision, filas);
      mostrar(paso, false);
    },
  };
}
