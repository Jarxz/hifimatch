// Guardia post-build: falla si dist/index.html dejó de ser un archivo único
// autocontenido. Corre DENTRO de `npm run build` (no aparte, no opcional) —
// si vite-plugin-singlefile cambia de comportamiento en una versión futura,
// esto tiene que reventar el build, no descubrirse abriendo un navegador.
// Este proyecto ya se quemó una vez exactamente así (ver CLAUDE.md).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const archivo = join(__dirname, '..', 'dist', 'index.html');

let html;
try {
  html = readFileSync(archivo, 'utf8');
} catch {
  console.error(`verificar-build: no se encontró ${archivo} — ¿corrió \`vite build\` antes?`);
  process.exit(1);
}

const problemas = [];

// El bloqueo real es CORS al FETCHEAR un módulo externo: un <script src=…>
// o un <link rel=modulepreload>. Un <script type="module" crossorigin>
// SIN src no fetchea nada — el atributo queda inerte (verificado con Chrome
// y Edge headless sobre file://: el script corre igual). Por eso NO se
// falla sólo por ver la palabra "crossorigin" suelta en el archivo; eso
// generaba falsos positivos con vite-plugin-singlefile, que la deja como
// residuo del script original al inlinear.
if (/<script\b[^>]*\ssrc=/i.test(html)) {
  problemas.push('quedó un <script src="…"> — sobre file:// eso es lo que bloquea CORS.');
}
if (/<link\b[^>]*\brel=["']?modulepreload["']?/i.test(html)) {
  problemas.push('quedó un <link rel="modulepreload"> — fetchea un módulo externo, bloqueado sobre file://.');
}
if (/<link\b[^>]*\brel=["']?stylesheet["']?[^>]*\shref=/i.test(html)) {
  problemas.push('quedó un <link rel="stylesheet" href="…"> externo — el CSS tiene que estar inline.');
}
if (/\b(?:src|href)=["']\//.test(html)) {
  problemas.push('hay una ruta absoluta (src="/..." o href="/...") — sólo funciona servido, no por doble clic.');
}
if (!/<script[^>]*>[\s\S]{200,}<\/script>/.test(html)) {
  problemas.push('no se encontró un <script> con contenido inline sustancial — ¿el bundle se generó vacío?');
}

if (problemas.length > 0) {
  console.error('verificar-build: dist/index.html no pasa la verificación de file://\n');
  for (const p of problemas) console.error('  - ' + p);
  console.error('\nEsto tiene que abrir por doble clic sin servidor. Ver apps/web/vite.config.ts.');
  process.exit(1);
}

console.log('verificar-build: dist/index.html es autocontenido (sin <script src>, sin modulepreload, sin rutas absolutas).');
