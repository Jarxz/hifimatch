import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { es } from './es.ts';
import { en } from './en.ts';
import { leerRuta } from './idioma.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
// apps/web/src/idioma/idioma.test.ts -> apps/web/index.html
const HTML = readFileSync(join(__dirname, '..', '..', 'index.html'), 'utf8');

function extraerClaves(atributo: string): string[] {
  const re = new RegExp(`${atributo}="([^"]+)"`, 'g');
  return [...HTML.matchAll(re)].map((m) => m[1]!);
}

const CLAVES_TEXTO = extraerClaves('data-i18n');
const CLAVES_HTML = extraerClaves('data-i18n-html');
const CLAVES_ARIA = extraerClaves('data-i18n-aria');
const TODAS = [...new Set([...CLAVES_TEXTO, ...CLAVES_HTML, ...CLAVES_ARIA])];

test('index.html tiene al menos un data-i18n (guardia contra una regex rota o un archivo vacío)', () => {
  assert.ok(TODAS.length > 10, `sólo se encontraron ${TODAS.length} claves`);
});

test('cada clave data-i18n de index.html resuelve en "es" y en "en", sin string vacío', () => {
  for (const clave of TODAS) {
    const valorEs = leerRuta(es, clave);
    const valorEn = leerRuta(en, clave);
    assert.ok(valorEs.trim().length > 0, `es.${clave} está vacío`);
    assert.ok(valorEn.trim().length > 0, `en.${clave} está vacío`);
  }
});

test('leerRuta tira en vez de devolver undefined si la clave no existe (para que un typo se note al tiro)', () => {
  assert.throws(() => leerRuta(es, 'esto.no.existe'));
});

test('leerRuta tira si la clave resuelve a un objeto o función, no a un string', () => {
  assert.throws(() => leerRuta(es, 'motor.potencia')); // objeto, no string
  assert.throws(() => leerRuta(es, 'motor.potencia.conMargen')); // función, no string
});

test('data-i18n-html sólo se usa donde el texto realmente lleva HTML (footer + guía de conceptos)', () => {
  assert.deepEqual(CLAVES_HTML, [
    'splash.cierreHtml',
    'resultado.plano.hintArrastreHtml',
    'resultado.footer.html',
    'info.capas.cuerpoHtml',
    'info.confianza.cuerpoHtml',
    'info.potencia.cuerpoHtml',
    'info.carga.cuerpoHtml',
    'info.ganancia.cuerpoHtml',
    'info.modos.cuerpoHtml',
    'info.reverberacion.cuerpoHtml',
    'info.plano.cuerpoHtml',
    'info.puntaje.cuerpoHtml',
  ]);
});
