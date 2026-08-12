import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

/**
 * El sitio tiene que poder abrirse por doble clic (file://), además de
 * servirse por web. Vite hardcodea <script type="module" crossorigin
 * src="…">, que Chromium bloquea por CORS sobre file:// — no depende del
 * formato de rollup, así que un simple format:'iife' no alcanza acá.
 * vite-plugin-singlefile inlinea todo (JS y CSS) dentro de index.html: no
 * queda nada externo que fetchear, así que no hay CORS que evitar. Un
 * <script type="module"> INLINE sí ejecuta sobre file:// — la restricción
 * es sobre el fetch de módulos externos, no sobre los módulos en sí.
 *
 * apps/web/scripts/verificar-build.mjs corre después del build y falla si
 * de alguna forma sobrevive un <script src> o <link href> externo — no
 * confiar ciegamente en que el plugin siga haciendo esto en versiones
 * futuras (ver docs/despliegue.md).
 */
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  resolve: {
    alias: {
      '@engine': fileURLToPath(new URL('../../packages/engine/src', import.meta.url)),
      '@data': fileURLToPath(new URL('../../packages/data/src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: false,
    sourcemap: false,
  },
});
