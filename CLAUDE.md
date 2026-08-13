# CLAUDE.md — CADENA, motor de compatibilidad hi-fi

## Qué es esto

Motor que, dado un sistema de audio (completo o parcial) y una sala, evalúa si
los equipos calzan entre sí y qué prestaciones entregan. Alimenta una web pública
y genérica. **El motor es el producto; la interfaz es intercambiable.**

## Las dos capas — regla estructural del proyecto

Todo lo que el sistema afirma pertenece a una de dos capas, y **la capa se declara
siempre**, en el veredicto y en pantalla.

- **Capa `fisica`.** Tiene fórmula, umbral, fuente del dato y nivel de confianza.
  Es refutable y por eso es defendible: alguien puede discutir un umbral, y esa
  discusión se gana con argumentos. Es casi todo lo que hace el MVP.
- **Capa `criterio-editorial`.** Preferencias y prioridades que el sitio declara
  desde su criterio (por ejemplo, cómo repartir un presupuesto entre categorías).
  Editable, y en pantalla **rotulada como criterio**, nunca mezclada visualmente
  con la capa física. En el MVP casi no aparece; existe para más adelante.

### Prohibiciones absolutas del motor

El motor NUNCA emite, en ninguna capa y bajo ninguna redacción:

- juicios de carácter tonal (cálido, analítico, brillante, musical)
- predicciones de sinergia sonora entre marcas o equipos
- afirmaciones de escena derivadas de electrónica (amplificadores, DACs,
  streamers, cables) — la escena sólo se trata desde geometría
- comparaciones de calidad sonora entre productos
- cualquier diferencia sin mecanismo físico y dato que la sostenga

Si una regla necesita uno de esos juicios para funcionar, está mal planteada.
**No la implementes: pregunta.** Un solo veredicto refutable contamina a todos los
que sí son sólidos, y este usuario los pone a prueba.

## Manejo de datos incompletos

Los fabricantes publican mal la impedancia de salida, las curvas de impedancia y a
veces la sensibilidad real (la miden en media-espacio y sobreestiman). Por eso:

- **Cada spec lleva `fuente` y `confianza`.** Una regla que corre sobre datos de
  confianza baja **degrada su propia confianza** y lo declara.
- **Dato faltante nunca es `ok`.** Produce severidad `sin-datos`. Nunca estimes en
  silencio: si asumes un valor porque no hay dato, el veredicto tiene que decirlo.
- Cuando la sensibilidad de fábrica es de media-espacio y existe medición anecoica
  independiente, se usa la anecoica y se deja constancia de ambas.

## Severidad y bloque de sala

La geometría de sala predice comportamiento acústico desde una forma rectangular
rígida, y eso se equivoca fácil. Por eso **ninguna regla de sala emite severidad
`error`**: techo `advertencia`, siempre con la salvedad de que se verifica
midiendo, no calculando.

## Arquitectura

```
packages/engine/   TypeScript puro, CERO dependencias de runtime.
  src/tipos.ts     Esquema de dominio (fuente de verdad)
  src/unidades.ts  Conversiones de unidad, testeadas aparte
  src/potencia.ts  Regla de margen de potencia
  src/carga.ts     Regla de carga / impedancia
  src/sala.ts      Geometría: disposición, distancia, reflexiones
  src/ganancia.ts  Ganancia de cadena: puente de impedancias + recorrido de volumen (fuente→ampli)
packages/data/     Catálogo curado de equipos, bilingüe (con fuente y confianza)
  src/catalogo.ts        El dato: parlantes, amplificadores, streamers, DACs, cables
  src/tipos-catalogo.ts  DatoCitado<T>, Localizado — el esquema de presentación
  src/idioma.ts          Idioma = 'es'|'en'; Localizado = {es,en}
apps/web/          Frontend: Vite + TypeScript modular, consume engine y data directo
  src/main.ts            Arranque, estado, listeners
  src/idioma/            es.ts (define Textos) + en.ts + idioma.ts (aplicar/guardar)
  src/formato/numeros.ts Intl.NumberFormat por idioma — reemplaza cualquier nf() a mano
  src/datos/             adaptadores.ts (catálogo → tipos del motor) + etiquetas.ts (chips derivados)
  src/vista/             resultado.ts (PURO) + plano.ts (PURO) + pintar.ts (DOM) + medidor.ts + selectores.ts + pantallas.ts
```

El motor debe correr en un test de milisegundos sin levantar nada. Si necesita
`fetch`, algo se hizo mal. Lo mismo vale, sin excepción, para `packages/data` y
para todo lo "puro" de `apps/web` (`resultado.ts`, `plano.ts`,
`datos/*`, `formato/*`, `idioma/*`): imports relativos con extensión `.ts`,
cero dependencias, corren con `node --test` sin bundler ni DOM. Sólo
`vista/pintar.ts` y `vista/medidor.ts` tocan `document` — esa es la única
capa que un test de Node no puede ejercitar directo.

## Convenciones no negociables

- **No inventes umbrales.** Si falta un número, se pregunta.
- **Test antes que implementación.** Cada regla parte con casos conocidos.
- **Dato faltante = `sin-datos`, nunca `ok`.**
- **Cero equipos hardcodeados en `engine`.** Ni marcas ni modelos: todo entra por
  los datos.
- **Unidades en el nombre del campo:** `sensibilidadDb`, `potenciaW`,
  `impedanciaOhm`, `distanciaM`. Nunca un número desnudo.
- **Toda conversión de unidad vive en `unidades.ts`,** testeada aparte. La
  confusión dB/W/m vs dB/2.83V/m es la fuente de error más común del dominio.
- **El motor no emite texto de UI.** Cada regla devuelve `codigo` (una unión
  de literales) y, cuando hace falta redactar algo con números (ej. el aviso
  de potencia mínima recomendada), una estructura con esos números en crudo
  — nunca una frase armada. Un motor que decide en qué idioma se lee el sitio
  no es "interfaz intercambiable" (ver primera sección de este documento).
- **Todo texto de producto vive en `apps/web/src/idioma/{es,en}.ts`,** en los
  dos idiomas. `es.ts` define el esquema (`typeof es` → `Textos`); una clave
  que falte en `en.ts`, o una función con otra firma, es error de `tsc`, no
  un texto vacío en pantalla. Los parámetros que le llegan a cada función del
  diccionario son siempre `string` ya formateado (por `formato/numeros.ts`,
  según el idioma activo) — el diccionario redacta, nunca formatea números.

## Estado actual

**Motor completo, catálogo único y bilingüe, sitio en Vite.** El monorepo
tiene tres workspaces npm (`packages/engine`, `packages/data`, `apps/web`) con
`package.json` raíz (`workspaces`); todo corre con `npm test` / `npm run
typecheck` / `npm run build` desde la raíz.

**El motor** (`packages/engine/src/`: `tipos.ts`, `unidades.ts`,
`potencia.ts`, `carga.ts`, `sala.ts`, `ganancia.ts`) devuelve **códigos, no
texto** — `codigo: 'con-margen'|'justo'|'insuficiente'`, etc., y en
`potencia.ts` un `avisos: AvisoPotencia[]` con los números en crudo. 47/47
tests.

**El catálogo** (`packages/data/src/catalogo.ts`) es la **única** fuente de
datos de equipos — 36 equipos (13 parlantes, 12 amplificadores, 4 streamers +
4 DACs, 3 cables curados sin regla todavía), bilingüe desde el origen
(`Localizado = {es, en}` en cada campo de presentación). Reemplaza lo que
antes vivía duplicado entre `prototipo-frontend.html` y
`data/equipos-seed.json` — ya habían divergido en 9 puntos antes de
fusionarse acá. 11/11 tests (completitud es/en, ids únicos, lint de
separador decimal).

**Streamers y DACs son dos categorías separadas** (`Catalogo.streamers` /
`Catalogo.dacs`, dos `<select>` distintos en el sitio), no una sola lista
como al principio de la Fase 5. Comparten el mismo esquema (`FuenteCat`)
porque **el motor sigue sin distinguirlos** — sólo usa `salidaV`/
`impedanciaSalidaOhm` (`packages/engine/src/tipos.ts` `Fuente`); la
separación es puramente de presentación.

**Streamer y DAC pueden elegirse a la vez** (`estado.streamer` y
`estado.dac`, independientes — no hay exclusión mutua). Cada uno evalúa su
propio puente de impedancias y recorrido de volumen contra el amplificador,
en pares de tarjetas separados (`card-puente-streamer`/`card-recorrido-
streamer` y `card-puente-dac`/`card-recorrido-dac`, con títulos distintos:
"streamer → amplificador" / "DAC → amplificador") — nunca se mezclan dos
evaluaciones de ganancia en una sola tarjeta. `pintarGanancia(categoria,
puente, recorrido)` en `vista/pintar.ts` toma la categoría como primer
argumento para pintar el par correcto.

**Ampliación del catálogo (Fase 5, primera tanda).** 5 parlantes y 3
amplificadores nuevos, investigados con la misma disciplina de fuente +
confianza que el resto: Wharfedale Linton Heritage (no existe un "Klipsch
Linton" — corregido tras consultarlo), Sonus Faber Lumina II, Monitor Audio
Silver 50 (7G), Focal Vestia N2 (es columna de piso, no estantería — se
declara así en `tipo`) y Diatone DS-251MK2 (vintage japonés de 1973,
confianza media en casi todos los campos, varios en `null` porque las fichas
de la época no publicaban esos datos); McIntosh MC252, Cayin LA-34 Plus y
Advance Paris A10 Classic. De paso se cerraron huecos preexistentes:
`impedanciaMinOhm` de ELAC Debut 2.0 B6.2, `maxSplDb` de Wharfedale Diamond
12.1, y `cargaMinOhm` de Cambridge CXA81/Yamaha A-S501/Denon PMA-600NE.
Varios campos (`maxSplDb` de la mayoría de los parlantes, `sensEntradaMv`/
`impedanciaEntradaOhm` de Hegel H95 y Arcam A5) siguen en `null` porque se
verificó activamente que el fabricante no los publica — no por falta de
búsqueda.

**Segunda tanda: Marantz SR6008, Cambridge Audio AXN10, Wadia 121.** El
SR6008 es un receptor AV multicanal, no un integrado estéreo dedicado — se
registra explícitamente el rating de **2 canales excitados** (110 W/8 Ω), no
la cifra de 1 canal a 1 kHz que infla el marketing de otros fabricantes;
`potencia4OhmW` y el factor de amortiguación quedan en `null` porque Marantz
no los publica. El Wadia 121 (DAC de escritorio descontinuado, ~2012) tiene
salida ajustable en 3 pasos: se registra el máximo medido por Stereophile
(3,48 V), mismo criterio que el WiiM Pro Plus del Paso 9.

**El frontend** (`apps/web/`) es Vite + TypeScript modular; `prototipo-
frontend.html` y su bundler artesanal (`bundle-navegador.mjs`) ya no existen.
El sitio sigue teniendo que abrirse por doble clic (`file://`) además de
servirse por web: `vite-plugin-singlefile` inlinea JS y CSS en un único
`index.html` autocontenido, así no queda nada externo que el navegador tenga
que *fetchear* — el bloqueo real de Chromium sobre `file://` es al fetchear
un módulo externo, no a los módulos en sí; un `<script type="module">`
inline ejecuta igual. `apps/web/scripts/verificar-build.mjs` corre dentro de
`npm run build` y hace fallar el build si algún `<script src>` o `<link
rel=modulepreload>` externo sobrevive — la regresión de CORS que este
proyecto ya sufrió una vez ahora la detecta el build, no un navegador real.
Dentro de `apps/web/src`, todo lo que no es DOM (`vista/resultado.ts`,
`vista/plano.ts`, `datos/adaptadores.ts`, `datos/etiquetas.ts`,
`formato/numeros.ts`, `idioma/*`) usa imports relativos con extensión `.ts` —
igual convención que `packages/engine` — y por eso corre con `node --test`
sin bundler: los alias de Vite (`@engine/...`) no los entiende el test runner
de Node, que resuelve módulos como Node puro, así que se descartaron a favor
de la convención ya probada del motor. 53/53 tests.

**Bilingüe real, no maquetado.** `apps/web/src/idioma/es.ts` define el
esquema de textos (`typeof es` → `Textos`); `en.ts` lo implementa — una clave
faltante es error de compilación. El botón ES/EN vive en el banner de
configurar/resultado **y** en la portada (que no tiene banner: sin el botón
ahí no se puede cambiar de idioma antes de entrar). Cambiar de idioma
reformatea números por locale (`Intl.NumberFormat` vía
`formato/numeros.ts`), repinta el cromo estático (`data-i18n` +
`aplicarCromoEstatico()`) y, si ya hay una cadena completa, recalcula el
resultado sin forzar la navegación a esa pantalla. Verificado extremo a
extremo con Chrome headless real (protocolo CDP crudo, sin Puppeteer) sobre
`apps/web/dist/index.html` abierto por `file://`.

**112 tests totales** (47 motor + 11 catálogo + 54 frontend, estos últimos
con vectores propios en inglés además de los de español). Correlato de cada
fase en el historial de commits, no en este documento.

**Huecos de `fuentes` (streamers/DACs) revisados.** La impedancia de salida
del WiiM Pro Plus estaba en `null`; se cerró en 10 Ω con una medición
independiente (Hi-Fi News, lab report) — el fabricante no la publica. Su
salida además es configurable (500 mV/800 mV/1 V/2 V): se registra el
máximo (2,0 V) con nota explícita, no un valor fijo inventado. El Cambridge
Audio CXN (V2) se queda en `null` a propósito: la ficha oficial no publica
voltaje ni impedancia de salida, y las fuentes de terceros sólo dan
aproximaciones ("~2 V") — exactamente el tipo de dato que la doctrina
prohíbe copiar sin confirmar. Es también el vector E de la sección 6 de
`docs/motor-mvp.md`: preserva el caso demostrativo de que un dato faltante
nunca es verde.

**Desplegado en Vercel.** Producción en
`https://hifimatch-web-5bbj.vercel.app/`, conectado al branch `master`. Root
Directory en la raíz del repo (no en `apps/web` — ese apunte rompe la
resolución de workspaces); `buildCommand` corre `npm run verify && npm run
build`, así que una regresión de tests o de typecheck bloquea el deploy antes
de publicar nada.

Falta:
- **Fase 5** (seguir ampliando el catálogo) y la regla de `cables` (sección 5
  de `docs/motor-mvp.md`): trabajo sin fin natural, ninguna de las dos es
  parte del alcance actual.
