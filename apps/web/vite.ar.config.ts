import { defineConfig } from 'vite';

/**
 * Build separado para ar.html — deliberadamente SIN vite-plugin-singlefile.
 * AR (WebXR + cámara) nunca puede funcionar por file://, así que no hay
 * conflicto en que esta página dependa de red — a diferencia de
 * index.html (ver vite.config.ts), que tiene que abrir por doble clic.
 *
 * Lo que evita que three.js entre al bundle de index.html no es este
 * config en sí: es que src/main.ts nunca importe nada de src/ar/**.
 * Rollup separa por grafo de imports alcanzable desde cada entry. Este
 * config sólo evita, además, que ar.html se inlinee (no tiene sentido:
 * siempre se sirve por red, mejor con assets propios cacheables).
 *
 * emptyOutDir:false es obligatorio — el build de index.html (vite.config.ts,
 * emptyOutDir:true) corre primero y no debe ser borrado por este segundo
 * paso. apps/web/package.json corre los dos build en orden dentro de
 * "build". verificar-build.mjs sigue revisando sólo dist/index.html — un
 * segundo HTML en dist/ no lo toca.
 */
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: { input: 'ar.html' },
    sourcemap: false,
  },
});
