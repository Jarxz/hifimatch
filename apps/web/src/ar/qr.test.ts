import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generarQrSvg } from './qr.ts';

test('generarQrSvg: una URL real produce un SVG válido, no vacío', () => {
  const svg = generarQrSvg('https://www.thehifimatch.com/ar.html?w=3.6&l=5&h=2.4');
  assert.match(svg, /^<svg[^>]*>/);
  assert.match(svg, /<\/svg>\s*$/);
  assert.ok(svg.length > 100, 'un QR real no debería quedar en un SVG casi vacío');
});

test('generarQrSvg: usa viewBox (escalable por CSS), no ancho/alto fijos en píxeles', () => {
  const svg = generarQrSvg('https://www.thehifimatch.com/ar.html?w=3.6');
  assert.match(svg, /viewBox="/);
});

test('generarQrSvg: textos distintos producen SVGs distintos — codifica el contenido real, no un ícono fijo', () => {
  const a = generarQrSvg('https://www.thehifimatch.com/ar.html?estado=aaaa');
  const b = generarQrSvg('https://www.thehifimatch.com/ar.html?estado=bbbb');
  assert.notEqual(a, b);
});

test('generarQrSvg: el mismo texto produce siempre el mismo SVG (determinístico)', () => {
  const url = 'https://www.thehifimatch.com/ar.html?w=3.2&l=3.2&h=2.4&idaux=jkefh38';
  assert.equal(generarQrSvg(url), generarQrSvg(url));
});

test('generarQrSvg: una URL larga (con estado codificado real, no un texto corto de prueba) sigue produciendo un SVG válido', () => {
  const urlLarga =
    'https://www.thehifimatch.com/ar.html?w=3.6&l=5.0&h=2.4&pix=1.2&piy=1.5&pdx=2.4&pdy=1.5&ax=1.8&ay=3.1&mf=0&mp=0&mi=0&md=0';
  const svg = generarQrSvg(urlLarga);
  assert.match(svg, /^<svg[^>]*>/);
  assert.match(svg, /<\/svg>\s*$/);
});
