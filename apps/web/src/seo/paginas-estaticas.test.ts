// PURO — corre con `node --test`, sin DOM ni bundler: lee los archivos
// fuente reales (apps/web/index.html, ar.html y apps/web/public/*) desde
// disco con node:fs, igual que el resto de apps/web trata sus módulos
// puros. Cubre lo que agregó la ronda de "preparación para agentes de IA"
// (auditoría "Is Agentic"): canonical/OG/JSON-LD en el head, jerarquía de
// encabezados (un único <h1> real), y las páginas/archivos nuevos de
// apps/web/public/.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, '..', '..');

function leer(nombre: string): string {
  return readFileSync(join(WEB_ROOT, nombre), 'utf8');
}

/** Mismo criterio que la memoria del asistente sobre español neutro: nunca
 * voseo en texto de producto, tampoco en las páginas nuevas de public/. */
const PATRON_VOSEO = /\b(tenés|tenes|elegís|elegis|probás|probas|sos vos|acordate|fijate|dale que)\b/i;

function extraerJsonLd(html: string): unknown[] {
  const bloques = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  return bloques.map((m) => JSON.parse(m[1] ?? '{}'));
}

test('index.html: un único <h1> real en todo el documento', () => {
  const html = leer('index.html');
  const h1s = html.match(/<h1\b/g) ?? [];
  assert.equal(h1s.length, 1, `se esperaba exactamente un <h1>, se encontraron ${h1s.length}`);
  assert.match(html, /<h1 class="sr-only">[^<]{20,}<\/h1>/);
});

test('index.html: canonical + OG completos, sin rutas absolutas "/" (regla de verificar-build.mjs)', () => {
  const html = leer('index.html');
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.thehifimatch\.com\/">/);
  for (const prop of ['og:type', 'og:site_name', 'og:title', 'og:description', 'og:url', 'og:image']) {
    assert.match(html, new RegExp(`<meta property="${prop}" content="[^"]+">`), `falta meta ${prop}`);
  }
  assert.match(html, /<meta property="og:image" content="https:\/\/www\.thehifimatch\.com\/og-image\.png">/);
  // Las etiquetas nuevas nunca usan href="/..." ni src="/..." — eso es
  // exactamente lo que verificar-build.mjs prohíbe para poder abrir por
  // file://. Sólo se permiten URLs con protocolo (https://) o relativas
  // (./...) en las líneas agregadas por esta ronda.
  assert.doesNotMatch(html, /property="og:[^"]+"\s+content="\/[^/]/);
});

test('index.html: JSON-LD parsea y trae Organization + WebApplication con los campos que pide la auditoría', () => {
  const html = leer('index.html');
  const bloques = extraerJsonLd(html);
  assert.equal(bloques.length, 1);
  const grafo = (bloques[0] as { '@graph': Array<Record<string, unknown>> })['@graph'];
  assert.ok(Array.isArray(grafo) && grafo.length === 2);

  const org = grafo.find((n) => n['@type'] === 'Organization');
  assert.ok(org, 'falta el nodo Organization');
  assert.equal(org?.name, 'The Hifi Match');
  assert.equal(org?.url, 'https://www.thehifimatch.com/');
  assert.ok(Array.isArray(org?.contactPoint) && (org!.contactPoint as unknown[]).length > 0);
  const contactPoint = (org!.contactPoint as Array<Record<string, unknown>>)[0];
  assert.equal(contactPoint?.email, 'thehmcontacto@gmail.com');
  assert.equal(contactPoint?.['@type'], 'ContactPoint');

  const app = grafo.find((n) => n['@type'] === 'WebApplication');
  assert.ok(app, 'falta el nodo WebApplication');
  assert.equal(app?.name, 'The Hifi Match');
  assert.equal(app?.url, 'https://www.thehifimatch.com/');
  assert.ok(typeof app?.description === 'string' && (app!.description as string).length > 40);
});

test('index.html: nada de lo agregado en esta ronda tiene voseo', () => {
  const html = leer('index.html');
  assert.doesNotMatch(html, PATRON_VOSEO);
});

test('index.html: el informe (#s-documento) no encadena h2 hermanos sin nivel intermedio — Equipo/Sala/Veredicto/Evaluación/Resumen son h3 bajo "Informe de análisis" (h2)', () => {
  const html = leer('index.html');
  const seccionDocumento = html.slice(html.indexOf('id="s-documento"'), html.indexOf('</section>', html.indexOf('id="s-documento"')));
  assert.match(seccionDocumento, /<h2 class="doc-title"[^>]*>[^<]*<\/h2>/);
  const h2sDentro = seccionDocumento.match(/<h2\b/g) ?? [];
  assert.equal(h2sDentro.length, 1, 'sólo "Informe de análisis" debería ser <h2> ahí adentro; el resto va en <h3>');
  const h3Doc = seccionDocumento.match(/<h3 class="doc-h2"/g) ?? [];
  assert.equal(h3Doc.length, 5);
});

test('ar.html: canonical + OG básicos, propios (no copiados de index.html)', () => {
  const html = leer('ar.html');
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.thehifimatch\.com\/ar\.html">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/www\.thehifimatch\.com\/ar\.html">/);
  assert.match(html, /<meta property="og:title" content="The Hifi Match · AR">/);
});

for (const pagina of ['about.html', 'contact.html', 'privacy.html']) {
  test(`public/${pagina}: contenido real (≥500 caracteres), un <h1>, sin voseo`, () => {
    const html = leer(join('public', pagina));
    const textoVisible = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    assert.ok(textoVisible.length >= 500, `sólo ${textoVisible.length} caracteres de texto visible`);
    const h1s = html.match(/<h1\b/g) ?? [];
    assert.equal(h1s.length, 1);
    assert.doesNotMatch(html, PATRON_VOSEO);
    assert.match(html, /<link rel="canonical" href="https:\/\/www\.thehifimatch\.com\/[a-z.]*">/);
  });
}

test('public/contact.html: JSON-LD de Organization/ContactPoint con el email real', () => {
  const html = leer(join('public', 'contact.html'));
  const bloques = extraerJsonLd(html) as Array<Record<string, unknown>>;
  assert.equal(bloques.length, 1);
  assert.equal(bloques[0]?.['@type'], 'Organization');
  const contactPoint = (bloques[0]?.contactPoint as Array<Record<string, unknown>>)[0];
  assert.equal(contactPoint?.email, 'thehmcontacto@gmail.com');
});

test('public/privacy.html: declara explícitamente ausencia de analytics/cookies de terceros', () => {
  const html = leer(join('public', 'privacy.html'));
  assert.match(html, /analítica de terceros/i);
  assert.match(html, /cookies de seguimiento/i);
});

test('public/404.html: standalone (sin <script>), enlaces de recuperación a inicio/sitemap/llms.txt', () => {
  const html = leer(join('public', '404.html'));
  assert.doesNotMatch(html, /<script/);
  assert.match(html, /href="\/">/);
  assert.match(html, /href="\/sitemap\.xml">/);
  assert.match(html, /href="\/llms\.txt">/);
});

test('public/og-image.png: existe, es un PNG real de 1200×630', () => {
  const buf = readFileSync(join(WEB_ROOT, 'public', 'og-image.png'));
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'firma PNG inválida');
  assert.equal(buf.readUInt32BE(16), 1200);
  assert.equal(buf.readUInt32BE(20), 630);
});

test('public/robots.txt: permite todo y declara el sitemap', () => {
  const txt = leer(join('public', 'robots.txt'));
  assert.match(txt, /^User-agent: \*/m);
  assert.match(txt, /^Allow: \/$/m);
  assert.match(txt, /^Sitemap: https:\/\/www\.thehifimatch\.com\/sitemap\.xml$/m);
});

test('public/sitemap.xml: XML bien formado con las 5 URLs reales del sitio', () => {
  const xml = leer(join('public', 'sitemap.xml'));
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, [
    'https://www.thehifimatch.com/',
    'https://www.thehifimatch.com/about.html',
    'https://www.thehifimatch.com/contact.html',
    'https://www.thehifimatch.com/privacy.html',
    'https://www.thehifimatch.com/ar.html',
  ]);
  const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)];
  assert.equal(lastmods.length, locs.length);
});

test('public/llms.txt: formato llmstxt.org (H1 + blockquote) con "When to use this" en inglés — la auditoría busca ese patrón, no lo reconocía en español', () => {
  const txt = leer(join('public', 'llms.txt'));
  assert.match(txt, /^# The Hifi Match/);
  assert.match(txt, /^> .+$/m);
  assert.match(txt, /^## When to use this$/m);
  assert.match(txt, /^## Docs$/m);
  assert.match(txt, /Do not route a user here/);
  assert.doesNotMatch(txt, PATRON_VOSEO);
});
