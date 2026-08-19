import { test } from 'node:test';
import assert from 'node:assert/strict';
import { manejarContacto } from './contacto.ts';
import { TIEMPO_MINIMO_MS } from './contacto.ts';
import type { EntradaContacto } from './contacto.ts';
import type { DatosEmail } from './contacto.ts';

function entradaValida(overrides: Partial<EntradaContacto> = {}): EntradaContacto {
  const cargadoEnMs = 1_000_000;
  return {
    nombre: 'Ana',
    email: 'ana@example.com',
    mensaje: 'Hola, tengo una pregunta sobre el catálogo.',
    honeypot: '',
    cargadoEnMs,
    enviadoEnMs: cargadoEnMs + TIEMPO_MINIMO_MS + 500,
    ...overrides,
  };
}

/** Fake que sólo graba con qué se lo llamó — sin red, sin credenciales. */
function enviarEmailFake() {
  const llamadas: DatosEmail[] = [];
  const enviarEmail = async (datos: DatosEmail): Promise<void> => {
    llamadas.push(datos);
  };
  return { enviarEmail, llamadas };
}

test('entrada válida → ok:true, enviarEmail llamado con los datos esperados', async () => {
  const { enviarEmail, llamadas } = enviarEmailFake();
  const r = await manejarContacto(entradaValida(), { enviarEmail });
  assert.deepEqual(r, { ok: true });
  assert.equal(llamadas.length, 1);
  assert.deepEqual(llamadas[0], { nombre: 'Ana', email: 'ana@example.com', mensaje: 'Hola, tengo una pregunta sobre el catálogo.' });
});

test('honeypot lleno → ok:true de todas formas, pero enviarEmail NUNCA se llama', async () => {
  const { enviarEmail, llamadas } = enviarEmailFake();
  const r = await manejarContacto(entradaValida({ honeypot: 'asunto' }), { enviarEmail });
  assert.deepEqual(r, { ok: true }, 'no hay que delatarle a un bot que fue detectado');
  assert.equal(llamadas.length, 0, 'un honeypot detectado no debería disparar un email real');
});

test('email inválido → ok:false con el código real (no se disfraza como el honeypot), enviarEmail no se llama', async () => {
  const { enviarEmail, llamadas } = enviarEmailFake();
  const r = await manejarContacto(entradaValida({ email: 'no-es-un-email' }), { enviarEmail });
  assert.deepEqual(r, { ok: false, codigo: 'email-invalido' });
  assert.equal(llamadas.length, 0);
});

test('mensaje vacío → ok:false "mensaje-vacio", enviarEmail no se llama', async () => {
  const { enviarEmail, llamadas } = enviarEmailFake();
  const r = await manejarContacto(entradaValida({ mensaje: '' }), { enviarEmail });
  assert.deepEqual(r, { ok: false, codigo: 'mensaje-vacio' });
  assert.equal(llamadas.length, 0);
});

test('envío muy rápido → ok:false "muy-rapido", enviarEmail no se llama', async () => {
  const { enviarEmail, llamadas } = enviarEmailFake();
  const cargadoEnMs = 1_000_000;
  const r = await manejarContacto(entradaValida({ cargadoEnMs, enviadoEnMs: cargadoEnMs }), { enviarEmail });
  assert.deepEqual(r, { ok: false, codigo: 'muy-rapido' });
  assert.equal(llamadas.length, 0);
});

test('si enviarEmail rechaza (falla Resend), ok:false "error-servidor" — sin exponer el error interno', async () => {
  const enviarEmail = async (): Promise<void> => {
    throw new Error('detalle interno que no debería llegar al cliente: API key inválida');
  };
  const r = await manejarContacto(entradaValida(), { enviarEmail });
  assert.deepEqual(r, { ok: false, codigo: 'error-servidor' });
});
