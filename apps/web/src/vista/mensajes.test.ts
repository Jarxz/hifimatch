import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listaMensajesHtml, estadoCargandoMensajesHtml, estadoErrorMensajesHtml, estadoFileProtocolMensajesHtml } from './mensajes.ts';
import type { MensajePublico } from '../../../../packages/mensajes/src/mensajes.ts';

function mensaje(overrides: Partial<MensajePublico> = {}): MensajePublico {
  return { id: 'id-1', nombre: 'Ana', mensaje: 'Gracias por el análisis.', creadoEnMs: 1_700_000_000_000, ...overrides };
}

test('listaMensajesHtml: lista vacía muestra el texto de "sin mensajes", nunca un string vacío', () => {
  const html = listaMensajesHtml([], 'es');
  assert.ok(html.includes('Todavía no hay mensajes'), html);
});

test('listaMensajesHtml: lista vacía en inglés, sin mezclar idiomas', () => {
  const html = listaMensajesHtml([], 'en');
  assert.ok(html.includes('No messages yet') || /no messages/i.test(html), html);
  assert.ok(!/todavía/i.test(html), html);
});

test('listaMensajesHtml: un mensaje real muestra nombre, fecha y texto', () => {
  const html = listaMensajesHtml([mensaje()], 'es');
  assert.ok(html.includes('Ana'), html);
  assert.ok(html.includes('Gracias por el análisis.'), html);
  assert.ok(html.includes('mensaje-item'), html);
});

test('listaMensajesHtml: nombre vacío muestra "Anónimo"', () => {
  const html = listaMensajesHtml([mensaje({ nombre: '' })], 'es');
  assert.ok(html.includes('Anónimo'), html);
});

test('listaMensajesHtml: nombre vacío en inglés muestra "Anonymous"', () => {
  const html = listaMensajesHtml([mensaje({ nombre: '' })], 'en');
  assert.ok(/anonymous/i.test(html), html);
});

// El test más importante de este archivo: confirma que el muro público
// nunca ejecuta HTML/script que un visitante haya escrito.
test('listaMensajesHtml: escapa <script>/<img onerror> en nombre y mensaje — nunca los deja sin escapar', () => {
  const html = listaMensajesHtml(
    [mensaje({ nombre: '<script>alert(1)</script>', mensaje: '<img src=x onerror=alert(1)>' })],
    'es'
  );
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), html);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'), html);
  assert.ok(!html.includes('<script>alert(1)</script>'), html);
  assert.ok(!html.includes('<img src=x'), html);
});

test('listaMensajesHtml: un mensaje con salto de línea produce <br>, escapando primero (no al revés)', () => {
  // "<b>\n</b>" ya escapado da "&lt;b&gt;<br>&lt;/b&gt;" — si el orden
  // estuviera invertido (reemplazar \n por <br> y ESO escapar), el
  // resultado tendría "&lt;br&gt;" en vez de un <br> real.
  const html = listaMensajesHtml([mensaje({ mensaje: '<b>\n</b>' })], 'es');
  assert.ok(html.includes('&lt;b&gt;<br>&lt;/b&gt;'), html);
  assert.ok(!html.includes('<b><br></b>'), html);
  assert.ok(!html.includes('&lt;br&gt;'), html);
});

test('listaMensajesHtml: varios mensajes concatenan una fila por cada uno', () => {
  const html = listaMensajesHtml([mensaje({ id: '1', nombre: 'Uno' }), mensaje({ id: '2', nombre: 'Dos' })], 'es');
  assert.equal((html.match(/mensaje-item/g) ?? []).length, 2, html);
});

test('estadoCargandoMensajesHtml / estadoErrorMensajesHtml / estadoFileProtocolMensajesHtml: un párrafo de estado por idioma, sin mezclar', () => {
  assert.ok(estadoCargandoMensajesHtml('es').includes('Cargando'));
  assert.ok(!/loading/i.test(estadoCargandoMensajesHtml('es')));
  assert.ok(/loading/i.test(estadoCargandoMensajesHtml('en')));
  assert.ok(estadoErrorMensajesHtml('es').includes('mensajes-estado'));
  assert.ok(estadoFileProtocolMensajesHtml('es').includes('archivo local'));
  assert.ok(estadoFileProtocolMensajesHtml('en').toLowerCase().includes('local file'));
});
