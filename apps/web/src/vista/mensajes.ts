/**
 * HTML puro para el muro de mensajes públicos — mismo patrón que
 * `vista/resultadosBusqueda.ts`: arma strings de HTML sin tocar
 * `document`, así corre con `node --test`. El pintado real (asignar a
 * `.innerHTML`) vive en `main.ts`.
 *
 * Este archivo es el punto real de defensa contra XSS de todo el
 * feature: `nombre`/`mensaje` los escribe cualquier visitante y se
 * muestran a TODOS los demás — a diferencia del formulario de Contacto
 * (que sólo llega a un email privado), acá un `<script>` sin escapar
 * se ejecutaría en el navegador de otra persona. Toda interpolación
 * pasa por `escapeHtml()`, sin excepciones.
 */
import type { MensajePublico } from '../../../../packages/mensajes/src/mensajes.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { textosDe } from '../idioma/idioma.ts';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatearFecha(creadoEnMs: number, idioma: Idioma): string {
  return new Date(creadoEnMs).toLocaleDateString(idioma === 'es' ? 'es-CL' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Escapar PRIMERO, recién después convertir `\n` en `<br>` — nunca al
 * revés (invertir el orden dejaría pasar un `<br>` real escrito por el
 * propio visitante como HTML válido, sin que sea el que este código
 * generó). */
function cuerpoMensajeHtml(mensaje: string): string {
  return escapeHtml(mensaje).replace(/\n/g, '<br>');
}

function filaMensaje(m: MensajePublico, idioma: Idioma): string {
  const t = textosDe(idioma).mensajes;
  const nombre = m.nombre.trim() || t.anonimo;
  return (
    `<article class="mensaje-item">` +
    `<div class="mensaje-cabecera"><span class="mensaje-nombre">${escapeHtml(nombre)}</span>` +
    `<time class="mensaje-fecha">${escapeHtml(formatearFecha(m.creadoEnMs, idioma))}</time></div>` +
    `<p class="mensaje-texto">${cuerpoMensajeHtml(m.mensaje)}</p>` +
    `</article>`
  );
}

export function listaMensajesHtml(mensajes: readonly MensajePublico[], idioma: Idioma): string {
  if (mensajes.length === 0) {
    return `<p class="mensajes-estado mensajes-vacio">${escapeHtml(textosDe(idioma).mensajes.vacio)}</p>`;
  }
  return mensajes.map((m) => filaMensaje(m, idioma)).join('');
}

export function estadoCargandoMensajesHtml(idioma: Idioma): string {
  return `<p class="mensajes-estado">${escapeHtml(textosDe(idioma).mensajes.cargando)}</p>`;
}

export function estadoErrorMensajesHtml(idioma: Idioma): string {
  return `<p class="mensajes-estado">${escapeHtml(textosDe(idioma).mensajes.errorCarga)}</p>`;
}

export function estadoFileProtocolMensajesHtml(idioma: Idioma): string {
  return `<p class="mensajes-estado">${escapeHtml(textosDe(idioma).mensajes.fileProtocolAviso)}</p>`;
}
