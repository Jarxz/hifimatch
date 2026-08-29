import { test } from 'node:test';
import assert from 'node:assert/strict';
import middleware, { config, HOMEPAGE_MARKDOWN, prefiereMarkdown } from './middleware.ts';

test('prefiereMarkdown: true cuando el cliente sólo pide text/markdown (caso exacto de la auditoría)', () => {
  assert.equal(prefiereMarkdown('text/markdown'), true);
});

test('prefiereMarkdown: false sin header Accept', () => {
  assert.equal(prefiereMarkdown(null), false);
});

test('prefiereMarkdown: false cuando el navegador ofrece html/comodín sin q explícito', () => {
  assert.equal(prefiereMarkdown('text/html,application/xhtml+xml,*/*;q=0.8'), false);
});

test('prefiereMarkdown: respeta quality values explícitos entre markdown y html', () => {
  assert.equal(prefiereMarkdown('text/html;q=0.5,text/markdown;q=0.9'), true);
  assert.equal(prefiereMarkdown('text/html;q=0.9,text/markdown;q=0.5'), false);
});

test('HOMEPAGE_MARKDOWN: contenido real, formato llmstxt-like, enlaces clave, sin voseo', () => {
  assert.ok(HOMEPAGE_MARKDOWN.length >= 500, 'debe superar los 500 caracteres mínimos del ítem "contenido sin JavaScript"');
  assert.match(HOMEPAGE_MARKDOWN, /^# The Hifi Match/);
  assert.match(HOMEPAGE_MARKDOWN, /^> /m);
  assert.match(HOMEPAGE_MARKDOWN, /https:\/\/www\.thehifimatch\.com\/sitemap\.xml/);
  assert.doesNotMatch(HOMEPAGE_MARKDOWN, /\b(tenés|tenes|elegís|elegis|probás|probas|sos vos|dale)\b/i);
});

test('config.matcher: sólo la portada', () => {
  assert.deepEqual(config, { matcher: '/' });
});

test('middleware(): responde markdown real con Vary cuando Accept lo pide', async () => {
  const req = new Request('https://www.thehifimatch.com/', { headers: { accept: 'text/markdown' } });
  const res = middleware(req);
  assert.equal(res.headers.get('content-type'), 'text/markdown; charset=utf-8');
  assert.equal(res.headers.get('vary'), 'Accept, Accept-Encoding');
  assert.equal(await res.text(), HOMEPAGE_MARKDOWN);
});

test('middleware(): en la ruta normal (HTML) agrega Vary sin romper', () => {
  const req = new Request('https://www.thehifimatch.com/', { headers: { accept: 'text/html' } });
  const res = middleware(req);
  assert.ok(res instanceof Response);
  assert.equal(res.headers.get('vary'), 'Accept, Accept-Encoding');
});
