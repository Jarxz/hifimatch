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
  src/modos.ts     Modos axiales de sala (resonancias de graves) + detección de agrupamiento
  src/reverberacion.ts  RT60 (ecuación de Sabine) según tipo de sala declarado (moderna/balanceada/tratada)
  src/genero.ts    Crest factor típico por género musical — informativo, sin severidad propia
  src/ganancia.ts  Ganancia de cadena: puente de impedancias + recorrido de volumen (fuente→ampli)
  src/puntaje.ts   Puntaje 1-10 del match — CAPA CRITERIO-EDITORIAL, no física (pesos declarados)
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
`potencia.ts`, `carga.ts`, `sala.ts`, `modos.ts`, `ganancia.ts`) devuelve
**códigos, no texto** — `codigo: 'con-margen'|'justo'|'insuficiente'`, etc.,
y en `potencia.ts` un `avisos: AvisoPotencia[]` con los números en crudo.
69/69 tests.

**Modos de sala** (`modos.ts`) es la primera regla de sala con severidad
(techo `warn`, nunca `error` — CLAUDE.md ya lo declaraba antes de que
existiera la regla que lo necesitaba). Modos axiales únicamente; agrupa dos
modos de ejes distintos si caen a menos de 5 % de diferencia por debajo de
150 Hz — ambos umbrales declarados como criterio del sitio, no una
convención publicada. La sala por defecto del sitio (3,6×5,0×2,4 m) da
`warn` de verdad: 3,6/2,4 = 3:2 exacto, así que el modo de orden 3 del
ancho coincide exactamente con el de orden 2 del alto. Cuando hay
agrupamiento, `apps/web/src/vista/curvamodal.ts` dibuja una curva 1D de
intensidad modal (cos²) por eje afectado — deliberadamente NO un mapa
combinado 2D/3D como el de un simulador acústico real (BEM/FEM): eso exige
fase y amplitud relativa entre modos, dato que este motor no tiene.

**Puntaje del match** (`puntaje.ts`) es la primera y única pieza del motor
que vive en la **capa criterio-editorial**, no en la física — combina las
severidades de potencia/carga/puente/recorrido/modos en un número 1-10 con
pesos que el sitio declara (potencia 30 % · carga 25 % · puente 17 % ·
recorrido 13 % · modos 15 %, `docs/motor-mvp.md` sección 7). `sin-datos` (o
un componente no aplicable, ej. sin streamer ni dac elegido) se excluye del
cálculo — no puntúa ni penaliza, y el sitio declara cuántos componentes sí
se evaluaron. Se rotula en pantalla como "Criterio editorial, no física",
en su propio bloque, nunca junto a un veredicto de capa física. Con
streamer y dac elegidos a la vez, cada uno de puente/recorrido se combina
con `peorSeveridad()` (mismo idioma que `peorConfianza()`).

**Lenguaje simple sobre la capa física, sin reemplazarla.** Cada tarjeta de
evaluación (potencia/carga/puente/recorrido/modos) tiene un `simpleHtml`:
una frase corta en itálica, además del párrafo técnico con la fórmula — el
motor sigue devolviendo códigos (`codigo`), y `resultado.ts` mapea cada
código a esa frase vía diccionario, mismo patrón que `verdictoTexto`. Los
items de "La cadena" (parlante/amplificador/streamer/dac) muestran un
comentario reusando el `verdictoTexto` ya calculado para ese equipo — no
inventan una evaluación nueva. Al final de la pantalla de resultado, una
tarjeta "En resumen" (`modeloResumenFinal`) recapitula: qué componentes
salieron "ok" (fortalezas) y cuáles "warn"/"alert" (debilidades) —
`sin-datos`/`dim` no cuenta como fortaleza ni como debilidad, mismo
principio de "dato faltante nunca es aprobado". Cada componente lleva un
`detalle` numérico opcional (`+2,8 dB`, `ratioZ 4700×`, `9,5×` — ya
calculado por la regla, sólo re-mostrado) para que el resumen sea más
específico que el solo veredicto. Las recomendaciones muestran **una por
cada debilidad con `avisoHtml`**, no sólo la peor — cada regla ya redactó
su propio consejo, el resumen las junta todas. Modos de sala tiene además
`sugerenciaHtml`, distinto de `avisoHtml` (la lista de pares agrupados): un
consejo accionable ("conviene reposicionar...") para que la recomendación
no repita datos crudos. La lista completa de todos los modos (hasta
300 Hz) se sacó de la tarjeta — sólo quedan las curvas de los 2
agrupamientos de menor frecuencia (`TOP_N_AGRUPADOS` en `curvamodal.ts`),
los más audibles y difíciles de tratar; el resto sigue contando en el
texto ("N par(es)...").

**Español neutro, no argentino.** Todo `apps/web/src/idioma/es.ts` evita
voseo ("tenés"/"elegí"/"probá") — el registro por defecto usa formas
impersonales ("conviene", "se verifica") o tú neutro, nunca vos. Cuidado
al agregar texto nuevo: es fácil que se cuele voseo en frases más
coloquiales como los `simpleHtml`/`sugerenciaHtml` del punto anterior —
ya pasó una vez.

**Link a la ficha del producto — placeholder, no funcional a propósito.**
Cada tarjeta `.info` (parlante/amplificador/streamer/dac elegido) muestra
"Ficha del producto · próximamente" en la esquina inferior derecha, mismo
patrón visual que "Más parlantes · próximamente" — sin `href` ni
`onclick`. Pensado para cuando una tienda quiera linkear su ficha de
producto real; hoy el catálogo no tiene una URL curada por equipo.

**"sin-datos" ya no se publica como tarjeta propia.** Cuando carga, puente
o recorrido devuelven severidad `sin-datos`, `pintarCarga`/
`pintarGanancia` (`vista/pintar.ts`) ocultan la tarjeta entera (`.hidden`)
en vez de mostrar un veredicto "Sin dato" sin nada evaluable — decisión
explícita del usuario ("no puede seguir generando análisis con
componentes sin su información"). La ausencia **no desaparece**: queda
como su única mención visible en la sección "Sin datos suficientes" del
resumen final (`sinDatosHtml` en `modeloResumenFinal`), con una nota corta
por componente. Se evaluó y se descartó la alternativa de rellenar estos
huecos con un "estándar de mercado" — el propio catálogo ya tiene
demasiada dispersión real en los mismos campos (impedancia de salida de
fuentes: 10 Ω a 500 Ω; sensibilidad de entrada: 110 mV a 1600 mV) como
para que un valor único no sea, en la práctica, un dato inventado con una
nota que no lo salva.

**El número del puntaje es visualmente grande** (`#pt-puntaje`, 26px) para
que se reconozca de un vistazo — la escala sigue siendo 1-10, sólo cambió
la tipografía.

**Plano y modos de sala comparten una sola tarjeta.** Las dos son capa
"Geometría" y no dependen de qué equipos se elijan (sólo de las
dimensiones de la sala), así que viven en un único `.card` con dos
secciones internas separadas por un borde (`.geo-split`) — cada una con
su propio `.ct`/veredicto, mismos ids que antes (`plan`, `mo-*`), sin
cambios en `pintarPlano`/`pintarModos`/`pintarCurvasModales`. Es un cambio
puramente de estructura HTML.

**El catálogo** (`packages/data/src/catalogo.ts`) es la **única** fuente de
datos de equipos — 49 equipos (13 parlantes, 12 amplificadores, 11
streamers + 10 DACs, 3 cables curados sin regla todavía), bilingüe desde
el origen (`Localizado = {es, en}` en cada campo de presentación).
Reemplaza lo que antes vivía duplicado entre `prototipo-frontend.html` y
`data/equipos-seed.json` — ya habían divergido en 9 puntos antes de
fusionarse acá. **Cada categoría está ordenada alfabéticamente por
`nombre`** — no hay un criterio editorial de destacar unos equipos sobre
otros, así que el orden alfabético es el único que no implica una
opinión. 11/11 tests (completitud es/en, ids únicos, lint de separador
decimal, conteo por categoría).

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

**Reverberación estimada (RT60) y crest factor por género.** Dos piezas
del motor, ambas puramente informativas (ninguna toca el puntaje 1-10 de
`puntaje.ts`, cuyos pesos siguen sumando 1 sin un sexto componente).
`reverberacion.ts` aplica la ecuación de Sabine (RT60 = 0,161·V/A) sobre
la geometría de la sala; mismo techo de severidad `warn` que el resto de
las reglas de sala (`docs/motor-mvp.md` sección 4ter). Se pinta como una
tercera sección dentro de la tarjeta Geometría ya fusionada (después de
plano y modos) y aparece en "En resumen" (fortaleza/debilidad) sin sumar
ni restar puntaje. `genero.ts` traduce el pico objetivo de la tarjeta de
potencia (`crestFactorHtml`) al nivel promedio de escucha que implica,
según el crest factor típico del género elegido (`rockpop`=10 dB,
`jazzvocal`=14 dB, `clasica`=18 dB — sección 2bis). De paso, la sugerencia
de `modos.ts` cuando hay agrupamiento ahora menciona un filtro paramétrico
(EQ activo) como alternativa a reposicionar, con la misma salvedad de
siempre: se ajusta midiendo la sala real, el motor no tiene la
amplitud/fase medida como para proponer un Q o una atenuación en dB.

**Reverberación por materiales de superficie, no por "tipo de sala".** La
primera versión de `reverberacion.ts` usaba un único selector
`moderna`/`balanceada`/`tratada` con un coeficiente de absorción promedio
para toda la sala. Se reemplazó por completo: ahora el usuario elige un
**material por superficie** (muro/piso/techo) en tres selectores
independientes, y la absorción total se suma superficie por superficie —
`A = α_muro·S_muros + α_piso·S_piso + α_techo·S_techo` — con un
coeficiente de Sabine declarado por material (hormigón/vidrio/madera/
placa yeso cartón/panel acústico en muros; hormigón/madera laminado/
porcelanato/alfombra en piso; hormigón/madera/placa yeso cartón/panel
acústico en techo), mismo criterio del sitio de siempre: valores típicos
de literatura de acústica arquitectónica, no medición real
(`docs/motor-mvp.md` sección 4ter tiene la tabla completa). Panel acústico
y alfombra se agregaron por iniciativa propia — sin ellos, una sala
realmente tratada quedaba mal representada con sólo los materiales
"de obra" que el usuario pidió inicialmente. El default del sitio (yeso
cartón + madera laminado, sin alfombra ni panel) da a propósito una sala
bastante viva (`warn`, "Muy viva") — no se fuerza un "ok" de fábrica sólo
para que la pantalla inicial luzca bien. La tarjeta ahora tiene un
`calcHtml` con el desglose por superficie (m² × α = sabines de cada una),
mismo patrón que las demás tarjetas con cálculo (potencia, puente).
`estado.ts` guarda `muro`/`piso`/`techo` en vez de `tipoSala`.

**197 tests totales** (90 motor + 11 catálogo + 96 frontend, estos últimos
con vectores propios en inglés además de los de español; el frontend ya
incluía el ajuste de `idioma.test.ts` de la pantalla de guía). Correlato
de cada fase en el historial de commits, no en este documento.

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

**Tercera ronda de huecos (amplificadores).** Advance Paris A10 Classic:
`cargaMinOhm` cerrado en 2,66 Ω — es el tercer punto de la misma tabla de
potencia del fabricante (130 W/8 Ω · 190 W/4 Ω · 250 W/2,66 Ω), no una
cifra de "mínimo soportado" separada. NAD C 316BEE V2: `cargaMinOhm`
**corregido** de 2 Ω a 4 Ω — la etiqueta de seguridad del panel trasero en
la propia ficha oficial declara "MINIMUM SPEAKER IMPEDANCE 4 Ω"; el valor
anterior de 2 Ω confundía esto con la potencia dinámica IHF (120 W), una
métrica distinta que no es una carga continua soportada. El resto de los
huecos reintentados en esta ronda (Hegel H95, Cambridge CXN V2, Arcam A5,
Cayin LA-34 Plus, Marantz SR6008, y `maxSplDb`/`impedanciaMinOhm` de varios
parlantes) se reconfirmaron ausentes con fuentes nuevas — quedan en `null`
por segunda o tercera vez, no por falta de búsqueda.

**Cuarta ronda: 13 streamers/DACs de gama alta.** 7 streamers (HiFi Rose
RS151/RS250A, Lumin T3, Naim ND5 XS 2, Audiolab 9000N, Wadax Studio
Player, McIntosh MS500) y 6 DACs (Chord Qutest, Hegel HD30, Mola Mola
Tambaqui, PS Audio PerfectWave DAC Mk II/DirectStream DAC Mk2, RME ADI-2
DAC FS), investigados con la misma disciplina de fuente + confianza que
el resto — la mayoría con más de una fuente citada (ficha oficial +
medición independiente de Stereophile/Hi-Fi News) porque varios de estos
equipos tienen output stages inusuales que un solo campo `salidaV`/
`impedanciaSalidaOhm` no representa del todo bien:

- **Wadax Studio Player** tiene impedancia de salida **ajustable por el
  usuario** entre 16 valores discretos (0,4 a 600 Ω, función deliberada de
  "impedance matching" con el amplificador) — se registra `null` con
  `pendiente` explicando por qué, en vez de inventar un "valor por
  defecto" que el fabricante no declara.
- **HiFi Rose RS151** tiene impedancia de salida dependiente de la
  frecuencia (~3 Ω desde 500 Hz, sube a 935 Ω a 20 Hz) — se registra el
  valor de banda media/alta, el relevante para el puente de impedancias.
- **HiFi Rose RS250A**: la ficha oficial declara 100 Ω, pero es la misma
  cifra del RS250 original (chip y etapa de salida distintos) — se
  prefiere la medición independiente del modelo "A" (142 Ω), mismo
  criterio que ya se aplicó con el WiiM Pro Plus.
- **PS Audio PerfectWave DAC Mk II**: ni el manual oficial ni ninguna
  medición independiente publican voltaje/impedancia de salida — vector
  demostrativo más de que un dato faltante nunca es verde, igual que el
  Cambridge CXN V2.
- **Mola Mola Tambaqui**: dos laboratorios independientes (Stereophile,
  Hi-Fi News) miden la impedancia de salida con una discrepancia exacta
  de 2× (44 Ω vs. 22 Ω) — se registra la de Stereophile con la
  discrepancia declarada en `pendiente`, en vez de promediar o elegir en
  silencio. De paso, se corrigió la premisa original de que era un DAC
  R2R: es un diseño PWM completamente discreto (Bruno Putzeys), sin R2R
  ni chip comercial.
- **Lumin T3**: la única impedancia de salida verificable es la de la
  salida XLR balanceada (10 Ω); se registran los valores XLR juntos
  (6,0 V/10 Ω) en vez de mezclar el voltaje RCA (3,0 V, sin impedancia
  medida) con una impedancia de otro conector.

**Las 8 tarjetas de evaluación son colapsables** (`<details class="detalle">
<summary>`, HTML nativo, sin JS propio). Siempre visible: el badge de capa
(física/geometría) + veredicto, el título, la frase `simple` en itálica y
el párrafo principal (`textoHtml`) — ese resumen ya cuenta la historia
completa en lenguaje simple. Detrás del toggle "Ver detalle técnico"
(colapsado por defecto): el medidor visual, la caja `calc` con la fórmula
y los números, el `flag`/aviso, el crest factor (sólo potencia), las
curvas modales (sólo modos) y la caja `src` de fuentes — la evidencia
técnica que sostiene el veredicto, no la primera lectura. Aplica a
potencia, carga, puente×2 (streamer/dac), recorrido×2 (streamer/dac),
modos y reverberación; el plano de reflexiones, "Puntaje del match" y "En
resumen" quedan fuera a propósito porque no siguen el mismo patrón
simple+técnico. `<details>` nativo no necesita `main.ts`/`pintar.ts`:
`getElementById`/`innerHTML` funcionan igual con el contenido colapsado
(confirmado que `medidor.ts` no rompe porque posiciona la aguja con
porcentajes, nunca con `getBoundingClientRect`).

**Plano isométrico 3D, reemplaza el plano 2D top-down.** `apps/web/src/vista/plano.ts` (PURO, sigue sin tocar `document`) ahora dibuja un cubo de alambre isométrico (proyección de 30°, sin ocultamiento de superficies — deliberadamente wireframe transparente, mismo criterio de honestidad que las curvas modales de la sección anterior: mejor mostrar geometría exacta sin fingir opacidad que este modelo no calcula) en vez del plano 2D top-down. `packages/engine/src/sala.ts` ganó geometría 3D nueva: además de las 2 reflexiones laterales que ya existían, calcula 6 más (trasera×2, techo×2, piso×2 — una por canal), todas por el mismo método de imagen especular generalizado a cualquier eje (`reflexionEnPlano(parlante, escucha, eje, valorPlano)`), con la distancia total del camino parlante→superficie→escucha para cada una. Las reflexiones de techo/piso exigieron declarar un supuesto nuevo — `ALTURA_ESCUCHA_M = 1,0` (oído y parlante a la misma altura, la recomendación estándar de instalación) — porque el catálogo no tiene altura por equipo; sin ese supuesto no hay geometría vertical que calcular. El plano muestra cada reflexión con su distancia en metros junto al punto.

**Materiales de sala por muro orientado, no un "muro" único.** `reverberacion.ts` pasó de un selector de material compartido para toda la superficie de muros a **4 selectores independientes** (frontal/posterior/izquierdo/derecho), cada uno con su propia área (`anchoM·altoM` para frontal/posterior, `largoM·altoM` para izquierdo/derecho) y su propio término en la suma de Sabine — ninguna superficie fuerza el mismo material que otra. Se agregó una opción nueva, **`vacio`** (α=1,0, sólo disponible en muros): representa una abertura real — vano, pasillo, ambiente integrado — y usa el coeficiente de referencia histórico de Sabine para "ventana abierta", no una estimación del sitio. Cuando un muro es `vacio`, dos cosas pasan a la vez: la absorción de RT60 sube (el sonido se escapa, no vuelve) y el plano isométrico **no dibuja la reflexión de ese muro** — verificado end-to-end (headless Chrome): marcar el muro izquierdo como vacío en la sala por defecto baja los círculos del plano de 10 a 9 y cambia el veredicto de RT60 de "Muy viva" a "En rango", ambos a la vez, con un solo clic. `estado.ts` guarda `muroFrontal`/`muroPosterior`/`muroIzquierdo`/`muroDerecho` en vez de `muro`.

**Puntaje coloreado, "En resumen" desarrollado, plano con 4 vistas y
parlantes como volumen.** Ronda de pulido sobre el resultado completo:

- **Puntaje del match** ahora sube arriba de "La cadena" en el sidebar
  (era el segundo bloque) y su número lleva color — verde/naranjo/rojo
  según `clasificarPuntaje()` (`packages/engine/src/puntaje.ts`,
  `UMBRAL_PUNTAJE_VERDE=8`/`UMBRAL_PUNTAJE_NARANJO=5`) — sin usar el
  componente `pintarVerdict` de capa física: sigue siendo un `<b>` simple
  con clase CSS (`puntaje-ok/warn/alert`), no un pill, y sigue rotulado
  "Criterio editorial, no física".
- **"Sin datos suficientes" ya no se menciona cuando no aplica.** Antes
  mostraba "Todos los componentes tenían dato suficiente" como
  confirmación vacía; ahora, si no hay ningún componente `dim`, la
  sección entera (título + lista) se oculta (`rf-sindatos-wrap`) — sólo
  aparece cuando hay algo real que declarar.
- **"En resumen" gana un párrafo holístico** (`comportamientoHtml`,
  primera línea de la tarjeta): una frase que resume cómo se comporta el
  match completo según la clase del puntaje (`ok`/`warn`/`alert`),
  reusando el número ya calculado — no inventa una evaluación nueva.
- **Recomendación de ubicación de parlantes** (`modeloUbicacionParlantes`
  en `resultado.ts`, tarjeta del plano): narra en palabras la disposición
  de referencia que `sala.ts` ya calculaba (distancia a la pared frontal,
  a cada pared lateral, separación entre parlantes) — no es una regla
  nueva, es la misma geometría que ya alimentaba `distanciaEscuchaM` y el
  plano, puesta en una oración.
- **Muro "vacío" ahora se declara en "En resumen".** Cuando algún muro
  está marcado como abertura, la tarjeta de Reverberación en el resumen
  lleva un aviso (`motor.reverberacion.avisoVacio`) explicando que no
  refleja sonido (por eso baja el RT60 calculado) **y**, honestamente,
  que los modos de sala de la tarjeta de arriba no se recalculan para una
  abertura — siguen asumiendo paredes rígidas en los dos extremos de cada
  eje. Se optó por declarar esta limitación en vez de intentar una
  corrección de modos con condición de borde abierta: eso exigiría un
  modelo acústico nuevo y no verificado, más allá del alcance de esta
  ronda.
- **El plano isométrico gana 4 vistas** (`Vista =
  'isometrica'|'frontal'|'lateral'|'superior'`, botones preestablecidos,
  no arrastre con mouse — ver `docs/motor-mvp.md` sección 4) y dibuja los
  parlantes como una **caja de alambre** (volumen ilustrativo, no físico:
  el catálogo no tiene dimensiones por equipo) en vez de un punto. El
  gráfico también creció (`max-width` de 520px a 640px en CSS, más
  espacio de proyección interno). Cambiar de vista sólo re-dibuja
  (`main.ts` cachea `{sala, disposicion, murosVista}` del último
  análisis) — no recalcula ni renaviega.

**Selectores de material como `<select>` desplegable, no botones.** Los 6
selectores de material (muro frontal/posterior/izquierdo/derecho, piso,
techo) pasaron de un `.segs` (fila de botones, uno por opción — hasta 6
botones por muro) al mismo patrón `.picker` + `.rowlabel` + `.sel select`
que ya usaban Parlantes/Amplificador/Streamer/DAC: la etiqueta arriba
("Muro frontal"), el `<select>` abajo mostrando el material elegido con
la flecha ya provista por `.sel::after`. Los 6 vivan en una grilla de 3
columnas (`.materiales-grid`, bajo el nuevo encabezado "Materiales de la
sala") en vez de 6 filas completas apiladas — más compacto, y reusa CSS
existente en vez de inventar un componente nuevo. `main.ts` cambió los
listeners de `click` en botones a `change` en selects; los `set*` de cada
material se simplificaron (ya no gestionan `aria-pressed`, el propio
`<select>` lo resuelve nativamente).

**Etiquetas del plano isométrico alineadas a su arista, no flotando
fuera del área.** Las etiquetas IZQUIERDO/DERECHO (y las dimensiones
largo/alto) usaban `text-anchor="middle"` horizontal con un offset fijo
— para las palabras más largas ("IZQUIERDO"/"POSTERIOR"), el texto se
extendía ~50-60px a cada lado del punto de anclaje, lo bastante como
para superar el padding del viewBox (64px) y quedar recortado por el
propio `<svg>`. Se resolvió rotando esas 4 etiquetas -90° (`texto(...,
rotar=true)`, `transform="rotate(-90 x y)"`, mismo truco que ya usaba el
plano 2D original para su dimensión vertical): rotado, el texto ocupa el
ancho de su altura de fuente (~10px) en vez del de su longitud, así que
encaja con margen de sobra y además queda visualmente pegado a la arista
vertical de su lado — que es lo que se pidió ("alineado con la línea...
de su lado"). Verificado con una captura de página completa (no
recortada): las etiquetas más largas ("IZQUIERDO"/"POSTERIOR") ya no se
salen del área de la tarjeta en ninguna de las 4 vistas.

**`simpleHtml` de potencia reexpresa el margen en % de capacidad usada,
no sólo en dB.** La frase corta bajo el veredicto (ej. antes "Sobra
potencia para tocar fuerte sin esfuerzo") ahora declara qué porcentaje
de la capacidad del amplificador exige el pico calculado — más intuitivo
que un número en dB para quien no piensa en logaritmos. Fórmula (en
`modeloPotencia`, `resultado.ts`): `margenDb` ya lo calculó
`potencia.ts` como una relación de potencia en dB
(`dB = 10·log₁₀(ratio)`), así que `ratio = 10^(margenDb/10)` y
`% de capacidad usada = 100/ratio = 100·10^(−margenDb/10)` — no es un
dato nuevo, es el mismo margen ya calculado, re-expresado. Puede superar
100 % cuando falta potencia (`ratio<1`, `codigo:'insuficiente'`); el
texto lo declara explícitamente ("más de lo que tiene disponible") en
vez de mostrar un porcentaje >100 % sin explicar qué significa.
`motor.potencia.simple` pasó de `Record<Codigo,string>` a
`Record<Codigo,(p:{porcentaje:string})=>string>` en los tres códigos
(`con-margen`/`justo`/`insuficiente`).

**Etiquetas del plano isométrico alineadas a la arista diagonal, no
verticales.** La rotación -90° de las 4 etiquetas de muro (párrafo
anterior) resolvía el recorte, pero en la vista isométrica el texto
quedaba vertical mientras la arista del cubo a la que describe corre en
diagonal (±30° respecto a la horizontal, según la propia fórmula de
proyección: `sx=(x-y)·cos30, sy=(x+y)·sin30-z`). `plano.ts` deriva ahora
el ángulo exacto de cada arista — +30° para las aristas en dirección X
(muro izquierdo/derecho), −30° para las de dirección Y (muro
frontal/posterior) — y sólo aplica esos ángulos cuando `vista ===
'isometrica'`; las 3 vistas ortográficas (frontal/lateral/superior)
siguen con el ángulo recto de antes, que ahí sí es el correcto. Mismo
tratamiento para la etiqueta de la dimensión "largo" (eje Y). Verificado
con capturas Chrome headless: las 4 etiquetas de muro y la cota de largo
quedan pegadas a su arista en isométrica, sin regresión en las otras 3
vistas.

**Pantalla "Guía del análisis" — tutorial de conceptos, no ayuda
contextual por tarjeta.** Un botón "Info" en el header de resultado abre
una pantalla nueva (`#s-info`, mismo patrón `Pantalla`/`ir()` que
splash/config/results — no una ventana de navegador real, para no romper
la compatibilidad `file://`) con un botón "← Volver al análisis"
(arriba y abajo de la pantalla, misma acción) que regresa sin
recalcular nada. El contenido son 9 tarjetas `.card` (mismo componente
visual que las tarjetas de evaluación), una por concepto — capas
física/criterio-editorial, fuente y confianza, potencia, carga, puente
de impedancias + recorrido de volumen, modos de sala, RT60, plano
isométrico, puntaje — cada una con un título y un cuerpo con `<b>`
(`data-i18n-html`, mismo mecanismo que ya usaba el footer). Texto
explicativo, no una regla nueva del motor: describe en prosa lo que cada
tarjeta del resultado ya calcula y por qué, para que el veredicto se
pueda leer con criterio propio. `idioma.test.ts` (`CLAVES_HTML`) ahora
espera los 9 `info.*.cuerpoHtml` además del footer. Las 9 tarjetas son
además **desplegables**: cada una es un `<details class="card
info-item">` con el título dentro de `<summary><h3>` y el cuerpo debajo
— colapsadas por defecto, mismo patrón `<details>` nativo (sin JS
propio) que ya usa `.detalle` en las tarjetas de evaluación, pero con
CSS propio (`.info-item`) porque acá el título completo hace de
disparador (con chevron a la derecha), no una etiqueta chica tipo "Ver
detalle técnico".

**Botón "i" por tarjeta, atajo contextual a la misma explicación de la
guía — no la reemplaza.** Cada tarjeta de evaluación (potencia, carga,
puente×2, recorrido×2, modos, reverberación, plano, y el bloque
"Puntaje del match" del sidebar — 10 botones en total) lleva un botón
circular `.infobtn` junto a su veredicto que abre un `<dialog>` nativo
(`#info-popup`, uno solo, reusado — el contenido se reemplaza en JS,
`main.ts` función `abrirInfoPopup(clave)`) con el mismo título y cuerpo
(`info.<clave>.titulo`/`cuerpoHtml`) que ya vive en la pantalla "Guía
del análisis". `<dialog>` nativo en vez de un componente propio: cierra
con Escape solo, con el botón "×", o clickeando el fondo oscurecido
(`::backdrop`) — sin librería, sin gestión manual de foco. Streamer y
DAC comparten la misma clave `ganancia` en sus 4 tarjetas (puente y
recorrido evalúan la misma pregunta de cadena de ganancia, ya lo
explica junto en la guía). Las claves `capas`/`confianza` de la guía no
tienen botón propio — son conceptos transversales, no atados a una sola
tarjeta — así que la pantalla completa sigue siendo el único lugar
donde se explican. El botón invierte a fondo claro en hover (mismo
patrón de contraste que `.segs button[aria-pressed=true]`).

**Títulos en dorado, en todas las pantallas — no sólo tarjetas.** Primero
sólo `.card h3` (título de cada tarjeta de evaluación/concepto) pasó a
`color:var(--dorado)`, variable nueva (`#C9A24B`) agregada a `:root`
junto a `--ok`/`--warn`/`--alert` — deliberadamente un tono distinto al
de `--warn` (`#C7AD7C`) aunque ambos sean "dorados": comparten familia
de color por estética, pero uno es severidad y el otro es sólo
tipografía. A pedido explícito de ampliarlo a "todos los títulos de la
página, no sólo del análisis", se sumaron `.lead` (el `<h1>` grande de
cada pantalla: "Define la cadena" en configurar, "Cómo leer este
análisis" en la guía) y `.rail h2, .main h2` (las etiquetas de sección
en mayúscula del resultado: "Puntaje del match", "La cadena", "Sala",
"Evaluación"). Deliberadamente **fuera** de esta regla: el wordmark
"CADENA" (`.mark` en la portada, `.hm` en el header de cada pantalla)
se queda en blanco — es la marca del sitio, no un título de contenido,
y mezclarla con el dorado le quitaría el ancla visual neutra que tiene
hoy. El hover que atenúa a `--dim` en la guía
(`.info-item summary:hover h3`) sigue funcionando porque es más
específico que la regla nueva.

**Tarjeta de equipo elegido (config): sólo chips + descripción
desplegable, no descripción siempre visible.** Al elegir un parlante,
amplificador, streamer o DAC, la tarjeta `.info` mostraba tipo + chips
(Ω/dB/W) + un párrafo de descripción siempre visible + el placeholder
de ficha. La descripción larga ahora vive detrás de un `<details
class="detalle">` con resumen "Ver descripción" (`config.verDescripcion`,
mismo patrón `<details>` que "Ver detalle técnico" en las tarjetas de
evaluación) — colapsada por defecto. Los chips (los datos concretos:
impedancia, sensibilidad, potencia) se quedan siempre visibles, sin
tocar; sólo la prosa entra al desplegable. `vista/selectores.ts`
(`infoHtml`) es quien arma este HTML — no toca `document` directo, así
que sigue sin necesitar test con DOM.

**Materiales de la sala: selector al lado del nombre, en grilla
horizontal de 3 columnas.** Primera vuelta: los 6 `<select>` de
material dejaron el `.materiales-grid` original (etiqueta arriba,
`<select>` abajo, patrón `.picker`) por 6 filas `.rline` apiladas
verticalmente, una por línea — mismo componente que "Nivel de escucha"/
"Género musical" (nombre a la izquierda con `.rl`, 14px; control a la
derecha). El usuario pidió que, además de ir al lado del nombre, los 6
volvieran a alinearse horizontalmente, no en una lista vertical larga:
`.materiales-grid` volvió (3 columnas, `repeat(3,1fr)`, responsive a
2/1 columnas), pero ahora cada celda es una fila `.rline` completa
(nombre + `<select>`) en vez de sólo el `<select>`. Dentro de la
grilla, `.rline` pierde su `margin-top` (el `gap` de la grilla ya separa
las celdas) y no hace wrap; `.sel-compact` pasa de un `min-width:190px`
fijo a `flex:1 1 auto` con `width:100%` — se estira para llenar el
espacio que le queda a la derecha de la etiqueta dentro de cada columna,
en vez de un ancho fijo que podía no encajar en 3 columnas.

**Dorado: color menos brillante, y acotado en la guía a hover/abierto,
no permanente.** `--dorado` pasó de `#C9A24B` a `#B8996A` — mismo tono,
más apagado, menos saturado, para no competir tanto con el resto de la
paleta ya desaturada del sitio (`--ok`/`--warn`/`--alert`). Además, en
la pantalla "Guía del análisis" los 9 títulos desplegables dejaron de
ser dorados de forma permanente: bajan a 16px (antes 21px, heredado de
`.card h3` — se veían desproporcionados para una lista de ítems
clicables) y su color por defecto vuelve a `--text` (blanco); sólo se
ponen dorados con `:hover` o mientras están abiertos (`.info-item[open]
summary h3`), como señal de qué ítem está activo o a punto de abrirse.
Los títulos de las tarjetas de evaluación (`.card h3` fuera de
`.info-item`) y los encabezados `.lead`/`.rail h2`/`.main h2` del resto
del sitio siguen dorados de forma permanente — el cambio a
hover/abierto es específico de la lista de la guía.

**Guardar configuraciones con login queda diferido, no implementado.**
Se pidió una función para guardar la configuración actual detrás de un
inicio de sesión, con una pantalla de configuraciones guardadas y
comparación entre ellas — explícitamente como algo "para después"
("después podrías desarrollar..."). No se tocó: exige backend, cuentas
de usuario y una base de datos, lo que rompe la doctrina actual del
sitio (cero dependencias de runtime, se abre por doble clic vía
`file://`, todo el estado vive en memoria/`localStorage` del propio
navegador). Queda listado en "Falta" más abajo hasta que haya una
sesión dedicada a decidir la arquitectura (¿backend propio? ¿Vercel
KV/Postgres? ¿auth de terceros?) — la misma razón por la que otras
piezas grandes de este documento (Cardas vs. tercios, factor de
amortiguamiento real) están ahí y no implementadas a medias.

**Desplegado en Vercel.** Producción en
`https://hifimatch-web-5bbj.vercel.app/`, conectado al branch `master`. Root
Directory en la raíz del repo (no en `apps/web` — ese apunte rompe la
resolución de workspaces); `buildCommand` corre `npm run verify && npm run
build`, así que una regresión de tests o de typecheck bloquea el deploy antes
de publicar nada.

Falta:
- **Guardar configuraciones con login**, pantalla de configuraciones
  guardadas y comparación entre ellas: pedido explícitamente como
  trabajo futuro, no de esta ronda. Necesita backend/auth/base de datos
  — arquitectura nueva, sin diseñar todavía.
- **Fase 5** (seguir ampliando el catálogo) y la regla de `cables` (sección 5
  de `docs/motor-mvp.md`): trabajo sin fin natural, ninguna de las dos es
  parte del alcance actual.
- **Factor de amortiguamiento real** (necesita impedancia de salida de
  amplificador, dato que el catálogo no tiene todavía para ningún ampli) y
  **audibilidad del piso de ruido** (necesita SNR de streamers/DACs, ídem):
  deferidas a una ronda de catálogo futura, no de motor.
- **Ubicación de parlantes: regla de Cardas vs. tercios**, como alternativa
  a la disposición de referencia única que calcula hoy `sala.ts`: sin
  diseñar, sesión aparte.
