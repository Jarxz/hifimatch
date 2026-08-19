# Despliegue

CADENA se despliega como sitio estático en Vercel. `apps/web` se construye
con Vite a un único `index.html` autocontenido (JS y CSS inlineados por
`vite-plugin-singlefile`) — el mismo artefacto sirve para la web **y** para
abrirse por doble clic (`file://`), sin servidor.

## Por qué un solo archivo

Los navegadores basados en Chromium bloquean por CORS el *fetch* de módulos
ES cuando la página se abre como archivo local (`file://`) en vez de servida
por `http(s)`. Un `<script type="module" src="...">` externo cae en esa
restricción; un `<script type="module">` **inline** no, porque no hay nada
que fetchear. `vite-plugin-singlefile` inlinea todo el JS y el CSS dentro de
`index.html` por eso — no como optimización, como requisito funcional.

`apps/web/scripts/verificar-build.mjs` corre dentro de `npm run build` y
hace fallar el build si sobrevive algún `<script src="...">`, `<link
rel="modulepreload">` o ruta absoluta. Este proyecto ya se quemó una vez con
esta clase de regresión (se detectó recién al abrir el prototipo anterior en
un navegador real); ahora la detecta el build, no una persona.

## Config de Vercel

`vercel.json`, en la raíz del repo:

```json
{
  "framework": null,
  "installCommand": "npm ci",
  "buildCommand": "npm run verify && npm run build",
  "outputDirectory": "apps/web/dist"
}
```

- **`framework: null`** — sin esto, el preset de Vite de Vercel asume
  `outputDirectory: "dist"` relativo a la raíz del proyecto, no
  `apps/web/dist`.
- **`buildCommand` corre `verify` antes que `build`.** `verify` es
  typecheck + los tests de los tres workspaces (`packages/engine`,
  `packages/data`, `apps/web`) — una regresión en cualquiera de los tres
  rompe el deploy en vez de publicarse. `build` a su vez corre
  `verificar-build.mjs`, así que una regresión del requisito `file://`
  también rompe el deploy.
- **Root Directory (en el dashboard de Vercel) se deja en la raíz del
  repo**, *no* en `apps/web`. Es el monorepo completo el que tiene los
  workspaces npm (`package.json` raíz con `"workspaces"`); si Root
  Directory apunta a `apps/web`, `npm ci` desde ahí no resuelve
  `@cadena/engine` ni `@cadena/data` y hay que activar "Include files
  outside of the Root Directory", que es más frágil que no tocarlo.
- **Node 24.x** — declarado en `engines.node` del `package.json` raíz.
  Hace falta para que `node --test` corra los `.ts` de los tres paquetes
  con type-stripping nativo (sin transpilar) durante `verify`.

## `/api/contact.ts` — la única función serverless del sitio

Todo lo demás en este documento describe un sitio 100% estático; esta es
la única excepción declarada. Vercel construye `/api/**` en un **paso
separado** del `buildCommand` de arriba — no pasa por `npm run verify &&
npm run build` — así que hay un `tsconfig.api.json` propio en la raíz
(`include: ["api/**/*.ts"]`) y un script `typecheck:api` enganchado a la
cadena de `npm run typecheck` (y por lo tanto de `verify`), para que una
regresión ahí también bloquee el deploy en vez de publicarse.

Variables de entorno requeridas (Project Settings → Environment
Variables, nunca en un archivo commiteado — `.env.example` en la raíz
documenta el nombre de cada una sin valores reales):

- `RESEND_API_KEY` — cuenta de Resend en plan Free, sin método de pago
  cargado (así el tope de 100 emails/día es un circuit-breaker real de
  costo, no un supuesto).
- `CONTACT_TO_EMAIL` — adónde llegan las consultas del formulario.
- `CONTACT_FROM_EMAIL` (opcional) — remitente. Sin definir, usa el
  dominio de pruebas de Resend (`onboarding@resend.dev`); una vez
  `thehifimatch.com` esté verificado en Resend (Resend → Domains, panel
  separado de "agregar el dominio en Vercel"), puede pasar a algo
  `@thehifimatch.com`.

Sin `RESEND_API_KEY`/`CONTACT_TO_EMAIL` cargadas, el endpoint responde
`{ok:false, codigo:'error-servidor'}` siempre — fallo explícito, no un
error a medias. Ver `CLAUDE.md` (sección del formulario de contacto)
para el detalle de diseño y la postura anti-abuso.

## Primer deploy

1. Crear el repositorio remoto (hoy este repo no tiene ningún remoto
   configurado) y hacer push de `master`/`main`.
2. En Vercel: **Add New → Project**, importar el repo. Root Directory: la
   raíz (no tocar). Framework Preset: Vercel debería detectar "Other" dado
   `framework: null` en `vercel.json`; si pregunta, confirmarlo así.
3. Deploy. Si falla en `verify`, es una regresión real (test o typecheck) —
   no saltarlo. Si falla en `verificar-build.mjs`, es la regresión de
   `file://` — revisar `apps/web/vite.config.ts`.

## Verificación manual tras cada deploy

Automatizada (`verify` + `verificar-build.mjs`) cubre regresiones de
lógica y de estructura del build, pero no reemplaza abrir el sitio:

1. Abrir la URL de producción, elegir un parlante + amplificador (+
   opcionalmente una fuente digital) y confirmar que el resultado calcula.
2. Cambiar de idioma (ES/EN) en las tres pantallas; recargar y confirmar
   que persiste (vía `localStorage` — no persiste en Safari sobre
   `file://`, pero sí debería en la web servida por `https://`).
3. **Descargar el `index.html` desplegado y abrirlo por doble clic.** Tiene
   que funcionar igual que la URL — es la misma garantía que motiva todo el
   diseño de `vite-plugin-singlefile`. En ese modo, el botón "Contacto"
   tiene que mostrar el enlace `mailto:` de respaldo, nunca intentar
   `fetch` (no hay host que resolver desde `file://`).
4. **Completar el formulario de contacto en la URL de producción** (no en
   `file://`) y confirmar que el email llega a `CONTACT_TO_EMAIL`. Si las
   variables de entorno de la sección de arriba todavía no están
   cargadas, va a mostrar el mensaje de error genérico — esperado, no un
   bug.
