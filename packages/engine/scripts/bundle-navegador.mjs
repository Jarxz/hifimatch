// Concatena los módulos compilados de dist/*.js en un único script clásico
// (sin import/export), para cargarlo con <script src="..."> en vez de
// <script type="module">.
//
// Por qué: los navegadores basados en Chromium bloquean por CORS los
// módulos ES cuando la página se abre como archivo local (file://) en vez
// de servida por http — y prototipo-frontend.html es un sitio estático sin
// servidor, pensado para abrirse haciendo doble clic. <script src> clásico
// no tiene esa restricción (es el mecanismo de toda la vida), así que el
// bundle se carga así en vez de como módulo.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');

// Orden de dependencias: unidades.js y tipos.js no importan nada de acá;
// carga.js y sala.js tampoco; potencia.js importa de unidades.js y tipos.js.
const ARCHIVOS = ['unidades.js', 'tipos.js', 'carga.js', 'sala.js', 'potencia.js'];

// Único contrato público hacia prototipo-frontend.html.
const PUBLICAS = ['evaluarPotencia', 'evaluarCarga', 'calcularDisposicion'];

let salida =
  '// GENERADO por packages/engine/scripts/bundle-navegador.mjs — no editar a mano.\n' +
  '// Fuente real: packages/engine/src/*.ts. Regenerar con `npm run build`.\n' +
  '(function () {\n  \'use strict\';\n\n';

for (const archivo of ARCHIVOS) {
  let codigo = readFileSync(join(distDir, archivo), 'utf8');
  // Quitar imports relativos entre estos mismos archivos: ya van concatenados.
  codigo = codigo.replace(/^import\s*\{[^}]*\}\s*from\s*['"]\.\/[^'"]+['"];?\s*$/gm, '');
  // "export function foo" -> "function foo", "export const X" -> "const X"
  codigo = codigo.replace(/^export\s+(function|const|class)\s+/gm, '$1 ');
  salida += `  // ---- ${archivo} ----\n` + codigo.trim() + '\n\n';
}

salida += `  window.CadenaEngine = { ${PUBLICAS.join(', ')} };\n})();\n`;

const destino = join(distDir, 'cadena-engine.browser.js');
writeFileSync(destino, salida);
console.log('Bundle generado:', destino);
