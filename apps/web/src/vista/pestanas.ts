/** Pestañas de Resultado (Lectura general / Física y fórmulas / Datos y
 * fuentes) y temas de la Guía (lista vertical). Sólo presentación: muestra un
 * panel y oculta los otros, sin tocar lo que hay dentro — los ids de las
 * tarjetas siguen siendo los de siempre, así que pintar.ts escribe igual con el
 * panel oculto (mismo caso que un <details> colapsado). Patrón ARIA de
 * pestañas: tabindex itinerante y flechas (izquierda/derecha, o arriba/abajo
 * en la lista vertical). */
export interface ControlPestanas {
  /** Activa la pestaña por índice (0-based). */
  activar(indice: number): void;
}

export type OrientacionPestanas = 'horizontal' | 'vertical';

export function iniciarPestanas(lista: HTMLElement | null, orientacion: OrientacionPestanas = 'horizontal'): ControlPestanas | null {
  if (!lista) return null;
  const tabs = [...lista.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  if (tabs.length === 0) return null;

  const panelDe = (t: HTMLElement): HTMLElement | null => document.getElementById(t.getAttribute('aria-controls') ?? '');

  function activar(indice: number, enfocar: boolean): void {
    const activa = tabs[Math.max(0, Math.min(tabs.length - 1, indice))]!;
    for (const t of tabs) {
      const on = t === activa;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = panelDe(t);
      if (panel) panel.hidden = !on;
    }
    if (enfocar) activa.focus();
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => activar(i, false));
    t.addEventListener('keydown', (ev) => {
      const ultimo = tabs.length - 1;
      const siguiente = orientacion === 'vertical' ? 'ArrowDown' : 'ArrowRight';
      const anterior = orientacion === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
      const destino =
        ev.key === siguiente ? (i === ultimo ? 0 : i + 1)
        : ev.key === anterior ? (i === 0 ? ultimo : i - 1)
        : ev.key === 'Home' ? 0
        : ev.key === 'End' ? ultimo
        : null;
      if (destino === null) return;
      ev.preventDefault();
      activar(destino, true);
    });
  });

  activar(Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true')), false);
  return { activar: (indice) => activar(indice, false) };
}
