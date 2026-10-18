// PURO — sin DOM. Texto de "Mis sistemas": la tarjeta de cada sistema guardado
// y el cuerpo de los cuadros de guardar / confirmar / eliminar. Todo lo que
// viene del usuario (el nombre del sistema) se escapa: el HTML se inyecta con
// innerHTML en un <dialog>.
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';
import type { CodigoGuardado, SistemaGuardado } from '../datos/sistemasGuardados.ts';
import { LARGO_MAX_NOMBRE, sanearNombre } from '../datos/sistemasGuardados.ts';
import { textosDe } from '../idioma/idioma.ts';
import { num } from '../formato/numeros.ts';

export interface TarjetaSistema {
  id: string;
  nombre: string;
  fechaTexto: string;
  equipos: string;
  sala: string;
  escucha: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const nombreDe = (lista: readonly { id: string; nombre: string }[], id: string | null): string | null =>
  id === null ? null : (lista.find((x) => x.id === id)?.nombre ?? null);

/** "Parlante + amplificador [+ streamer] [+ DAC]" con los nombres del catálogo. */
export function equiposDe(s: SistemaGuardado): string {
  const c = s.config;
  return [
    nombreDe(CATALOGO.parlantes, c.spk),
    nombreDe(CATALOGO.amplificadores, c.amp),
    nombreDe(CATALOGO.streamers, c.streamer),
    nombreDe(CATALOGO.dacs, c.dac),
  ]
    .filter((n): n is string => n !== null)
    .join(' + ');
}

export function modeloTarjetaSistema(s: SistemaGuardado, idioma: Idioma): TarjetaSistema {
  const t = textosDe(idioma).config;
  const nivel = { mod: t.nivelModerado, alto: t.nivelAlto, ref: t.nivelReferencia }[s.config.lvl];
  const genero = ({ rockpop: t.generoRockPop, jazzvocal: t.generoJazzVocal, clasica: t.generoClasica } as Record<string, string>)[s.config.genero] ?? s.config.genero;
  return {
    id: s.id,
    nombre: s.nombre,
    fechaTexto: new Date(s.guardadoEn).toLocaleDateString(idioma === 'es' ? 'es-CL' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
    equipos: equiposDe(s),
    sala: `${num(s.config.W, 1, idioma)} × ${num(s.config.L, 1, idioma)} × ${num(s.config.H, 2, idioma)} m`,
    escucha: `${nivel} · ${genero}`,
  };
}

/** Nombre que se propone al guardar: "Parlante + amplificador", acotado. */
export function nombreSugerido(spkNombre: string, ampNombre: string): string {
  return sanearNombre(`${spkNombre} + ${ampNombre}`) ?? '';
}

export function cuerpoGuardarHtml(sugerido: string, idioma: Idioma): string {
  const t = textosDe(idioma).sistemas;
  return (
    `<form id="form-guardar-sistema" class="popup-form" novalidate>` +
    `<label for="gs-nombre">${escapeHtml(t.guardarNombre)}</label>` +
    `<input type="text" id="gs-nombre" name="nombre" maxlength="${LARGO_MAX_NOMBRE}" autocomplete="off" value="${escapeHtml(sugerido)}">` +
    `<p class="popup-nota">${escapeHtml(t.guardarNota)}</p>` +
    `<p class="popup-error hidden" id="gs-error" role="alert"></p>` +
    `<div class="popup-acciones">` +
    `<button type="button" class="pc-btn-linea" data-popup-accion="cerrar">${escapeHtml(t.cancelar)}</button>` +
    `<button type="submit" class="pc-cta"><span>${escapeHtml(t.guardar)}</span></button>` +
    `</div></form>`
  );
}

export function cuerpoGuardadoHtml(nombre: string, idioma: Idioma): string {
  const t = textosDe(idioma).sistemas;
  return (
    `<p>${escapeHtml(t.guardadoTexto({ nombre }))}</p>` +
    `<div class="popup-acciones">` +
    `<button type="button" class="pc-btn-linea" data-popup-accion="cerrar">${escapeHtml(t.cerrar)}</button>` +
    `<button type="button" class="pc-cta" data-popup-accion="ir-sistemas"><span>${escapeHtml(t.verSistemas)}</span><span aria-hidden="true">↗</span></button>` +
    `</div>`
  );
}

export function cuerpoEliminarHtml(id: string, nombre: string, idioma: Idioma): string {
  const t = textosDe(idioma).sistemas;
  return (
    `<p>${escapeHtml(t.eliminarTexto({ nombre }))}</p>` +
    `<div class="popup-acciones">` +
    `<button type="button" class="pc-btn-linea" data-popup-accion="cerrar">${escapeHtml(t.conservar)}</button>` +
    `<button type="button" class="pc-cta" data-popup-accion="eliminar" data-id="${escapeHtml(id)}"><span>${escapeHtml(t.eliminar)}</span></button>` +
    `</div>`
  );
}

export function cuerpoErrorHtml(codigo: CodigoGuardado, idioma: Idioma): string {
  const t = textosDe(idioma).sistemas;
  return (
    `<p>${escapeHtml(t.error[codigo])}</p>` +
    `<div class="popup-acciones"><button type="button" class="pc-btn-linea" data-popup-accion="cerrar">${escapeHtml(t.cerrar)}</button></div>`
  );
}
