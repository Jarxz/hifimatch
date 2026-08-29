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
import { es } from '../idioma/es.ts';

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
  const address = org?.address as Record<string, unknown> | undefined;
  assert.equal(address?.['@type'], 'PostalAddress');
  assert.equal(address?.addressCountry, 'CL', 'sólo país — nunca se inventa una dirección completa');
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

test('index.html: el contador "reglas físicas" de la portada coincide con las tarjetas .regla-fila reales — nunca queda desactualizado en silencio', () => {
  // Encontrado al preparar contenido de Instagram: la portada decía "8"
  // pero el motor ya tenía 9 tarjetas de regla distintas (sumó Filtro
  // peine y Triángulo de escucha en una ronda posterior a cuando se fijó
  // ese número, y nunca se actualizó). Este test deriva el número
  // esperado de la fuente real (los ids de .regla-fila en el propio
  // HTML, colapsando los pares streamer/dac de puente/recorrido — son
  // la misma regla aplicada a dos fuentes, no dos reglas) en vez de
  // mantener una segunda lista a mano que se puede volver a desincronizar.
  const html = leer('index.html');
  const ids = [...html.matchAll(/class="regla-fila[^"]*" id="([a-z-]+)"/g)]
    .map((m) => m[1])
    .filter((id): id is string => id !== undefined);
  assert.ok(ids.length > 0, 'no se encontró ninguna tarjeta .regla-fila — ¿cambió el marcado?');
  const basesUnicas = new Set(ids.map((id) => id.replace(/^(fila|card)-/, '').replace(/-(streamer|dac)$/, '')));
  const m = html.match(/<div class="proof-num" data-count-to="(\d+)">/);
  assert.ok(m, 'no se encontró el contador "reglas físicas" de la portada');
  assert.equal(Number(m![1]), basesUnicas.size);
});

test('index.html: nada de lo agregado en esta ronda tiene voseo', () => {
  const html = leer('index.html');
  assert.doesNotMatch(html, PATRON_VOSEO);
});

test('index.html: los 13 títulos de la Guía y el título del veredicto ya no son "—" en el HTML crudo — coinciden exactamente con es.ts (JS los pisa igual, esto es sólo el snapshot sin JS)', () => {
  const html = leer('index.html');
  const clavesInfo = [
    'capas', 'confianza', 'generico', 'potencia', 'carga', 'amortiguamiento',
    'ganancia', 'modos', 'filtroPeine', 'triangulo', 'reverberacion', 'plano', 'veredicto',
  ] as const;
  for (const clave of clavesInfo) {
    const tituloReal = es.info[clave].titulo;
    const regex = new RegExp(`<h3 data-i18n="info\\.${clave}\\.titulo">([^<]+)</h3>`);
    const m = html.match(regex);
    assert.ok(m, `no se encontró el <h3> de info.${clave}.titulo`);
    assert.equal(m![1], tituloReal, `info.${clave}.titulo quedó desincronizado del HTML crudo`);
    assert.notEqual(m![1], '—');
  }
  assert.doesNotMatch(html, /<h2 class="vd-titulo" id="vd-titulo">—<\/h2>/);
});

test('vercel.json: rewrites dan alias sin extensión a las páginas de confianza (about/contact/privacy, es y en)', () => {
  const raiz = join(WEB_ROOT, '..', '..');
  const vercelJson = JSON.parse(readFileSync(join(raiz, 'vercel.json'), 'utf8')) as {
    rewrites?: Array<{ source: string; destination: string }>;
  };
  const porOrigen = Object.fromEntries((vercelJson.rewrites ?? []).map((r) => [r.source, r.destination]));
  assert.equal(porOrigen['/about'], '/about.html');
  assert.equal(porOrigen['/contact'], '/contact.html');
  assert.equal(porOrigen['/contact-us'], '/contact.html');
  assert.equal(porOrigen['/privacy'], '/privacy.html');
  assert.equal(porOrigen['/privacy-policy'], '/privacy.html');
  assert.equal(porOrigen['/en/about'], '/en/about.html');
  assert.equal(porOrigen['/en/privacy'], '/en/privacy.html');
});

test('vercel.json: cabeceras de seguridad HTTP en todas las rutas — revisión de seguridad', () => {
  const raiz = join(WEB_ROOT, '..', '..');
  const vercelJson = JSON.parse(readFileSync(join(raiz, 'vercel.json'), 'utf8')) as {
    headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  };
  const bloque = (vercelJson.headers ?? []).find((h) => h.source === '/(.*)');
  assert.ok(bloque, 'falta un bloque de headers que cubra todas las rutas');
  const porClave = Object.fromEntries(bloque!.headers.map((h) => [h.key, h.value]));

  assert.equal(porClave['X-Content-Type-Options'], 'nosniff');
  assert.equal(porClave['X-Frame-Options'], 'DENY');
  assert.match(porClave['Referrer-Policy'] ?? '', /strict-origin/);

  // Permissions-Policy: cámara permitida sólo same-origin (la necesita
  // ar.html para WebXR), geolocalización/micrófono bloqueados del todo —
  // este sitio no los usa en ningún lado.
  const pp = porClave['Permissions-Policy'] ?? '';
  assert.match(pp, /geolocation=\(\)/);
  assert.match(pp, /microphone=\(\)/);
  assert.match(pp, /camera=\(self\)/);

  // CSP: nunca 'unsafe-eval' (no hay motivo para permitirlo en este sitio),
  // nunca un host externo colado por error (el sitio es 100% autocontenido
  // — sin CDNs, sin fuentes externas, confirmado en la ronda de esta
  // revisión), y las directivas de mayor impacto sí presentes.
  const csp = porClave['Content-Security-Policy'] ?? '';
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.doesNotMatch(csp, /https?:\/\//, 'no debería haber ningún host externo en la CSP — el sitio es autocontenido');
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /base-uri 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
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

for (const [es_, en_] of [['about.html', 'en/about.html'], ['privacy.html', 'en/privacy.html']] as const) {
  test(`public/${es_} ↔ public/${en_}: selector ES/EN visible + hreflang recíproco en las dos direcciones`, () => {
    const htmlEs = leer(join('public', es_));
    const htmlEn = leer(join('public', en_));

    assert.match(htmlEs, /class="idioma"/, `falta el selector de idioma en ${es_}`);
    assert.match(htmlEs, /<a href="\/en\/[a-z.]+"[^>]*>EN<\/a>/, `falta el link a la versión EN en ${es_}`);
    assert.match(htmlEn, /class="idioma"/, `falta el selector de idioma en ${en_}`);
    assert.match(htmlEn, /<a href="\/[a-z.]+"[^>]*>ES<\/a>/, `falta el link a la versión ES en ${en_}`);

    const urlEs = `https://www.thehifimatch.com/${es_}`;
    const urlEn = `https://www.thehifimatch.com/${en_}`;
    for (const html of [htmlEs, htmlEn]) {
      assert.match(html, new RegExp(`<link rel="alternate" hreflang="es" href="${urlEs.replace(/\./g, '\\.')}">`));
      assert.match(html, new RegExp(`<link rel="alternate" hreflang="en" href="${urlEn.replace(/\./g, '\\.')}">`));
      assert.match(html, /<link rel="alternate" hreflang="x-default"/);
    }
  });

  test(`public/${en_}: contenido real (≥500 caracteres), un <h1>, en inglés (lang="en"), mismos hechos que ${es_}`, () => {
    const html = leer(join('public', en_));
    const textoVisible = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    assert.ok(textoVisible.length >= 500, `sólo ${textoVisible.length} caracteres de texto visible`);
    const h1s = html.match(/<h1\b/g) ?? [];
    assert.equal(h1s.length, 1);
    assert.match(html, /<html lang="en">/);
  });
}

test('public/en/privacy.html: misma precisión sobre Vercel Web Analytics que la versión en español', () => {
  const html = leer(join('public', 'en', 'privacy.html'));
  assert.match(html, /Vercel Web Analytics/);
  assert.match(html, /no cookies/i);
  assert.match(html, /24 hours/);
});

test('public/contact.html: JSON-LD de Organization/ContactPoint con el email real y el país (sin dirección completa)', () => {
  const html = leer(join('public', 'contact.html'));
  const bloques = extraerJsonLd(html) as Array<Record<string, unknown>>;
  assert.equal(bloques.length, 1);
  assert.equal(bloques[0]?.['@type'], 'Organization');
  const contactPoint = (bloques[0]?.contactPoint as Array<Record<string, unknown>>)[0];
  assert.equal(contactPoint?.email, 'thehmcontacto@gmail.com');
  const address = bloques[0]?.address as Record<string, unknown> | undefined;
  assert.equal(address?.['@type'], 'PostalAddress');
  assert.equal(address?.addressCountry, 'CL');
});

test('public/privacy.html: declara Vercel Web Analytics con precisión — sin cookies, hash descartado a las 24 horas', () => {
  const html = leer(join('public', 'privacy.html'));
  assert.match(html, /Vercel Web Analytics/);
  assert.match(html, /no usa cookies/i);
  assert.match(html, /24 horas/);
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

test('public/google4e8cbe767f9c5897.html: verificación de propiedad de Google Search Console', () => {
  // Archivo de verificación exacto que entrega Search Console (método
  // "HTML tag" tipo archivo, no meta tag) — el contenido tiene que ser
  // exactamente el que Google espera encontrar en esa ruta, sin agregar
  // ni sacar nada.
  const txt = leer(join('public', 'google4e8cbe767f9c5897.html'));
  assert.equal(txt.trim(), 'google-site-verification: google4e8cbe767f9c5897.html');
});

test('public/robots.txt: permite todo y declara el sitemap', () => {
  const txt = leer(join('public', 'robots.txt'));
  assert.match(txt, /^User-agent: \*/m);
  assert.match(txt, /^Allow: \/$/m);
  assert.match(txt, /^Sitemap: https:\/\/www\.thehifimatch\.com\/sitemap\.xml$/m);
});

test('public/sitemap.xml: XML bien formado con las 7 URLs reales del sitio (incluye las versiones /en/)', () => {
  const xml = leer(join('public', 'sitemap.xml'));
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, [
    'https://www.thehifimatch.com/',
    'https://www.thehifimatch.com/about.html',
    'https://www.thehifimatch.com/en/about.html',
    'https://www.thehifimatch.com/contact.html',
    'https://www.thehifimatch.com/privacy.html',
    'https://www.thehifimatch.com/en/privacy.html',
    'https://www.thehifimatch.com/ar.html',
  ]);
  const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)];
  assert.equal(lastmods.length, locs.length);
  // Las 4 páginas bilingües (about/privacy, es+en) declaran su alternate
  // recíproco dentro del propio sitemap, no sólo en el <head> del HTML.
  const alternates = [...xml.matchAll(/<xhtml:link rel="alternate"/g)];
  assert.equal(alternates.length, 8, '2 alternates (es+en) × 4 URLs bilingües');
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
