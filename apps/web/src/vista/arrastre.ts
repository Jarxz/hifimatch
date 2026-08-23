/**
 * Arrastre de parlantes en el plano isométrico — sólo tiene sentido en la
 * vista Superior (`proyeccionSuperior` es la única proyección invertible
 * sin trigonometría: sx=x, sy=y en unidades de viewBox). Primer widget
 * interactivo con puntero del sitio; vive separado tanto de `plano.ts`
 * (que sigue puro, sin `document`) como de `pintar.ts` (que sólo asigna
 * `innerHTML`).
 *
 * Un solo listener delegado sobre el contenedor `#plan` sobrevive a cada
 * repintado del plano (pintarPlano sólo reemplaza `innerHTML`, no el
 * contenedor) — no hay que reconectar nada cuando el drag mismo dispara un
 * repintado. Por la misma razón, la captura de puntero se pide sobre el
 * contenedor, no sobre el elemento bajo el dedo/mouse en el momento del
 * `pointerdown`: ese elemento puede desaparecer del DOM en el próximo
 * frame (el propio repintado lo reemplaza), y perdería la captura con él.
 */
import type { Sala, Punto } from '../../../../packages/engine/src/sala.ts';
import { clampPosicionParlante } from '../../../../packages/engine/src/sala.ts';
import { proyeccionSuperior } from './plano.ts';

/** 'asiento' es el punto de escucha, arrastrable sólo con el candado
 * abierto (ver estado.ts/main.ts) — `plano.ts` sólo dibuja su `<g
 * data-parlante="asiento">` cuando corresponde, así que este módulo no
 * necesita conocer el estado del candado: si el grupo no está en el DOM,
 * `closest('[data-parlante]')` simplemente no lo encuentra y el gesto no
 * inicia arrastre. El mismo `clampPosicionParlante` (margen de muro) que ya
 * se aplica a los parlantes se reusa acá vía `puntoMetrosDesdeEvento` — el
 * asiento no necesita un clamp propio. */
export interface CallbacksArrastre {
  onMover(lado: 'izq' | 'der' | 'asiento', puntoM: Punto): void;
  onSoltar(): void;
}

export function activarArrastre(contenedor: HTMLElement, salaDe: () => Sala, editableAhora: () => boolean, cb: CallbacksArrastre): void {
  let ladoActivo: 'izq' | 'der' | 'asiento' | null = null;
  let ultimoPunto: Punto | null = null;
  let framePendiente = false;
  let touchActionPrevio: string | null = null;

  // Freno adicional a nivel documento, más allá del touch-action:none del
  // propio <svg>/<g>/círculo de agarre: el cómputo de touch-action por
  // "intersección con ancestros" del spec no siempre se respeta sobre
  // elementos SVG anidados en navegadores móviles reales (bug reportado en
  // producción — la página seguía scrolleando durante el arrastre, y ese
  // scroll paralelo hacía que getScreenCTM() devolviera un CTM en
  // movimiento, cortando el arrastre en vez de seguir al dedo). body es un
  // elemento HTML plano: touch-action ahí sí se respeta de forma
  // consistente. Se activa sólo mientras hay un lado activo y se restaura
  // al soltar — nunca deja la página bloqueada fuera del gesto de arrastre.
  function bloquearScrollPagina(): void {
    if (touchActionPrevio !== null) return;
    touchActionPrevio = document.body.style.touchAction;
    document.body.style.touchAction = 'none';
  }
  function restaurarScrollPagina(): void {
    if (touchActionPrevio === null) return;
    document.body.style.touchAction = touchActionPrevio;
    touchActionPrevio = null;
  }

  function puntoMetrosDesdeEvento(ev: PointerEvent): Punto | null {
    const svg = contenedor.querySelector('svg');
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    const local = pt.matrixTransform(ctm.inverse());
    const sala = salaDe();
    const { pad, scale } = proyeccionSuperior(sala);
    return clampPosicionParlante({ x: (local.x - pad) / scale, y: (local.y - pad) / scale }, sala);
  }

  function programarFrame(): void {
    if (framePendiente) return;
    framePendiente = true;
    requestAnimationFrame(() => {
      framePendiente = false;
      if (ladoActivo && ultimoPunto) cb.onMover(ladoActivo, ultimoPunto);
    });
  }

  function soltar(ev: PointerEvent): void {
    if (!ladoActivo) return;
    // Si todavía había un frame de rAF pendiente (arrastre rápido: el
    // pointerup llega antes de que corra el próximo frame), la última
    // posición se perdería sin este flush — soltar nunca debe dejar la
    // vista previa un paso atrás de donde el usuario realmente soltó.
    if (ultimoPunto) cb.onMover(ladoActivo, ultimoPunto);
    // La captura puede no haberse concedido (pointerId ya no activo, u otra
    // razón del UA) — liberar es sólo limpieza, nunca debe frenar el resto
    // del soltado.
    try {
      contenedor.releasePointerCapture?.(ev.pointerId);
    } catch {
      /* nada que hacer si nunca hubo captura */
    }
    ladoActivo = null;
    ultimoPunto = null;
    document.body.style.cursor = '';
    restaurarScrollPagina();
    cb.onSoltar();
  }

  contenedor.addEventListener(
    'pointerdown',
    (ev) => {
      if (!editableAhora()) return;
      const grupo = (ev.target as Element | null)?.closest('[data-parlante]');
      const lado = grupo?.getAttribute('data-parlante');
      if (lado !== 'izq' && lado !== 'der' && lado !== 'asiento') return;

      const punto = puntoMetrosDesdeEvento(ev);
      if (!punto) return;

      ladoActivo = lado;
      ultimoPunto = punto;
      try {
        contenedor.setPointerCapture?.(ev.pointerId);
      } catch {
        /* el arrastre sigue funcionando sin captura mientras el puntero no salga del SVG */
      }
      document.body.style.cursor = 'grabbing';
      bloquearScrollPagina();
      programarFrame();
      ev.preventDefault();
    },
    { passive: false }
  );

  // preventDefault también en cada pointermove, no sólo en el pointerdown:
  // en mobile, touch-action:none en el SVG no siempre alcanza para frenar
  // el scroll de la página una vez que el gesto ya está en curso — sin
  // este preventDefault, arrastrar un parlante también arrastraba la
  // página entera (bug real reportado en mobile).
  contenedor.addEventListener(
    'pointermove',
    (ev) => {
      if (!ladoActivo) return;
      ev.preventDefault();
      const punto = puntoMetrosDesdeEvento(ev);
      if (!punto) return;
      ultimoPunto = punto;
      programarFrame();
    },
    { passive: false }
  );

  contenedor.addEventListener('pointerup', soltar);
  contenedor.addEventListener('pointercancel', soltar);

  // Respaldo directo sobre el evento de touch crudo, además de todo lo de
  // arriba en Pointer Events: en algunos navegadores (variantes de Safari/
  // iOS en particular) el preventDefault de un pointermove sintetizado
  // desde touch no siempre alcanza a cancelar el scroll nativo asociado al
  // touchmove real — cancelar el touchmove mismo mientras hay un lado
  // activo es la única vía que ese navegador sí respeta con certeza.
  contenedor.addEventListener(
    'touchmove',
    (ev) => {
      if (ladoActivo) ev.preventDefault();
    },
    { passive: false }
  );
}
