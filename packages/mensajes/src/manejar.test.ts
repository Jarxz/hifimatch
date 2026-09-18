import { test } from 'node:test';
import assert from 'node:assert/strict';
import { manejarMensaje, TIEMPO_MINIMO_MS, LARGO_MAXIMO_NOMBRE } from './mensajes.ts';
import type { EntradaMensaje, DatosMensaje, ResultadoGuardado } from './mensajes.ts';

function entradaValida(overrides: Partial<EntradaMensaje> = {}): EntradaMensaje {
  const cargadoEnMs = 1_000_000;
  return {
    nombre: 'Ana',
    email: 'ana@example.com',
    mensaje: 'Gracias por el análisis, muy útil.',
    honeypot: '',
    cargadoEnMs,
    enviadoEnMs: cargadoEnMs + TIEMPO_MINIMO_MS + 500,
    ...overrides,
  };
}

/** Fake que sólo graba con qué se lo llamó — sin red, sin Redis real. */
function guardarMensajeFake(resultado: ResultadoGuardado = { ok: true, id: 'id-1' }) {
  const llamadas: DatosMensaje[] = [];
  const guardarMensaje = async (datos: DatosMensaje): Promise<ResultadoGuardado> => {
    llamadas.push(datos);
    return resultado;
  };
  return { guardarMensaje, llamadas };
}

test('entrada válida → ok:true, guardarMensaje llamado con los datos saneados', async () => {
  const { guardarMensaje, llamadas } = guardarMensajeFake();
  const r = await manejarMensaje(entradaValida(), { guardarMensaje });
  assert.deepEqual(r, { ok: true });
  assert.equal(llamadas.length, 1);
  assert.deepEqual(llamadas[0], { nombre: 'Ana', email: 'ana@example.com', mensaje: 'Gracias por el análisis, muy útil.' });
});

test('honeypot lleno → ok:true de todas formas, pero guardarMensaje NUNCA se llama', async () => {
  const { guardarMensaje, llamadas } = guardarMensajeFake();
  const r = await manejarMensaje(entradaValida({ honeypot: 'asunto' }), { guardarMensaje });
  assert.deepEqual(r, { ok: true }, 'no hay que delatarle a un bot que fue detectado');
  assert.equal(llamadas.length, 0, 'un honeypot detectado no debería disparar un guardado real');
});

test('email inválido → ok:false con el código real, guardarMensaje no se llama', async () => {
  const { guardarMensaje, llamadas } = guardarMensajeFake();
  const r = await manejarMensaje(entradaValida({ email: 'no-es-un-email' }), { guardarMensaje });
  assert.deepEqual(r, { ok: false, codigo: 'email-invalido' });
  assert.equal(llamadas.length, 0);
});

test('mensaje vacío → ok:false "mensaje-vacio", guardarMensaje no se llama', async () => {
  const { guardarMensaje, llamadas } = guardarMensajeFake();
  const r = await manejarMensaje(entradaValida({ mensaje: '' }), { guardarMensaje });
  assert.deepEqual(r, { ok: false, codigo: 'mensaje-vacio' });
  assert.equal(llamadas.length, 0);
});

test('envío muy rápido → ok:false "muy-rapido", guardarMensaje no se llama', async () => {
  const { guardarMensaje, llamadas } = guardarMensajeFake();
  const cargadoEnMs = 1_000_000;
  const r = await manejarMensaje(entradaValida({ cargadoEnMs, enviadoEnMs: cargadoEnMs }), { guardarMensaje });
  assert.deepEqual(r, { ok: false, codigo: 'muy-rapido' });
  assert.equal(llamadas.length, 0);
});

test('nombre con \\r\\n: se sanea (espacio en vez de salto de línea) antes de llegar a guardarMensaje', async () => {
  const { guardarMensaje, llamadas } = guardarMensajeFake();
  const r = await manejarMensaje(entradaValida({ nombre: 'Ana\r\nOtra línea' }), { guardarMensaje });
  assert.deepEqual(r, { ok: true });
  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0]?.nombre.includes('\r'), false);
  assert.equal(llamadas[0]?.nombre.includes('\n'), false);
  assert.equal(llamadas[0]?.nombre, 'Ana Otra línea');
});

test('nombre demasiado largo: se recorta a LARGO_MAXIMO_NOMBRE antes de guardarMensaje', async () => {
  const { guardarMensaje, llamadas } = guardarMensajeFake();
  const nombreLargo = 'A'.repeat(500);
  const r = await manejarMensaje(entradaValida({ nombre: nombreLargo }), { guardarMensaje });
  assert.deepEqual(r, { ok: true });
  assert.equal(llamadas[0]?.nombre.length, LARGO_MAXIMO_NOMBRE);
});

test('el mensaje conserva sus saltos de línea internos — sólo el nombre los pierde', async () => {
  const { guardarMensaje, llamadas } = guardarMensajeFake();
  const r = await manejarMensaje(entradaValida({ mensaje: 'Primera línea\nSegunda línea' }), { guardarMensaje });
  assert.deepEqual(r, { ok: true });
  assert.equal(llamadas[0]?.mensaje, 'Primera línea\nSegunda línea');
});

test('guardarMensaje devolviendo "limite-alcanzado" se propaga tal cual', async () => {
  const { guardarMensaje } = guardarMensajeFake({ ok: false, codigo: 'limite-alcanzado' });
  const r = await manejarMensaje(entradaValida(), { guardarMensaje });
  assert.deepEqual(r, { ok: false, codigo: 'limite-alcanzado' });
});

test('si guardarMensaje tira (falla Redis), ok:false "error-servidor" — sin exponer el error interno', async () => {
  const guardarMensaje = async (): Promise<ResultadoGuardado> => {
    throw new Error('detalle interno que no debería llegar al cliente: token inválido');
  };
  const r = await manejarMensaje(entradaValida(), { guardarMensaje });
  assert.deepEqual(r, { ok: false, codigo: 'error-servidor' });
});
