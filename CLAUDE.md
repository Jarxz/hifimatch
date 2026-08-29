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
severidades de potencia/carga/modos/reverberación (siempre presentes) y
puente/recorrido **por cada fuente elegida** (streamer y/o DAC, evaluados
por separado) en un número **1-10 con un decimal** (ej. `8,7`), con pesos
que el sitio declara (potencia 24 % · carga 20 % · modos 10 % ·
reverberación 10 % · puente 10 % y recorrido 8 % por fuente,
`docs/motor-mvp.md` sección 7). El total de criterios es variable: 4 sin
streamer ni dac elegidos, 6 con uno, 8 con los dos a la vez. `sin-datos`
(o un componente no aplicable) se excluye del cálculo — no puntúa ni
penaliza, y el sitio declara cuántos de los aplicables sí se evaluaron. Se
rotula en pantalla como "Criterio editorial, no física", en su propio
bloque, nunca junto a un veredicto de capa física. Con streamer y dac
elegidos a la vez, puente y recorrido **ya no se combinan** con
`peorSeveridad()` (como hacían antes) — cada fuente puntúa por separado,
así un problema en una no le baja la nota a la otra; `peorSeveridad()`
sigue exportada en `puntaje.ts` por si sirve para otra combinación futura.

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

**Quinta ronda: 4 equipos, uno por categoría.** Focal Sopra N°2
(parlante), Hegel H30A (amplificador), HiFi Rose RS130 (streamer) y
T+A DAC 200 (DAC) — catálogo a 53 equipos (14+13+12+11+3). Dos casos
particulares:

- **Focal Sopra N°2**: la ficha oficial declara 91 dB de sensibilidad
  y 3,1 Ω de impedancia mínima; una medición independiente (NRC/
  SoundStage) mide **87,5 dB reales** (casi 3,5 dB menos) y **2,6 Ω a
  104 Hz** de impedancia mínima, con un EPDR de sólo 1,1 Ω a 85 Hz — se
  registran los valores medidos, no los de fábrica, mismo criterio que
  el resto del catálogo aplica a sensibilidades y cargas sobreestimadas.
- **HiFi Rose RS130** es un *transporte* de red puro — sin DAC
  integrado, sin salida analógica alguna, sólo salidas digitales
  (coaxial, óptica, AES/EBU, HDMI I2S) hacia un DAC externo.
  `salidaV`/`impedanciaSalidaOhm` quedan en `null` con `confianza:
  'alta'` (no es un dato que falte investigar — es un dato que este
  equipo, por diseño, no tiene) y `pendiente` lo explica. Verificado
  extremo a extremo: al elegirlo, las tarjetas de puente y recorrido de
  streamer se ocultan solas (mismo mecanismo que ya usa Cambridge CXN
  V2 con datos realmente faltantes) y el resumen final lo declara en
  "Sin datos suficientes".

Hegel H30A es la primera entrada del catálogo que es explícitamente
un *amplificador de potencia sin previo* (necesita un Hegel P30A u
otro previo) en vez de un integrado — mismo tratamiento de categoría
que ya recibía el McIntosh MC252. Se registran las cifras de modo
estéreo (300 W/8 Ω, 600 W/4 Ω) como `potencia8OhmW`/`potencia4OhmW`
—comparables al resto del catálogo— con el modo mono (1100 W) y la
estabilidad declarada con carga de 1 Ω como dato adicional en
`chipsExtra`, no en los campos numéricos principales. Sensibilidad de
entrada no publicada por el fabricante en ningún documento
consultado — `sensEntradaMv: null`.

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
  "Criterio editorial, no física". (Ronda posterior: los umbrales de color
  se quedaron iguales, pero el número pasó de entero a un decimal y de 5 a
  hasta 8 criterios — ver el párrafo "Puntaje del match" más arriba.)
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
  plano, puesta en una oración. (Ronda posterior: con el arrastre manual
  de parlantes, pasó a reportar cada parlante por separado en vez de un
  valor compartido — ver el párrafo "Arrastrar parlantes en el plano" más
  abajo.)
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

**Renombrado de marca: "The Hifi Match", logo animado en la portada.**
El wordmark visible del sitio pasa de "CADENA" a "The Hifi Match" — el
nombre interno del motor (`CADENA`, este documento, `packages/engine`,
historial de commits) no cambia: sigue siendo la separación que ya
declara la primera sección de este documento, "el motor es el
producto; la interfaz es intercambiable". Cambian: el `<title>`
(`meta.titulo` en `es.ts`/`en.ts` y el `<title>` estático de
`index.html`, para que la pestaña del navegador coincida antes de que
cargue JS), el wordmark grande de la portada (`.mark`, animado, ver
abajo) y el wordmark chico del header en configurar/resultado/guía
(`.hm`, estático, "HIFI **MATCH**" sin el "THE" — versión compacta,
mismo criterio que muchas marcas usan un lockup completo en la
portada y uno abreviado en la navegación).

La primera versión del logo animado (línea central que se desvanece +
letras individuales escalonadas desde el centro, con un bug de
especificidad CSS encontrado y corregido en el camino) quedó
**reemplazada por completo** por el diseño de la ronda siguiente — ver
más abajo el diseño vigente ("THE" primero, "HIFI MATCH" se desliza
después). El wordmark completo lleva `aria-hidden="true"` porque vive
dentro de un `<button>` que ya tiene su propio `aria-label`
(`splash.entrarAria`) — el texto animado es puramente decorativo para
lectores de pantalla, dato que sigue vigente en el diseño actual.

**Ronda de pulido de marca: nombre completo siempre, "THE" también en
negrita, hover dorado, y cierre de copy en la portada.** El wordmark
chico del header (`.hm`, en configurar/resultado/guía) pasa de "HIFI
**MATCH**" a "**THE** HIFI **MATCH**" — el nombre completo, siempre,
en vez de una versión abreviada; y "THE" se suma a "MATCH" en
negrita en los dos wordmarks (grande animado de portada y chico de
header), dejando sólo "HIFI" en peso regular — un patrón de
"bookend" (negrita-regular-negrita) en vez de negrita sólo al final.
El wordmark grande de portada además cambia a `var(--dorado)` con
`:hover` sobre el botón que envuelve toda la portada (`.enter:hover
.mark`, con `transition:color .2s` para que el cambio no sea un salto
brusco) — la misma variable ya usada en el resto del sitio para
títulos, no un dorado nuevo.

El pie de la portada se reescribió: la línea `.foot` ("basado en
física · specs medidos") pierde el tercer ítem, "sin opiniones de
gusto" — una negación no le agregaba nada al ya-declarado "basado en
física". En su lugar, una frase nueva debajo (`.cierre`,
`splash.cierreHtml`, `data-i18n-html` porque lleva `<b>` en el nombre
de marca) la reemplaza con un cierre en positivo: "**The Hifi
Match** te da la información.<br>Tú escuchas y decides." — mismo
argumento que "sin opiniones de gusto" pero dicho como una división
de trabajo (el sitio da datos, la persona decide con el oído) en vez
de una negación, y coherente con la doctrina ya declarada en este
documento (el motor nunca emite juicios de gusto/tonales — acá se lo
dice también en la portada, antes de entrar). `idioma.test.ts`
(`CLAVES_HTML`) suma `splash.cierreHtml` a la lista esperada.

**Header (no portada): tracking más apretado, "THE" resaltado en
dorado permanente.** `.head .hm` (wordmark chico de
configurar/resultado/guía — la portada queda fuera a propósito)
bajó `letter-spacing` de `.28em` a `.12em` — a `.28em` las 3 palabras
del nombre completo ("THE HIFI MATCH", desde la ronda anterior) se
leían demasiado separadas entre sí, porque el `letter-spacing` de un
nodo de texto plano también estira el espacio literal entre
palabras, no sólo entre letras. `padding-left` baja en la misma
proporción (mismo valor que `letter-spacing`, ya era la convención
para compensar el espacio que el tracking deja después del último
carácter). Además, "THE" del header gana una clase propia
(`.hm-the`) con `color:var(--dorado)` **permanente** — no depende de
`:hover` como en la portada; es un resaltado fijo, ya que el header
no es un botón clickeable como el `.enter` de la portada.

**Header fijo (no portada) + botón "Guardar" placeholder.** `.head`
(wordmark + botones ES/EN/Info/etc.) pasa de estar en el flujo normal
de `.wrap` a `position:fixed; top:0`, centrado con `left:50%;
transform:translateX(-50%)` y el mismo `max-width:1120px` que
`.wrap`, para que la barra quede pegada arriba mientras el resto de
la pantalla scrollea debajo — verificado con una captura scrolleada
400px, el header no se mueve. La portada queda afuera a propósito
(no tiene `.head`, ya usa su propio `.idioma-splash` fijo, patrón que
ya existía). Como un elemento `position:fixed` sale del flujo,
`.wrap` ya no le "hace espacio" automáticamente: los 3 `.wrap` de
configurar/resultado/guía llevan `padding-top:112px` (calculado
midiendo `.head.getBoundingClientRect().height` ≈ 86,5 px + los
26 px que ya tenía `.wrap` de padding-top original) para que el
contenido de abajo arranque en la misma posición que antes, no tapado
por la barra.

En el header de la pantalla de resultado se agregó un botón
**"Guardar"** entre "Info" y "← Cambiar sistema". Al clickear abre el
mismo `<dialog>` que ya usan los botones "i" de cada tarjeta
(`abrirPopup(titulo, cuerpoHtml)`, extraído de `abrirInfoPopup` para
reusar el mismo diálogo con contenido distinto) con el mensaje
`resultado.guardarPopupTitulo`/`guardarPopupCuerpo`: "Debe iniciar
sesión" / "Pronto disponible." — mismo patrón que "Ficha del producto
· próximamente": declara la limitación en vez de fingir una función
que no existe. Sigue siendo parte de lo que "Falta" al final de este
documento (guardar configuraciones con login, arquitectura de
backend/auth sin diseñar); este botón es sólo la entrada visible que
hoy explica por qué todavía no se puede guardar.

**Logo de portada rediseñado: "THE" primero, "HIFI MATCH" se desliza
después, relleno dorado en hover.** Reemplaza por completo la
animación de línea-central + letras escalonadas de la ronda anterior
(esa versión y su bug de especificidad quedan documentados arriba
sólo como historial). Secuencia nueva: **"THE"** (siempre dorado,
`color:var(--dorado)` fijo, no depende de hover) aparece solo primero
(fade de opacidad, `.the{animation:the-in}`); recién después, "HIFI
**MATCH**" se desliza desde la izquierda hacia su posición final
(`.hm-base{transform:translateX(-22px)→translateX(0)}` + fade,
`animation-delay:.5s` para que empiece cuando "THE" ya está
asentado) — la lectura es "sale de adentro de THE, se despliega hacia
la derecha", no letra por letra como antes.

El hover ya no es un cambio de color instantáneo: es un **barrido
horizontal** que llena "HIFI MATCH" de dorado empezando del lado de
"THE". Técnica: `.hm-wrap` (`position:relative`) contiene dos copias
idénticas de "HIFI MATCH" superpuestas — `.hm-base` (blanca, la que
ya se deslizó al cargar) y `.hm-fill` (dorada, `position:absolute`
encima, oculta con `clip-path:inset(0 100% 0 0)` — recortada por
completo desde la derecha). En `:hover` sobre el botón, `.hm-fill`
anima a `clip-path:inset(0 0% 0 0)` en 0,5 s: el recorte retrocede de
derecha a izquierda, así que la porción dorada visible **crece de
izquierda a derecha** — un barrido, no un fundido parejo. Sin JS, dos
copias de texto en vez de una (costo aceptado a cambio de un efecto
que `transition:color` no puede lograr: color sólido no tiene
"dirección").

**Las 3 palabras del nombre, más juntas en todas partes.** El `gap`
entre "THE"/"HIFI"/"MATCH" en el logo grande de portada bajó de
`.34em` a `.16em` (mismo valor heredado también por el gap interno
entre "HIFI" y "MATCH" dentro de `.hm-base`/`.hm-fill`). En el header
chico (`.hm`, no-portada) el `letter-spacing` bajó de `.12em` (ya
reducido en la ronda anterior) a `.05em` — pedido explícito de seguir
acortando la separación entre palabras en las dos versiones del
wordmark, grande y chica.

**Animaciones "tipo Apple" en toda la interacción interactiva del
sitio.** Pedido explícito de sumar movimiento suave a menús
desplegables, barras, popups e "inicio de sesión" — cuatro piezas,
todas en CSS puro (más un cambio mínimo de JS para las transiciones
de pantalla), con la misma curva de easing (`cubic-bezier(.22,.61,
.36,1)`) ya usada en el logo de portada, para que el sitio entero
comparta un solo "lenguaje de movimiento" en vez de que cada pieza
tenga su propio ritmo:

- **Cambio de pantalla con View Transitions API.** `ir(pantalla)`
  (`vista/pantallas.ts`) envuelve el cambio de clase `.active` en
  `document.startViewTransition(...)` cuando el navegador lo soporta
  — un fundido cruzado real entre pantallas (splash→configurar→
  resultado→guía) en vez del corte instantáneo de antes.
  `::view-transition-old(root), ::view-transition-new(root)` fija
  duración y curva propias. Sin soporte del navegador, cae directo al
  cambio de clase de siempre — la función tiene el mismo
  comportamiento observable en cualquier navegador, sólo cambia si
  hay fundido o no. Encontrado y corregido en el camino: navegar dos
  veces seguido rápido (como un test automatizado, o un click
  doble) aborta la transición anterior con `AbortError: Transition
  was skipped` — comportamiento esperado de la API, pero sin capturar
  la promesa `ready` quedaba como *unhandled rejection* en consola;
  ahora se atrapa en silencio.
- **`<dialog>` (info-popup y "Guardar") con entrada/salida animada.**
  Técnica moderna con `@starting-style` + `transition-behavior:
  allow-discrete`: el diálogo pasa de `opacity:0` + `scale(.95)
  translateY(8px)` a su estado final en 0,25 s (mismo tratamiento
  para el `::backdrop`), y la salida (`dialog.close()`) revierte
  suave en vez de desaparecer de golpe — antes `showModal()`/`close()`
  no tenían transición alguna.
- **`<details>` (tarjetas colapsables y "Ver descripción") con
  aparición suave del contenido.** `.detalle[open] > :not(summary)` y
  `.info-item[open] p` llevan una animación corta
  (`detalle-in`, fade + `translateY(-5px)→0`, 0,3 s) que se dispara
  sola cuando el contenido pasa a visible — funciona sin
  `@starting-style` porque una `animation` (a diferencia de
  `transition`) arranca sola en cualquier elemento que empieza a
  matchear el selector, sin depender del soporte más nuevo.
- **Controles segmentados (`.segs`) y `<select>` con transición de
  color/borde** en vez de cambio instantáneo — detalle menor pero
  consistente con el resto.

**Límite real, no una carencia del sitio: el menú desplegable nativo
de `<select>` no se puede animar.** La lista de opciones que abre un
`<select>` la dibuja el sistema operativo/navegador fuera del árbol
de la página — ningún CSS del sitio llega ahí, en ningún navegador.
Lo único animable es la caja del `<select>` mismo (ya lleva la
transición de borde de arriba); es una limitación de la plataforma
web, no algo pendiente de esta ronda.

Todas las animaciones nuevas respetan `prefers-reduced-motion:reduce`
(mismo bloque que ya neutralizaba el logo de portada, ampliado).

**Header responsive: grilla en vez de flex, para controlar dónde
rompe la línea en mobile.** En pantallas angostas (teléfono, ≤640px)
el header fijo pasaba a dos filas con `flex-wrap`, pero la fila
quedaba mal repartida: "Resultado"/"Configurar"/"Guía del análisis"
(`.hs`) se quedaba pegado al logo en la primera fila, y los botones
(ES/EN, Info, Guardar, Volver) caían solos a una segunda fila,
visualmente desalineados del texto. Se cambió `.head` de
`display:flex` a `display:grid` con `grid-template-areas` — en
desktop sigue siendo "hm/hright" arriba y "hs/hright" abajo (mismo
aspecto que antes, `.hright` centrado verticalmente contra todo el
bloque); en mobile pasa a "hm hm" (el wordmark solo, ocupando toda la
fila) seguido de "hs hright" (el subtítulo y los botones **en la
misma fila**, que es lo que se pidió). Esto exigió sacar `.hm` y
`.hs` de un `<div>` envolvente común a un nivel: ahora son hijos
directos de `.head`, cada uno con su propio `grid-area`, así el
punto de quiebre de la grilla cae entre el logo y el resto, no entre
el bloque logo+subtítulo y los botones. En el mismo breakpoint,
tipografía y padding bajan en bloque: `.hm` de 19px a 12px, `.hs` de
11px a 8,5px, `.back` (Info/Guardar/Volver) de 12px a 9,5px, los
botones ES/EN de `.segs.idioma` con padding más chico — y
`#s-config/#s-results/#s-info .wrap` ajusta su `padding-top` de
compensación (112px → 82px) porque el header fijo mismo queda más
bajo. Verificado con `Emulation.setDeviceMetricsOverride` en Chrome
headless a 375/414px (teléfono) y 768/820/1024px (tablet/desktop) —
tablet en adelante no necesita el breakpoint, ya entra cómodo en una
sola fila sin achicar nada.

**Desplegado en Vercel.** Producción en
`https://hifimatch-web-5bbj.vercel.app/`, conectado al branch `master`. Root
Directory en la raíz del repo (no en `apps/web` — ese apunte rompe la
resolución de workspaces); `buildCommand` corre `npm run verify && npm run
build`, así que una regresión de tests o de typecheck bloquea el deploy antes
de publicar nada.

**Arrastrar parlantes en el plano (vista Superior) — primer widget
interactivo con mouse del sitio.** `packages/engine/src/sala.ts` gana
`calcularDisposicionManual(sala, parlanteIzq, parlanteDer)`: los dos
parlantes se mueven de forma **independiente** (no en espejo), y el punto
dulce **se recalcula solo** en cada movimiento — va sobre la mediatriz del
segmento que une los parlantes (generaliza la fórmula simétrica existente,
que ya ponía el punto dulce a `separación×1,2` sobre la línea central;
sobre la mediatriz esa misma distancia sigue garantizando equidistancia
por construcción, sea cual sea la posición de cada parlante — ver
`docs/motor-mvp.md` sección 4 para la prueba). `MARGEN_MURO_MIN_M = 0,15`
impide soltar un parlante (o el punto dulce derivado) pegado a un muro o
fuera de la sala. De paso se corrigió un bug latente: `reflexionIzq`/
`reflexionDer` usaban una fórmula 2D vieja, independiente de la que ya
usaban las demás reflexiones (`reflexionEnPlano`) — sólo coincidían porque
la sala siempre era simétrica hasta ahora; unificadas, con el mismo
resultado numérico en el caso simétrico (test de regresión en
`sala.test.ts`). `apps/web/src/vista/plano.ts` (sigue puro) gana un
parámetro `editable` — sólo tiene efecto en la vista Superior, la única
con matemática de proyección invertible sin trigonometría
(`proyeccionSuperior`, exportada para que el arrastre nunca pueda
desincronizarse del dibujo) — que envuelve cada parlante en
`<g data-parlante="izq|der">` con un círculo de agarre invisible
(`r=20`, área generosa). El arrastre en sí vive en
`apps/web/src/vista/arrastre.ts` (nuevo, DOM puro — ni `plano.ts` ni
`pintar.ts` lo tocan): un solo listener delegado sobre `#plan` (Pointer
Events, mouse y touch unificados) que sobrevive a cada repintado,
`requestAnimationFrame` para no disparar más de un recálculo por frame, y
un flush forzado en `pointerup` para que un arrastre muy rápido no pierda
la última posición si el frame de rAF todavía no había corrido (bug real,
detectado por el propio script de verificación con Chrome headless antes
de este commit). Arrastrar es sólo **vista previa** — repinta el plano y
el párrafo de ubicación en vivo sin tocar potencia/puntaje/resumen — hasta
que el botón **"Recalcular"** (mismos hover que el resto del sitio, clase
`.back` con `transition` agregada) congela esa posición en un snapshot
completo (potencia, puntaje, "La cadena", "Sala", "En resumen") y lo
publica en una **segunda pestaña** ("Modificado") junto a "Análisis
original", que nunca se pisa; volver a arrastrar y recalcular reemplaza el
contenido de "Modificado" — nunca aparece una tercera pestaña. Cambiar de
pestaña repinta un snapshot ya calculado (`pintarSnapshot` en `main.ts`)
sin recalcular el motor: carga/puente/recorrido/modos/reverberación no
dependen de la posición, así que se calculan una sola vez por "Analizar"
(`ultimoAnalisis`, caché compartida) en vez de duplicarse entre pestañas.
`modeloUbicacionParlantes` (en `resultado.ts`) ganó un parámetro `sala` y
pasó a reportar la distancia de **cada** parlante a su propia pared
frontal/lateral por separado, en vez de un único valor compartido — con
arrastre libre ya no son necesariamente iguales; en la disposición
automática (sin arrastrar nada) los dos pares de valores siguen
coincidiendo, así que el texto se lee igual que antes de esta ronda.
Verificado extremo a extremo con Chrome headless (PointerEvents
sintéticos): arrastre en vivo sin tocar el resultado, "Recalcular"
cambiando todo el análisis, vuelta exacta a "Análisis original", dos
ciclos de arrastre+Recalcular sin crear una tercera pestaña, el margen de
muro recortando un arrastre extremo, y un "Analizar" nuevo reseteando
todo.

**Plano más grande, y una colisión de etiquetas real corregida de paso.**
`.plan-wrap svg` pasó de `max-width:640px` a `max-width:100%` — llena el
ancho real de la tarjeta (~770-800px en desktop) en vez de un tope fijo
sin relación con el layout. Al verificar visualmente las 4 vistas a este
tamaño se encontró un bug preexistente (no introducido por este cambio de
CSS, sólo más visible con el gráfico más grande): en la vista Superior,
la etiqueta de muro "izquierdo" y la etiqueta de dimensión "largo" se
dibujan exactamente superpuestas — comparten el mismo `(x,y)` y sólo se
distinguían por `z` en las otras 3 vistas, pero Superior es la única
proyección que descarta `z`. Corregido con un offset horizontal mayor
para "largo" sólo en esa vista (`plano.ts`), separándolas en dos columnas
de texto — ver `docs/motor-mvp.md` sección 4 para el detalle. Confirmado
con capturas de Chrome headless en las 4 vistas, antes y después.

**Arrastrar un parlante en mobile ya no arrastra la página.** Bug
reportado tras el despliegue: en touch, mover un parlante en la vista
Superior también scrolleaba la página entera. `arrastre.ts` sólo
cancelaba el default en `pointerdown`, no en `pointermove` — sin eso, el
navegador puede seguir interpretando el gesto como scroll aunque el drag
ya esté funcionando. Se corrigió en tres capas, las tres estándar para
este problema: `preventDefault()` (no pasivo, `{passive:false}`) también
en `pointermove`; `touch-action:none` declarado **directo** (atributo
`style`, no sólo la clase `.parlante-arrastrable`) sobre las formas
realmente tocadas — el `<g>` que las agrupa no tiene geometría propia, y
el motor de touch de algunos navegadores decide scroll-vs-gesto sobre la
forma tocada, no sobre un ancestro sin geometría; y un `touchmove` crudo
de respaldo (además de todo lo anterior en Pointer Events) para
variantes de Safari/iOS donde el `preventDefault` de un pointer
sintetizado desde touch no siempre alcanza. No se pudo confirmar con
Chrome headless: `Input.dispatchTouchEvent` en ese entorno dispara un
scroll por su cuenta sin pasar por el pipeline real de eventos de touch
del DOM (`touchmove` nunca llegó a dispararse ahí, 0 veces, con o sin el
fix) — una limitación conocida de esa herramienta de simulación, no del
sitio.

**Confirmado en un teléfono real que las tres capas de arriba no
alcanzaban — dos capas más, reforzando en vez de reemplazar.** El
usuario probó en su celular: la página seguía moviéndose al arrastrar,
y además el arrastre se veía cortado/discontinuo (no un seguimiento
fluido del dedo). Las dos capas nuevas:

1. `construirPlanoSvg` (`plano.ts`) agrega `touch-action:none` también
   en el **`<svg>` raíz**, no sólo en el `<g>`/círculo de agarre de cada
   parlante — sólo cuando `editableEfectivo`. El cómputo de
   "intersección de touch-action con los ancestros" que define el spec
   no se respeta de forma confiable en la práctica sobre elementos SVG
   anidados en navegadores móviles reales (a diferencia de Chrome
   headless, que no lo puede exponer — de ahí que la ronda anterior no
   lo haya visto). Poner el freno en el elemento que sí recibe el toque
   de forma consistente es más robusto, a costa de que tocar el
   diagrama en cualquier punto (no sólo el círculo de agarre) tampoco
   scrollea la página mientras es editable — cambio de alcance
   aceptado, el diagrama es chico dentro de la tarjeta.
2. `arrastre.ts` gana `bloquearScrollPagina()`/`restaurarScrollPagina()`:
   mientras hay un lado activo, fija `document.body.style.touchAction =
   'none'` (guardando el valor previo) y lo restaura al soltar. `body`
   es un elemento HTML plano — ahí `touch-action` sí se respeta de
   forma consistente en todos los navegadores, sin la ambigüedad de
   ancestro-SVG del punto anterior. Explica también el segundo síntoma
   reportado (arrastre "cortado"): con la página scrolleando en
   paralelo al gesto, cada `pointermove` recalculaba la posición con
   `svg.getScreenCTM()` sobre un SVG que se había movido en la
   pantalla — el parlante no seguía al dedo de forma continua porque el
   propio sistema de referencia cambiaba de un frame al otro.

Test de regresión nuevo en `plano.test.ts` verifica el `touch-action`
del `<svg>` raíz (presente sólo con `editable=true` en vista Superior,
ausente en cualquier otro caso) — lo único de este fix que es
verificable sin un dispositivo real, ya que `bloquearScrollPagina` es
DOM puro sin rama de lógica que un test de Node pueda ejercitar
distinto según el navegador. Igual que la ronda anterior, el
comportamiento real en touch **sigue sin poder confirmarse con Chrome
headless** — pendiente de una nueva prueba en teléfono real del
usuario.

**Selectores de equipo en dos pasos: marca → modelo.** Las 4 categorías
con selector (parlantes/amplificador/streamer/dac) pasaron de un único
`<select>` con todos los modelos mezclados a dos `<select>` en cascada —
elegir marca puebla el de modelo con sólo los equipos de esa marca.
`packages/data/src/tipos-catalogo.ts` gana un campo `marca: string` en
`ParlanteCat`/`AmplificadorCat`/`FuenteCat` (no en `CableCat`, que no
tiene selector todavía) — separado de `nombre` a propósito, no se deriva
por parseo de texto. `apps/web/src/vista/selectores.ts`
(`poblarSelectores`/`poblarModelos`/`vaciarModelos`) arma la lista de
marcas únicas (`Set` + `localeCompare`, no asume que el catálogo ya viene
agrupado) y filtra modelos por marca elegida. El de modelo arranca
deshabilitado con un placeholder ("Elige una marca primero") hasta que
hay marca; cambiar de marca siempre limpia el modelo elegido (reusa
`pick(kind, '')`, la misma limpieza de estado que ya usaba el `<select>`
único). El aviso "Más X · próximamente" se movió al final de la lista de
marcas — antes vivía duplicado al final de cada lista de modelos. CSS
nuevo (`.marca-modelo`, marca 36% / modelo el resto, apilados en columna
bajo 480px). `catalogo.test.ts` suma una prueba de que `nombre` siempre
empieza con `marca`, para atajar errores de tipeo al cargar equipos
nuevos.

**Ampliación grande del catálogo: 91 equipos nuevos, marcas más
reconocidas por categoría.** Catálogo a **114 equipos** (35 parlantes +
34 amplificadores + 12 streamers + 30 dacs + 3 cables, antes 53) — el
motivo fue directo: con el selector marca→modelo recién separado, varias
categorías tenían sólo 1 modelo por marca, lo que dejaba el paso de
"modelo" casi vacío para la mayoría de las marcas. Investigado con 3
agentes en paralelo (uno por categoría — parlantes, amplificadores,
dacs), cada uno con la misma disciplina de fuente + confianza que el
resto del catálogo: ficha oficial o medición independiente citada
(Stereophile, Hi-Fi News, Audio Science Review, SoundStage Network,
Hi-Fi+, StereoNET, Erin's Audio Corner), `null` declarado con `pendiente`
cuando el dato genuinamente no se publica — nunca una cifra inventada
para completar un casillero. Marcas nuevas agregadas: **JBL** y
**Yamaha** en parlantes; **Pioneer** en amplificadores; **iFi audio** y
**SMSL** en DACs (Topping ya era la única marca china del catálogo en
DACs; SMSL suma la segunda, tope declarado por el sitio de 1-2 marcas
chinas por categoría — ninguna otra categoría suma una marca china
nueva). Las marcas ya presentes (Bowers & Wilkins, Dynaudio, ELAC, KEF,
Klipsch, Monitor Audio, Sonus Faber, Wharfedale, Arcam, Cambridge Audio,
Denon, Hegel, Marantz, McIntosh, NAD, Rega, Chord, RME, Schiit, PS Audio,
T+A) suman 1-2 modelos más cada una, en vez de quedarse con el único que
tenían. Varios casos quedaron documentados con el mismo rigor que ya
tenía el catálogo: discrepancias entre ficha oficial y medición
independiente resueltas declarando ambas cifras y explicando cuál se usa
(ej. Cambridge Audio Azur 851D: fábrica declara "<50 Ω", Stereophile
midió 92 Ω balanceado; T+A DAC 8 DSD: fábrica declara 22/44 Ω, Stereophile
midió 46-53/104-114 Ω); salidas configurables registradas por su máximo,
nunca promediadas (iFi NEO iDSD, iFi Pro iDSD, Topping D90 III Sabre);
un caso de impedancia de salida que ni el fabricante ni la medición
independiente llegaron a publicar con cifra exacta (SMSL M400 — el
propio revisor de Audio Science Review declara no haberla medido) se deja
en `null` en vez de adoptar su estimación como si fuera un dato medido.

**Mapa de zonas modales — probado en dos rondas, retirado por completo.**
Se construyó una capa de color (verde-amarillo-rojo) mostrando, en un
plano de planta, dónde coinciden los nodos y antinodos de los pares de
modos que `curvamodal.ts` ya cura y grafica en 1D — primero como capa de
fondo dentro de la vista Superior del plano isométrico, después (a pedido
del usuario, que la quería asociada a "Modos" y no mezclada con el
plano de reflexiones) como diagrama propio de la tarjeta "Modos" con
desenfoque gaussiano para dar manchas de color continuas en vez de una
grilla de celdas. Ninguna de las dos versiones reflejó lo que el usuario
buscaba — pidió eliminarla directamente después de ver la segunda ronda,
así que se retiró por completo (`apps/web/src/vista/mapamodal.ts` y su
test, borrados; `#mo-mapa`/`#mo-mapa-leyenda` y su CSS, sacados de
`index.html`/`estilos.css`; las claves `motor.modos.mapaCaption`/
`leyendaMapa*` y la mención del mapa en `info.modos.cuerpoHtml`,
revertidas). Lo único que sobrevive de ese trabajo: `paresMasImportantes`/
`TOP_N_AGRUPADOS` se quedaron promovidas en `modos.ts` (ya no eran lógica
privada duplicada de `curvamodal.ts`, y las curvas 1D siguen usándolas
tal cual). `proyeccionSuperior` volvió a vivir dentro de `plano.ts` — el
archivo `vista/proyeccion.ts` sólo existía para que `mapamodal.ts` la
importara sin crear un ciclo; sin ese consumidor, la extracción ya no
tenía motivo, así que se plegó de vuelta (sin cambios para
`arrastre.ts`/`plano.test.ts`, que ya la importaban vía el re-export de
`plano.ts`). El plano isométrico de reflexiones (`plano.ts`) queda
exactamente como estaba antes de que este trabajo empezara.

**Streamers ampliados: 18 equipos nuevos, cierra la ronda de ampliación de
catálogo.** Catálogo a **132 equipos** (35 parlantes + 34 amplificadores +
**30 streamers** + 30 dacs + 3 cables, antes 114) — cuarto y último agente
de investigación de esta ronda, misma disciplina de fuente + confianza que
las otras 3 categorías ya ampliadas. Marcas expandidas: Audiolab,
Bluesound (3 modelos nuevos), Cambridge Audio, Naim; marcas nuevas: NAD (3
modelos, cubriendo desde un streamer de entrada sin salida analógica hasta
uno sin salida analógica alguna — ver abajo), Yamaha (3), Sonos, Denon (3).
Casos de interés: **Sonos Port**, uno de los componentes más vendidos de
la categoría, no tiene voltaje ni impedancia de salida publicados en
ninguna fuente oficial ni independiente pese a revisar manual, ficha y
foros de medición (ASR) — queda en `null`, mismo criterio que el resto del
catálogo aplica a un dato genuinamente ausente, sea cual sea la popularidad
del equipo. **NAD C 658** declara su impedancia de salida como una fórmula
dependiente de la fuente conectada ("Source Z + 240 Ω"), no un número fijo
del equipo — no hay forma honesta de reducirla a un valor único, así que
`impedanciaSalidaOhm` queda en `null`. **NAD M50.2** es un
reproductor/servidor sin salida analógica alguna (sólo HDMI/AES-EBU/
óptica/coaxial, confirmado por ficha oficial y reseña de Stereophile) —
mismo tratamiento que el HiFi Rose RS130 de la ronda anterior: `null` con
`confianza: 'alta'`, porque no es un dato que falte investigar sino un
dato que el equipo, por diseño, no tiene. **Bluesound Node 2i**: su cifra
de impedancia de salida (650 Ω) aparece como dato secundario dentro de un
hilo de soporte oficial centrado en confirmar la del Node N130 (2,2 V/
500 Ω) — se registra igual por ser la misma persona de soporte técnico
oficial, atribuida y específica por modelo, con la salvedad declarada en
`pendiente`.

**Pasada general de compresión de espaciado.** A pedido del usuario, la
página de resultado quedaba demasiado larga con demasiado espacio vacío
entre tarjetas y dentro de ellas. Bajaron entre 20 y 35% los márgenes/
paddings de `.card`, `.geo-split` (el divisor interno entre Plano/Modos/
Reverberación, el mayor ahorro individual: de 52px a 34px por divisor),
`.detalle`, `.rail .blk`, `.grid`, y el equivalente en la pantalla de
configurar (`.rline`, `.picker`, `.room`, `.soon`, `.foot-bar`, `.lead`)
— sin tocar `padding-top` de `.wrap` (ese compensa la altura del header
fijo, no es espacio "vacío"). Una ronda posterior, a pedido explícito
también, achicó además la barra "Ver detalle técnico" (`.detalle
summary`) de `padding:9px 2px` a `padding:4px 2px` — quedó ceñida al
texto en vez de con aire de sobra arriba/abajo. Ningún cambio de
estructura, sólo valores de espaciado — verificado que la página de
resultado completa (con las tarjetas colapsadas por defecto) entra en un
scroll bastante más corto que antes.

**Bug: el `<select>` de marca se quedaba gris para siempre, incluso con
una marca elegida.** `pick()` (`main.ts`) ya alternaba la clase `.empty`
(texto gris vs. blanco, `.sel select.empty{color:var(--faint)}`) en el
`<select>` de *modelo* al elegir un equipo — pero el de *marca* nunca la
tocaba: nace con `class="empty"` en `index.html` y ningún código la
sacaba, así que el nombre de la marca elegida se seguía viendo gris,
como si fuera un placeholder sin elegir. `setMarca()` ahora hace
`selMarca.classList.toggle('empty', !marca)` — mismo criterio que ya
usa `pick()` para el select de modelo, aplicado también al de marca.

**Padding interno de cajas: el gap de "Ver detalle técnico" como regla
general.** El usuario pidió tomar la distancia entre esa barra y la
línea (borde) inmediatamente arriba de ella — `.detalle{padding-top:2px}`
+ `.detalle summary{padding:4px 2px}` = 6px — como el estándar para
cualquier otro "línea → texto" del sitio, no sólo ese caso puntual.
`.card{padding:18px 20px}` baja a `padding:6px 20px` (sólo vertical; el
horizontal no se tocó, no fue parte del pedido) — así "CAPA FÍSICA"/
"GEOMETRÍA" queda a la misma distancia del borde superior de la tarjeta
que "VER DETALLE TÉCNICO" de su propia línea. `.geo-split` (el divisor
interno entre Plano/Modos/Reverberación) baja de `padding-top:16px` a
`6px` por la misma razón — ahí `.ct`/`.geo-split` es el mismo div, sin
un nivel de anidamiento extra como en `.detalle`, así que 6px directos
igualan el mismo gap visual. `.rail .blk` (Puntaje/La cadena/Sala) y
`.info` (tarjeta de equipo elegido en Configurar) — los "cuadros" que el
pedido nombra explícitamente para la página de selección de equipos —
bajan igual a `padding-top/bottom:6px`. `.info-item` (tarjetas de la
Guía) no necesitó tocarse aparte: ya es `class="card info-item"`, hereda
el nuevo padding de `.card` directamente. Deliberadamente fuera de esta
pasada: los márgenes ENTRE cajas (`.card{margin-bottom:12px}`, gap antes
de un `.geo-split`) — el pedido fue sobre el espacio interno borde↔texto
de una misma caja, no sobre la separación entre cajas distintas.

**Distancia de cada parlante a pared frontal/lateral, en el plano.** El
plano de reflexiones (`plano.ts`) suma 2 líneas blancas segmentadas por
parlante — a su pared frontal (y=0) y a su pared lateral respectiva
(izquierda x=0 para el parlante izquierdo, derecha x=W para el
derecho) — con la distancia en metros como texto, mismas 2 fórmulas
(y mismos números) que ya reporta el párrafo "Ubicación de referencia
de los parlantes" (`modeloUbicacionParlantes`, `resultado.ts`) debajo
del diagrama. No es un dato nuevo del motor: `sala.ts` ya tenía
`disp.parlanteIzq`/`disp.parlanteDer`, sólo se dibujan 2 segmentos más
por parlante con el mismo patrón (`Pt3`/`linea()`/`texto()`) que ya usa
el triángulo de escucha — por eso se actualizan solas al arrastrar un
parlante (vista Superior) o al recalcular, sin lógica nueva: la función
sigue siendo pura, sólo lee `disp` de nuevo en cada repintado, igual que
el resto del dibujo. Verificado con Chrome headless: arrastrar el
parlante izquierdo cambia sus 2 números (y sólo los suyos — el derecho
no movido conserva los propios) y el SVG resultante es distinto
bit-a-bit del anterior.

**Pestañas "Análisis original"/"Modificado" en la misma fila que los
botones de vista, a la izquierda.** Primera vuelta: se probó alinear
verticalmente dos filas separadas (`#tabs-analisis` arriba, "Vista" +
botones de vista + Recalcular abajo) dándoles el mismo punto de arranque
horizontal — funcionaba, pero el usuario pidió ir más allá: una sola
fila, con las pestañas al principio. `#tabs-analisis` se movió dentro
del mismo `.rline.plan-toprow` que ya tenía "Vista" + `.plan-controles`,
como primer hijo (antes que la etiqueta "Vista") — ya no hace falta la
etiqueta "Vista" duplicada e invisible de la primera vuelta, se borró.
`.plan-toprow{justify-content:flex-start}` sigue evitando el
`space-between` por defecto de `.rline` en toda la fila; `.plan-controles`
sigue con `flex:1; justify-content:space-between` para que sólo
Recalcular se empuje al borde derecho de la tarjeta. Orden final en una
sola línea: Análisis original/Modificado — Vista — botones de vista —
Recalcular (empujado a la derecha). Verificado con Chrome headless: cabe
en una sola fila en desktop (con "Modificado" visible tras arrastrar y
Recalcular); en mobile (`flex-wrap:wrap` ya existente en `.rline`)
quiebra a dos filas sin romperse.

**Hover en los `.segs` de pestañas/vistas, y marco a "Recalcular".** Los
botones de un `.segs` (Análisis original/Modificado, y los 4 de vista)
sólo tenían estado activo (`[aria-pressed=true]`, fondo blanco) y foco —
ningún feedback al pasar el mouse sobre un botón sin presionar. Nueva
regla `.segs button:hover:not([aria-pressed=true])` (fondo
`rgba(255,255,255,.07)` + texto `--text`) — el `:not()` es necesario
porque, sin él, esta regla tiene la misma especificidad que
`[aria-pressed=true]` y el orden en la hoja decidiría el empate: el
botón activo (fondo blanco, texto oscuro) quedaría con texto claro
sobre fondo claro al pasarle el mouse, ilegible. `#btn-recalcular`
(hasta ahora texto dorado sin borde, heredado de `.back`) suma
`border:1px solid var(--line2)` — el "marco de línea gris" pedido — y
un hover propio que lo tiñe de dorado (`border-color:var(--warn)` +
fondo `rgba(199,173,124,.08)`), coherente con que su texto ya es
`--warn`. Verificado con Chrome headless disparando `mouseMoved` real
(no sólo mirar el CSS): el botón activo de un `.segs` no cambia de
color al pasarle el mouse, uno inactivo sí, y "Recalcular" muestra el
marco en reposo y el tinte dorado en hover.

**Bug (introducido por el marco de "Recalcular"): la fila de pestañas/
vistas se partía en dos líneas al mostrar "Modificado".** El `border` +
`padding` nuevo de `#btn-recalcular` (párrafo anterior) engordó el botón
~30px — lo suficiente para que, con "Modificado" visible (tras el
primer Recalcular), la fila pasara por apenas ~10px el ancho disponible
de la tarjeta en los anchos de escritorio más comunes (medido: fila de
736px, contenido de 746px con los 3 gaps de `.rline`) — el navegador la
partía, y encima el propio grupo de 4 botones de vista se envolvía
adentro de su caja (Isométrica/Frontal/Lateral arriba, Superior solo
abajo), no sólo la fila entera. `.plan-toprow .segs button` (selector
con el ancestro para no tocar el resto de los `.segs` del sitio — Nivel
de escucha, Género musical, ES/EN, etc.) baja de `padding:9px 16px` a
`9px 12px`; `#btn-recalcular` de `6px 14px` a `6px 12px` — mucho más
margen que los 10px que faltaban, para que tampoco se rompa con textos
más largos en inglés. Verificado con Chrome headless en 1152-1600px
(el ancho de tarjeta se satura en 736px desde ~1164px de ventana en
adelante, así que ese rango cubre la enorme mayoría de resoluciones de
escritorio reales): una sola línea, con "Modificado" visible. **Sigue
partiéndose en ventanas angostas de escritorio** (~1024px, entre el
breakpoint de `.grid` a 860px — ahí la barra lateral se apila arriba y
esto deja de ser un problema — y el ancho donde ya entra holgado): ahí
faltarían ~120px más, no unos pocos px — un recorte de padding tan
grande dejaría los botones incómodamente chicos en el ancho común, así
que se dejó así a propósito; si hace falta cubrir ese rango angosto
también, la solución real es bajar el breakpoint de `.grid`, un cambio
de alcance distinto a "ajustar ancho de botones".

**Dominio propio + formulario de contacto → email: primer backend real
del sitio.** Dos piezas relacionadas, pedidas juntas. El dominio
`thehifimatch.com` ya está comprado y apuntando al deploy (dato del
usuario, no hubo cambio de código de mi parte — comprar dominios/tocar
DNS está fuera de lo que puedo ejecutar). El formulario sí es código
nuevo, y es la primera vez que el sitio deja de ser 100% estático:
hasta ahora "cero dependencias de runtime" valía para todo el repo por
igual; a partir de acá vale específicamente para `packages/engine`,
`packages/data`, `packages/contact` y `apps/web` — `/api/contact.ts` es,
a propósito, la única excepción declarada, aislada en su propia carpeta,
nunca importada desde el resto.

**Por qué esto no era un problema de "alta consulta de análisis".** El
motor sigue corriendo 100% en el navegador — sin `fetch`, sin backend,
servido como archivo estático desde el CDN de Vercel — así que nada de
esta ronda lo toca ni necesita "escalar": ya escala solo, gratis, porque
no hay cómputo de servidor por análisis. El único punto nuevo de
posible abuso/costo es específicamente `/api/contact.ts`, así que ahí
se concentra toda la protección de esta ronda (ver abajo), no en el
motor.

**`packages/contact` (4º workspace, mismo patrón que `engine`/`data`):
validación pura, cero dependencias de runtime, consumida tanto por el
cliente (feedback instantáneo) como por el servidor (el borde de
seguridad real).** `validarContacto(entrada)` — un `codigo`, nunca texto
armado, mismo principio no-negociable del motor — chequea, en este
orden (de menor a mayor costo de un falso positivo): honeypot no vacío
→ `'honeypot'`; menos de 1000&nbsp;ms entre abrir el formulario y
enviarlo → `'muy-rapido'` (umbral corto a propósito — 2-3&nbsp;s
generarían falsos positivos con autocompletado o gente que tipea
rápido); formato de email inválido → `'email-invalido'`; mensaje vacío
→ `'mensaje-vacio'`; mensaje de más de 5000 caracteres (defensa, no un
límite de UX real) → `'mensaje-largo'`. `manejarContacto(entrada, {
enviarEmail })` recibe el envío de email **inyectado como dependencia**
— mismo principio de separación que ya usa el sitio entre lógica pura y
lo que toca el mundo exterior (`vista/pintar.ts`/`medidor.ts` vs. el
resto) — así el flujo completo se testea con `node --test`, sin red ni
credenciales, con un `enviarEmail` fake que sólo graba sus argumentos:
el caso feliz invoca `enviarEmail`; honeypot devuelve `{ok:true}` de
todas formas (nunca hay que confirmarle a un bot que fue detectado)
**pero sin llamar a `enviarEmail`**; cualquier otro rechazo devuelve
`{ok:false, codigo}` y tampoco llama a `enviarEmail`; si `enviarEmail`
rechaza (falla Resend), `'error-servidor'` sin exponer el detalle
interno al cliente (sí queda en `console.error`, visible en los logs de
la función).

**`/api/contact.ts`: adaptador delgado, sin CORS abierto.** Parsea el
request, arma el `enviarEmail` real (llamada a Resend, remitente
`onboarding@resend.dev` mientras `thehifimatch.com` no esté verificado
en Resend — ver "Falta" más abajo) y delega toda la lógica en
`manejarContacto`. Rechaza método distinto de `POST` (405); si faltan
`RESEND_API_KEY`/`CONTACT_TO_EMAIL` en las variables de entorno,
`error-servidor` sin arrancar Resend. Deliberadamente **sin**
`Access-Control-Allow-Origin` — el fetch del sitio es same-origin,
agregarlo habilitaría que cualquier sitio de terceros use el endpoint
embebiéndolo en su propio formulario. Vercel construye `/api/**` en un
paso separado del `buildCommand` de `apps/web` — por eso hay un
`tsconfig.api.json` propio en la raíz y un script `typecheck:api`
enganchado a la cadena de `verify`, para que una regresión ahí también
rompa el deploy (mismo criterio que `docs/despliegue.md` ya declara
para los demás workspaces — sin este agregado quedaba como una
excepción silenciosa a esa garantía).

**Frontend: un solo `<dialog>` de contacto, cuatro puntos de entrada, y
manejo explícito de `file://`.** El diálogo (`#contacto-popup`, mismo
framework CSS de animación/backdrop que `#info-popup`, con su propio
`<form>` en vez de sólo texto inyectado) se abre desde un botón
"Contacto" agregado a las 3 pantallas no-splash (mismo patrón repetido
que Info/Guardar/Volver) y desde un link fijo en la esquina inferior de
la portada. El honeypot es un `<input>` real (no `type="hidden"` —
algunos bots lo filtran a propósito) oculto con posicionamiento fuera
de pantalla, no `display:none`/`visibility:hidden` (mismo motivo).
**El sitio tiene que seguir funcionando por `file://`**
(`docs/despliegue.md`) y ahí un `fetch('/api/contact')` no es un error
de red recuperable — la URL ni siquiera resuelve a un host — así que
`enviarContacto` chequea `location.protocol === 'file:'` **antes** de
intentar la red y muestra directo un enlace `mailto:` con asunto/cuerpo
precargados, en vez de un error de red genérico y confuso. Verificado
con Chrome headless en los dos casos: por `file://` nunca llama a
`fetch` (interceptado y confirmado); servido por `http://`, si intenta
`fetch` (sin servidor real en el entorno de test, falla de red) el
error se maneja con el mensaje genérico, sin crash. También verificado
que el honeypot corta antes de la red y que un envío a menos de 1s del
`open` se rechaza — ambos casos client-side, antes de llegar al fetch.

**Postura anti-abuso, deliberadamente liviana para esta ronda — sin
sumar servicios de terceros nuevos.** Honeypot + chequeo de tiempo +
límite de longitud (arriba) cubren bots simples. El resto depende de
config, no de código — ver "Falta". Nada de rate-limit con un `Map` en
memoria: no funciona en serverless (instancias efímeras, sin memoria
compartida garantizada entre requests) — si en algún momento hace falta
un límite real por IP, la pieza correcta es Upstash Ratelimit (backing
store persistente), no implementado todavía porque no hay evidencia de
que haga falta.

**Bug de producción, encontrado recién con la función ya desplegada:
`FUNCTION_INVOCATION_FAILED` en cualquier request a `/api/contact`,
hasta un `GET` sin body — la causa no tenía nada que ver con el email,
era el import.** Vercel compila `/api/**` con su propio TypeScript,
**ignorando `tsconfig.api.json`** — confirmado leyendo el log de build
real: `error TS5097: An import path can only end with a '.ts' extension
when 'allowImportingTsExtensions' is enabled`, sobre el import de
`api/contact.ts` hacia `packages/contact` y, en cascada, sobre el
import interno de `manejar.ts` hacia `validar.ts` (ese segundo error
además disparaba un falso `Property 'codigo' does not exist` — el tipo
`ResultadoValidacion` no se resolvía porque el import de origen ya
había fallado). Lo insidioso: **esos errores no frenaban el build** — el
deploy "terminaba" igual, con la función rota adentro, así que no había
señal visible del problema hasta invocarla de verdad. `validar.ts` y
`manejar.ts` tenían un import relativo interno (`manejar.ts` → `./
validar.ts`) que necesitaba la extensión `.ts` para `node --test`
(confirmado además probándolo a mano: sacarla rompe `node --test` con
`ERR_MODULE_NOT_FOUND`) pero no la aceptaba el compilador de Vercel —
dos exigencias contrapuestas sobre el mismo import, imposibles de
satisfacer a la vez con dos archivos separados. Se fusionaron en un
solo `packages/contact/src/contacto.ts` (elimina el import relativo
interno entre los dos — ya no hay ningún punto donde las dos exigencias
choquen) y `api/contact.ts` importa ese archivo **sin** extensión — es
el único import de todo el repo así, documentado inline en los dos
archivos para que no se "corrija" por accidente en una limpieza futura.
Verificado con `tsc` standalone (sin `tsconfig.api.json`, con
`--skipLibCheck` para descartar un error no relacionado de los tipos de
`resend`/React) que compila limpio con esta estructura.

**Segundo bug de producción, independiente del anterior y encontrado
después de resolverlo: `ERR_REQUIRE_ESM` — mismo síntoma visible
(`FUNCTION_INVOCATION_FAILED` en cualquier request), causa distinta.**
El error de la extensión `.ts` (arriba) ya estaba resuelto en este
punto; los logs de **runtime** (no de build — distinción que costó dos
rondas de confusión antes de conseguir el log correcto) mostraban:
`Error [ERR_REQUIRE_ESM]: require() of ES Module .../packages/contact/
src/contacto.js from .../api/contact.js not supported`. Causa: **cada
`package.json` del repo declara `"type":"module"`** (`packages/engine`,
`packages/data`, `packages/contact`, `apps/web`) **menos el de la
raíz**, que no lo declara — y `/api` no tiene `package.json` propio, así
que hereda el de la raíz. Vercel compiló `contacto.ts` a un `.js` con
`export`/`import` reales (porque el `package.json` de `packages/contact`
sí dice `type:module`) pero compiló `api/contact.ts` a CommonJS (porque
el `package.json` que encuentra para `/api` — el de la raíz — no lo
dice), y el resultado fue un `require()` de CommonJS intentando cargar
un módulo ESM — algo que Node rechaza en tiempo de ejecución sin
importar qué diga TypeScript en tiempo de compilación. Fix: `api/
package.json` nuevo, con el único contenido `{"type":"module"}` — igual
que cada workspace declara el suyo, `/api` ahora declara el propio en
vez de heredar el default implícito de la raíz. Con los dos lados en
ESM real, el `import` de `api/contact.ts` compila a `import` nativo, no
a `require()`, y el mismatch desaparece. **Lección para la próxima vez
que este tipo de bug aparezca:** el log de *build* puede estar
completamente limpio (0 errores de TypeScript) y la función igual
fallar en cada invocación — hay que revisar el log de *runtime* del
propio request fallido, no asumir que "build verde" implica "función
funcional".

**Tercera vuelta sobre el mismo punto — el fix del segundo bug reabrió
el primero, con un mensaje distinto (`TS2835` en vez de `TS5097`).**
Al agregar `api/package.json` con `type:module`, Vercel detectó que
`/api/**` ahora es ESM y cambió su resolución de módulos a
`node16`/`nodenext` — que **exige** extensión en los imports relativos,
lo opuesto a la primera vuelta (que la **prohibía**, sin
`allowImportingTsExtensions`). La extensión correcta bajo
`node16`/`nodenext` no es `.ts` (el archivo fuente) sino **`.js`** (el
nombre del archivo ya compilado — convención estándar de TypeScript
para esa resolución, aunque el archivo en disco siga siendo `.ts`).
`api/contact.ts` importa `../packages/contact/src/contacto.js` — la
única forma de import de todo el repo que funciona en los tres momentos
de esta historia: sin extensión servía a medias, `.ts` rompía con
`allowImportingTsExtensions` deshabilitado, y ahora `.js` es lo único
compatible con la resolución `node16`/`nodenext` que activa `type:module`.
Confirmado con `tsc --noEmit -p tsconfig.api.json` (que ya declara
`moduleResolution:"bundler"`, compatible con la sustitución `.js`→`.ts`
igual que `node16`/`nodenext`) y con una carga real vía `tsx` del
módulo completo.

**"Vista" deja de ser una etiqueta separada; Recalcular deja de ser un
botón aparte — pasa a ser la propia palabra "RECALCULAR" dentro de la
frase de ayuda, ahora un `<button>` real.** Tres cambios pedidos juntos
sobre la fila de arriba del plano (`.plan-toprow`): (1) se borra
`<span class="rl">Vista</span>` — el grupo de 4 botones de vista ya se
entiende sin rótulo, al lado de las pestañas Análisis original/
Modificado; el `data-i18n-aria="resultado.plano.vista"` que llevaba ese
mismo texto para el `role="group"` de los botones se queda (accesible,
sin rótulo visual). (2) El botón `#btn-recalcular` que vivía suelto al
final de la fila desaparece de ahí; la palabra "RECALCULAR" que ya
existía dentro de `resultado.plano.hintArrastreHtml` (antes un `<b>`
decorativo) pasa a ser el `<button id="btn-recalcular">` real — la
acción vive en la frase que la explica ("mové los parlantes para probar
otra disposición, RECALCULAR y comparar con Análisis original") en vez
de en un control aparte; sin chrome de botón (fondo/borde), sólo
subrayado en hover/foco como única señal de interactividad. La clave
`resultado.plano.recalcular` (el texto del botón viejo) se borra del
diccionario por quedar huérfana. (3) Como consecuencia de (2), el
listener de click **no puede** engancharse directo al nodo del botón en
`wireEventos()`: `aplicarCromoEstatico()` reescribe el `innerHTML` de
`#plan-hint` entero en cada cambio de idioma (ES/EN), destruyendo y
recreando ese `<button>` — un listener puesto ahí se perdería en el
primer cambio de idioma. Se resuelve con el mismo patrón que ya usa
`arrastre.ts` sobre `#plan` por la misma razón: el listener se delega
sobre `#plan-hint` (el `<p>` en sí nunca se recrea, sólo su contenido) y
comprueba `event.target.closest('#btn-recalcular')`. Verificado con
Chrome headless (PointerEvents sintéticos + click real): el botón
funciona en español, se cambia a inglés (confirmando que el HTML de
`#plan-hint` se reescribió), y un segundo click en el `<button>`
recién creado sigue disparando `recalcular()` — el listener delegado
sobrevivió. `.plan-controles` (el div que envolvía sólo los 4 botones de
vista tras sacar Recalcular) se aplanó: ya no hace falta el wrapper, el
`.segs` de vistas cuelga directo de `.plan-toprow`.

**Teléfono/tablet: pestañas y botones de vista, cada uno en su propia
línea.** Bug reportado: `.plan-toprow` (pestañas Análisis original/
Modificado + los 4 botones de vista) no entraba en una sola línea en
pantallas angostas y el navegador partía la fila de forma
impredecible — a veces mezclando pestañas y botones de vista en la
misma línea recortada a la mitad. En vez de dejarlo al ancho justo, se
fuerza un quiebre conocido bajo 820px (mismo umbral "tablet" que ya usa
`.materiales-grid` en Configurar): `.plan-toprow` pasa a
`flex-direction:column` — como cada hijo directo de un contenedor
columna ocupa su propia línea por definición, las pestañas quedan
siempre arriba y el grupo de 4 vistas siempre debajo, sin ambigüedad de
ancho. Ese grupo de vistas además gana `flex-wrap:nowrap` en este
breakpoint — sin esto hereda el `flex-wrap:wrap` de `.segs` (la regla
general del sitio) y podía partirse a sí mismo en una grilla 2×2 en vez
de quedar en una sola fila — compensado con menos padding por botón
para que las 4 etiquetas quepan igual. Verificado con Chrome headless a
390px (`Emulation.setDeviceMetricsOverride`): las dos filas quedan a
44px de distancia vertical entre sí, sin superposición ni mezcla.

**Marca de versión en la portada.** `.version-splash` (`apps/web/
index.html`, esquina inferior izquierda, mismo patrón fijo que el link
"Contacto" de la esquina opuesta) muestra `V{n}.{mes}.{año}` —
`splash.version` en `es.ts`/`en.ts`, mismo valor en los dos idiomas
porque es una marca técnica, no texto traducible. Regla pedida por el
usuario, no derivable del código — documentada en memoria del asistente
(no en este archivo, que es sobre el motor, no sobre el flujo de
trabajo del asistente): cada deploy a `master` sube `n` en 1 si es
dentro del mismo mes, o resetea `n=1` y actualiza mes/año si cambió el
mes. Primer valor: `V1.08.26` (agosto 2026).

**Nota que declara por qué el puntaje puede no cambiar tras Recalcular.**
Confirmado leyendo `construirSnapshot()` (`main.ts`) que el arrastre de
parlantes **ya** afectaba el puntaje del match: recalcula `evaluarPotencia`
con la nueva `distanciaEscuchaM`, y esa severidad entra en
`calcularPuntaje` igual que las demás — no era un bug, sólo no estaba
declarado en pantalla. Verificado con Chrome headless (drag sintético):
la distancia y el margen de potencia sí cambian con el arrastre
(2,6→2,9 m, +2,8→+1,8 dB en el vector de prueba), pero el número final
del puntaje puede quedar igual porque `evaluarPotencia` trabaja con
bandas categóricas (`con-margen` ≥3 dB, `justo` 0-3 dB, `insuficiente`
<0 dB — `potencia.ts`), no con el dB crudo — dos márgenes distintos en
la misma banda dan la misma severidad, y por lo tanto el mismo puntaje.
Carga/modos/reverberación/puente/recorrido no dependen de la posición
por diseño del motor (geometría de sala, materiales o electrónica, no
distancia), así que correctamente no cambian entre "Análisis original"
y "Modificado". Se agregó `#pt-nota-recalculo` (texto estático,
`motor.puntaje.notaRecalculo`) debajo de `pt-criterio` en el bloque
"Puntaje del match" del sidebar, visible **sólo** en la pestaña
"Modificado" — `activarPestana()` alterna su clase `.hidden` según la
pestaña activa, y `renderizarResultado()` (un "Analizar" nuevo) la
oculta explícitamente para no arrastrar el estado visible de un
análisis anterior. Verificado con Chrome headless: oculta en "Análisis
original", visible tras Recalcular, vuelve a ocultarse al volver a
"Análisis original" y al analizar un sistema nuevo desde cero.

**"Documento" — "guardar y comparar como PDF", guardada para retomar
más adelante, desconectada de nuevo.** Pantalla (`#s-documento`, mismo
patrón `Pantalla`/`ir()` que splash/config/resultado/guía) que muestra
el análisis actual reformateado como un informe — logo en negro sobre
fondo blanco (el único lugar del sitio con fondo claro), título, fecha,
equipo, sala, plano, las 8 tarjetas de evaluación con sus gráficos,
puntaje y resumen (ver el resto de esta sección para el detalle
completo de qué pinta). Pasó por dos vueltas: primero sin ningún botón
conectado (referencia interna, sólo alcanzable desde la consola);
después `#btn-guardar` navegó ahí directo un tiempo, a pedido del
usuario; **ahora vuelve al estado original** — `#btn-guardar` abre de
nuevo el popup de login de siempre (`abrirGuardarPopup()`,
`resultado.guardarPopupTitulo/Cuerpo` — el cuerpo ya nombra la función
futura: "guardar tus análisis, compararlos entre sí y descargarlos como
archivos PDF"), y `#s-documento` queda sin botón visible en ninguna
pantalla otra vez, para cuando haya una ronda dedicada a diseñar el
login/backend real. Sigue alcanzable desde la consola —
`window.ir('documento')`, expuesto en `main()` sólo para esto, sin
agregar ninguna afordancia de UI— así que sigue siendo revisable/
iterable sin tener que reconectar nada primero.

Arriba de la hoja blanca, un `.doc-toolbar` (fondo oscuro, igual que el
resto del cromo del sitio) con pestañas "Análisis 1"/"Análisis 2" y
botones "Comparar"/"Descargar PDF": únicamente "Análisis 1" (activa por
defecto, sin listener — nunca cambia) tiene contenido real; los otros
tres reusan `abrirGuardarPopup()` **verbatim** — mismo diálogo, mismo
título "Debe iniciar sesión", mismo cuerpo que ya usa `#btn-guardar` —
en vez de inventar un mensaje o un mockup separado. El cuerpo de ese
popup se amplió esta misma ronda para nombrar la función futura:
"Esta función permitirá guardar tus análisis, compararlos entre sí y
descargarlos como archivos PDF." (`resultado.guardarPopupCuerpo`).

`modeloDocumento()` (nuevo, `resultado.ts`) es una función pura más —
mismo principio que `modeloResumenFinal`: reformatea datos que
`construirSnapshot()` ya calculó, no ejecuta el motor de nuevo. Reusa
`especParlante`/`especAmplificador`/`especFuente` (`datos/etiquetas.ts`,
ya usadas por "La cadena") para los specs de equipo, y las mismas
plantillas `itemFortaleza`/`itemConDetalle`/`itemSinDatos` de
`motor.resumen` para el veredicto por componente — cero redacción
nueva para esa parte. Se pinta junto con el resto del resultado dentro
de `pintarSnapshot()` (no en un flujo aparte), así que `ir('documento')`
siempre muestra el análisis vigente sin importar si el usuario llegó
ahí después de "Analizar", cambiar de pestaña o cambiar de idioma —
mismo mecanismo que ya mantenía sincronizados potencia/puntaje/resumen
entre "Análisis original" y "Modificado".

Tokens de color propios (`--paper-bg/ink/dim/line/ok/warn/alert` dentro
de `.doc-paper`) en vez de reusar `--text`/`--dim`/`--ok` etc.: esos
están calibrados para fondo oscuro y no rinden igual sobre blanco. El
acento dorado de "THE" en el logo de la hoja sí se mantiene (mismo
`--dorado` que el resto del sitio) — es lo único que visualmente ancla
la marca entre el cromo oscuro y la hoja clara.

7 tests nuevos en `resultado.test.ts` (equipo real solo con streamer/dac
elegidos, specs reusados vía los helpers de `etiquetas.ts` sin
recalcular, separador decimal por idioma, puntaje sin reclasificar,
plantillas de componente reusadas, `fechaTexto` pasado tal cual — no es
un dato del motor, lo arma `main.ts` con `Date` — e inglés sin mezclar
idiomas). Verificado con Chrome headless: el click en "Guardar" en
`#s-results` navega a `#s-documento` con contenido real; los tres
controles bloqueados ("Análisis 2"/"Comparar"/"Descargar PDF") abren el
mismo popup de login; cambiar de idioma dentro de la pantalla
relocaliza todo (incluida la fecha); el layout responsive a 390px no
rompe.

**Selector de idioma en la misma esquina en las 5 pantallas, no sólo en
la portada.** Antes, `.segs.idioma` (ES/EN) vivía en dos lugares
distintos según la pantalla: fijo arriba a la derecha de todo el
viewport en la portada (`.idioma-splash`, sin `.head` que le compita
ese espacio), pero **adentro** de la fila de botones de `.head
.hright` (junto con Info/Guardar/Contacto/Volver) en
configurar/resultado/guía/documento — ahí quedaba a mitad de fila, no
en la esquina, y el punto donde cae cambia según cuántos otros botones
haya en esa pantalla. Confirmado visualmente (Chrome headless) que se
notaba: en desktop, "GUARDAR" en la portada de resultados tenía el
selector pegado al principio de la fila, lejos del borde real. Se
sacó de `.hright` en las 4 pantallas y se envolvió con el mismo
`.idioma-splash` que ya usaba la portada — ahora el selector cae
siempre en el mismo punto fijo de la pantalla (`top:20px; right:22px`)
sin importar qué pantalla sea. `.idioma-splash` subió su `z-index` de
1 a 21 (por encima de `.head`, que es 20): `.head` es opaco
(`background:var(--bg)`) y sin ese cambio el selector hubiera quedado
tapado detrás de la barra fija en mobile, donde `.head` sí ocupa todo
el ancho del viewport (a diferencia de desktop, donde `.head` está
acotado a `max-width:1120px` y el selector cae en el espacio vacío
más allá de su borde derecho, sin superposición posible). Verificado a
390px que el selector no tapa ni el wordmark ni los demás botones del
header, con capturas reales, no sólo con los rectángulos calculados.

**Grises del sitio, un tono más claro — sin llegar al blanco de
`--text`.** `--dim`/`--label`/`--faint` (`estilos.css` `:root`) subieron
todos +0x17 por canal (`#8C8C93`→`#A3A3AA`, `#6E6E75`→`#85858C`,
`#5A5A61`→`#717178`) — mismo incremento parejo en los tres, así se
conserva el orden de contraste que ya existía entre ellos (`dim` sigue
siendo el más claro de los tres, `faint` el más oscuro) en vez de
aplanarlos a un solo tono. `--text` (`#ECECEE`, blanco casi puro) no se
tocó — sigue siendo la única "más clara que estas tres", como pidió el
usuario explícitamente ("sin llegar a blanco"). Cambio de una sola
línea de variables: como el resto del sitio ya lee todo el gris
secundario a través de estas tres custom properties (nunca un hex
suelto), no hizo falta tocar ninguna regla más.

**"Documento" deja de ser un resumen — ahora es el informe completo, con
todas las tarjetas de evaluación y sus gráficos.** Pedido explícito:
"que incluya todas las tarjetas de análisis y sus gráficos... que
contenga toda la info". La lista corta "Evaluación por componente"
(`componentesHtml`, un `<li>` por componente) se retira — quedaba
redundante frente a la versión completa — y en su lugar `#doc-secciones`
recorre las mismas 8 tarjetas posibles que ya pinta la pantalla de
resultado (potencia, carga, puente+recorrido de streamer, puente+
recorrido de DAC, modos, reverberación), cada una con capa+veredicto,
título, frase simple, texto técnico, cálculo, aviso y fuente — sin el
toggle "Ver detalle técnico": un informe no tiene nada que desplegar,
todo se muestra de una. `DatosSeccionesDocumento` (nuevo, `resultado.ts`)
agrupa los modelos de tarjeta que `construirSnapshot()` ya calculaba en
`main.ts` — cero recálculo del motor, mismo principio que el resto del
archivo. `#doc-plano` agrega el plano isométrico (SVG real,
`construirPlanoSvg` en vista isométrica fija) + la ubicación de
referencia de los parlantes; `#doc-resumen` reusa `fortalezasHtml`/
`debilidadesHtml`/`recomendacionesHtml`/etc. de `modeloResumenFinal` sin
redactar de nuevo.

Dos gráficos necesitaban una decisión de diseño: el medidor de potencia
(`medidor.ts`, DOM) y las curvas modales (`curvamodal.ts`, SVG puro)
dibujan con colores fijos pensados para fondo oscuro — `plano.ts` y
`curvamodal.ts` usan hex literales (`#ECECEE`, `#8C8C93`...), no custom
properties, así que se verían casi invisibles sobre la hoja blanca. En
vez de mantener una segunda paleta clara para cada gráfico (o tocar esos
archivos y arriesgar su cobertura de tests, bastante extensa), se
embeben tal cual dentro de un panel de fondo oscuro (`.doc-dark-panel`,
mismo `var(--panel)` que el resto del sitio) — se ven exactamente igual
que en la pantalla de resultado, cero cambios en `plano.ts`/
`curvamodal.ts`. `medidor.ts` sí necesitó un cambio mínimo:
`construirEscala`/`actualizarMedidor` ganaron un `prefijo` opcional
(default `'pw'`, compatible con la única llamada que ya existía) para
poder tener un segundo medidor en la página (`'doc-pw'`) sin que sus ids
choquen con el de la tarjeta de potencia — `pintarDocumento` (`pintar.ts`)
llama a los dos con el prefijo nuevo después de inyectar `seccionesHtml`
(que ya trae el `<div id="doc-pw-scale">` vacío).

9 tests nuevos/reescritos en `resultado.test.ts` (`datosDocumentoFixture`,
un helper que arma un `DatosSeccionesDocumento` real corriendo el motor
de verdad — mismo camino que `construirSnapshot()` — en vez de objetos
inventados a mano) cubren: streamer/dac sólo aparecen si están elegidos
y tienen dato, modos/reverberación siempre presentes (nunca "sin-datos",
techo de severidad de sala), el plano trae un `<svg>` real, el resumen
reusa el HTML ya armado sin redactar de nuevo. Verificado con Chrome
headless (KEF LS50 Meta + Rega Brio, sala con agrupamiento de modos por
defecto): el informe completo pinta plano+medidor+curvas con los colores
correctos dentro de sus paneles oscuros, sin errores de consola, sin
overflow horizontal a 390px.

**Dos ajustes sobre el informe recién armado: diseño compacto (mismo
contenido, más denso) y el plano fijo en vista Superior.** Pedido
explícito tras ver el primer resultado: "compactos, todos en una
página, gráficos pequeños". Se bajó el `padding`/`margin` de casi todo
`.doc-*` en `estilos.css` (paper, secciones, encabezados, calc, flag) y
se achicaron los gráficos (`.doc-dark-panel svg{max-width:340px}`,
antes 100%; el medidor de potencia usa `transform:scale(.78)` sobre
`.doc-dark-panel .meter` en vez de tocar el tamaño real del widget
compartido con la tarjeta de potencia) — **nada de contenido se sacó**,
las 8 tarjetas + plano + puntaje + resumen siguen todas ahí, sólo ocupan
menos alto (medido: ~4770px → ~3170px con el mismo análisis). El plano
del informe pasa de vista Isométrica a **Superior fija**, sin importar
qué vista esté activa en la pantalla de resultado — la más compacta y
legible para un reporte. Esto dejó desactualizado el título reusado
(`resultado.plano.titulo` decía "Vista isométrica..."); se agregó
`documento.planoTitulo` ("Plano, escucha y reflexiones (vista
superior)") específico para el informe en vez de heredar un título que
ya no describe lo que se ve.

**Bug real, no cosmético: etiquetas de distancia de reflexión
superpuestas e ilegibles al arrastrar un parlante.** Reportado con una
captura: dos números (`REFLEXION_TEXTO`, `plano.ts`) se dibujaban
literalmente uno encima del otro. Causa: hasta 4 reflexiones (lateral,
trasera, techo, piso) pueden caer del mismo lado, y en las vistas
ortográficas dos de ellas pueden proyectar muy cerca en pantalla —
comportamiento esperado de una proyección ortográfica (ver comentario
de cabecera de `plano.ts`), pero antes las cuatro usaban el mismo offset
fijo (`dy=-6`) para su texto, así que si los puntos coincidían, el texto
también. Fix: un contador por lado (`contadorLado`) escalona el `dy` en
10px por cada reflexión adicional de ese lado — no cambia nada cuando no
hay colisión (el texto sólo queda unos px más abajo de su propio punto,
igual de asociado a su marcador), pero garantiza que dos reflexiones del
mismo lado nunca comparten posición de texto. Test de regresión en
`plano.test.ts`: arrastra el parlante izquierdo a una esquina y verifica,
en las 4 vistas, que ningún par de etiquetas del mismo lado repite
exactamente `(x,y)`.

**El veredicto y los tres estados reemplazan al puntaje 1-10 como
encabezado del resultado — el mayor rediseño de la pantalla de resultado
hasta ahora.** Disparado por una revisión externa de UX (6 puntos,
priorizados por impacto): el puntaje encabezando el análisis era la
contradicción más visible del sitio (un número editorial abriendo un
análisis que se vende como físico), y el usuario, tras ver un primer
plan de sólo reposicionarlo, lo llevó más lejos con un mockup propio y
una matriz de decisión completa. **`puntaje.ts` no se tocó** — sigue
1-10, con pesos declarados, calculándose igual que siempre; queda vivo
para un futuro comparador entre análisis (A vs. B, donde un número
relativo sí tiene función) y sigue alimentando el informe ("Documento").
Lo que cambió es qué encabeza la pantalla de resultado en vivo.

`packages/engine/src/veredicto.ts` (nuevo, 11 tests) agrupa las
severidades ya calculadas por las reglas físicas en tres estados
—**Potencia**, **Acople eléctrico** (carga + puente de impedancias +
recorrido de volumen de streamer y/o DAC) y **Sala** (modos +
reverberación)— tomando el **peor** componente de cada grupo, no un
promedio: promediar disuelve un problema grave entre varias cosas que
están bien (un amplificador que no alcanza en los picos podría
promediar "aceptable" junto a una carga fácil). Reusa `peorSeveridad()`
de `puntaje.ts`, que ya estaba exportada "por si sirve para otra
combinación futura" — lo es. Mismo principio de siempre: un componente
"sin-datos" no cuenta como reparo; si un grupo entero queda sin ningún
componente con dato, el grupo es "sin-datos" (nunca un color), y el
veredicto general —el peor de los tres grupos— nunca puede ser
"sin-datos" porque potencia y sala siempre tienen valor. El veredicto
general sigue siendo **capa criterio-editorial** (cómo se agrupa y qué
gana es una decisión de este sitio), apoyado en severidades que sí son
física — mismo principio dual que `puntaje.ts`, ahora con dos piezas en
esa capa en vez de una.

`modeloVeredicto` (`resultado.ts`) redacta el titular desde una matriz
fija que dio el usuario: algún grupo "alert" → "Configuración no
recomendada" (rojo); ninguno "alert" pero algún "warn" → "Configuración
soportada, con límites" (dorado/ámbar); los tres "ok" → "Configuración
totalmente compatible" (verde). El subtexto nombra qué grupo(s)
motivaron el veredicto, unidos con `listaY()` (nuevo en
`formato/numeros.ts`, `Intl.ListFormat` por locale — "Potencia, Acople
eléctrico y Sala", no el `join(' y ')` a mano que se probó primero y
daba "Potencia y Acople eléctrico y Sala", gramaticalmente mal con 3+
items). El texto de cada estado (`detalleTexto`) reusa el
`verdictoTexto` ya calculado del componente más grave de ese grupo
(`peorEntre()`, ordena por `ClaseVerdicto` igual que `peorSeveridad()`
del motor) — nunca inventa una evaluación nueva, mismo principio de
"reusar, no redactar de nuevo" que ya regía en "En resumen".

**Un solo color en toda la página, con un problema real: `--dorado`
(títulos, en todas partes) y `--warn` (severidad) son tonos casi
idénticos.** El usuario lo señaló explícitamente y pidió no resolverlo
retitulando el sitio entero (fuera de alcance) — la tarjeta del
veredicto se distingue con su propio tratamiento en vez de competir por
el mismo tono: `border-left:4px solid` + fondo muy sutil, coloreados por
clase (`veredicto-ok/warn/alert`, mapeados a los tokens `--ok`/`--warn`/
`--alert` que ya existían — el usuario los llamó `--success`/`--warn`/
`--danger` en su mensaje, pero ya había variables equivalentes, así que
no se agregó un segundo set de nombres). El titular (`.vd-titulo`)
también lleva ese color, satisfaciendo el pedido explícito de "tono
visual" en la matriz. Los tres bloques de estado (`.estado-item`) llevan
badges coloreados igual (`.est-ok/warn/alert`), con **`.est-dim` para
"sin datos suficientes" en gris apagado, nunca ámbar** — pedido
explícito del usuario ("son cosas opuestas y compiten por el mismo
espacio visual").

**Contexto no es resultado — La cadena y los datos de sala bajan al
pie.** El sidebar de dos columnas (`.grid`/`.rail`/`.main`) desaparece
por completo: la pantalla de resultado pasa a una sola columna
apilada — veredicto, "Qué conviene hacer" (`modeloRecomendacionesTop`,
nuevo en `resultado.ts`: hasta 3 recomendaciones con `avisoHtml`,
"alert" antes que "warn", reusando los mismos textos que ya redactaba
cada regla), la evidencia técnica completa (potencia/carga/puente×2/
recorrido×2, sin tocar su contenido interno) detrás de un `<details>`
colapsado por defecto (`Ver evidencia técnica completa`), la tarjeta de
Geometría (plano+modos+reverberación, sin cambios), y al final
`.ficha-final` — "La cadena y los datos de sala" con "La cadena" y
"Sala" (mismos ids `#chain`/`#r-*` de siempre, sólo reubicados). La
tarjeta "En resumen" se retira de la pantalla de resultado (superada
por veredicto + recomendaciones) pero **`modeloResumenFinal` sigue
calculándose** en `main.ts` porque `modeloDocumento` (el informe) sigue
consumiéndola — sólo se dejó de pintar en `#s-results`
(`pintarResumenFinal` se borró de `pintar.ts` por quedar sin uso; el
informe arma su propio HTML de resumen, no pasa por esa función).

**Nomenclatura llana y RT60 sin falsa precisión, integrados en la misma
pasada** (dos puntos ya aprobados en la ronda de revisión externa, que
el usuario pidió absorber acá en vez de posponerlos): los títulos de
puente/recorrido pasan a preguntas en lenguaje simple ("¿Conectan bien
el streamer y el amplificador?", "¿Vas a usar bien el dial de volumen
con el streamer?"), con el término técnico ("Puente de impedancias",
"Recorrido del volumen") como subtítulo chico debajo
(`.subtitulo-tecnico`, nuevo). El RT60 baja de 2 a 1 decimal con
prefijo "≈" y suma una frase declarando que Sabine pierde precisión en
salas chicas con mucha absorción — mismo criterio de "declarar el
límite del modelo" que ya regía el resto del motor.

**Guía y botón "i" del veredicto.** Nueva entrada `info.veredicto` en
"Guía del análisis" (entre `info.plano` e `info.puntaje` — explica el
mecanismo de agrupar-por-peor antes de la explicación del 1-10 que
sigue existiendo para el comparador) y su propio `.infobtn` en la
tarjeta del veredicto, mismo patrón que las demás tarjetas.
`idioma.test.ts` (`CLAVES_HTML`) suma `info.veredicto.cuerpoHtml` en su
posición real. La tarjeta del veredicto lleva el mismo rótulo
`motor.puntaje.rotulo` ("Criterio editorial, no física") que ya existía
para el puntaje — declarar la capa, no un texto nuevo.

Verificado extremo a extremo con Chrome headless (CDP crudo, KEF LS50
Meta + Rega Brio + WiiM Pro Plus + Topping E30 II, la sala por
defecto): veredicto "Configuración soportada, con límites" en dorado,
los tres estados con sus badges, evidencia colapsada y expandida,
geometría y ficha al pie, capturas en desktop (1400px) y mobile
(390px), sin errores ni excepciones de consola. 266 tests totales entre
los 4 workspaces (antes 197 — sube por `veredicto.test.ts` y los tests
nuevos de `modeloVeredicto`/`modeloRecomendacionesTop` en
`resultado.test.ts`, más el crecimiento de catálogo de rondas
anteriores que ya estaba contado aparte).

**Reverberación multibanda (Sabine/Eyring por tercio de octava) y cruce
geometría↔modo (nulo de escucha) — pedido con una especificación externa
muy detallada, con un punto que chocaba de frente con doctrina ya
declarada.** La especificación pedía, entre otras cosas, que el cruce
geometría↔modo pudiera marcar severidad `'CRÍTICO'` (alert) — eso viola
directamente "ninguna regla de sala emite severidad `error`" (sección
"Severidad y bloque de sala" de este documento, reforzada un rato antes
en la misma sesión al escribir `veredicto.ts`, cuyo tipo `sala: 'ok' |
'warn'` ni siquiera tiene un tercer valor). Se avisó explícitamente antes
de tocar código y se implementó el resto tal cual, con esa severidad
recortada a `warn` — la física del nulo es real y se calcula igual, sólo
cambia el techo de alarma, igual que ya regía para modos/reverberación.

`packages/engine/src/reverberacion.ts` se reescribió por completo: los
coeficientes de absorción pasan de un solo valor por material a un
triple `[125 Hz, 500 Hz, 2000 Hz]` (`ABSORCION_MURO_BANDAS`/
`ABSORCION_PISO_BANDAS`/`ABSORCION_TECHO_BANDAS` — los de piso
`maderaLaminado`/`porcelanato` y los 4 de techo, que la especificación no
traía, se completaron con el mismo criterio de "literatura típica" que
ya regía la tabla original, documentado inline; techo reusa exactamente
los 4 triples de muro, porque en el modelo de Sabine la orientación de
una superficie no cambia su coeficiente). Cada banda calcula su propia
ᾱ (absorción promedio) y elige fórmula: Sabine (RT60=0,161·V/A) si
ᾱ≤0,20, Eyring (RT60=0,161·V/(−S·ln(1−ᾱ))) si ᾱ>0,20 — 0,20 es el
umbral que recomienda la literatura de acústica arquitectónica para
cuándo Sabine empieza a sobreestimar el RT60 en salas muy absorbentes
(no un criterio inventado por el sitio, a diferencia del 5%/150 Hz de
`modos.ts`, que si lo es y sigue declarado como tal). El RT60 final que
se muestra es el promedio de las bandas 500 Hz y 2000 Hz — simplificación
de este sitio, no el "T_mid" de 500+1000 Hz de ISO 3382 (exigiría una
cuarta banda que este modelo no tiene). Encima, la frecuencia de
Schroeder (fs=2000·√(RT60/V)) se agrega al resultado y a la tarjeta, con
la nota de que por debajo de fs el comportamiento lo dominan resonancias
individuales (remite a "Modos de sala"), no reverberación difusa. La
tarjeta de detalle técnico ahora muestra el desglose superficie por
superficie a 500 Hz (banda de referencia, igual que antes) seguido del
panorama de las 3 bandas con su método (Sabine/Eyring) cada una, el RT60
final y fs. `evaluarReverberacion()` sigue devolviendo severidad
`'ok'|'warn'` sobre el mismo rango 0,3–0,6 s de siempre — sólo cambió
cómo se llega al número, no el umbral. 8 tests de `reverberacion.test.ts`
recalculados con vectores exactos (computados con Node, no a mano —
Eyring involucra logaritmos, y a mano es demasiado fácil de errar) más 2
tests nuevos de propiedad (Eyring da un RT60 menor que el Sabine ingenuo
para la misma ᾱ; ninguna banda da un RT60 no-finito o negativo). Un test
preexistente de `resultado.test.ts` (`MATERIALES_INTERMEDIOS`, un mix
"tratado a medias" que antes daba "ok") tuvo que cambiar de materiales:
bajo el modelo de 3 bandas, panel acústico en el techo entero (18 m²)
resultó demasiado absorbente en agudos para seguir cayendo en rango —
se movió ese panel a un solo muro, mismo espíritu del test, dentro del
rango de nuevo.

`packages/engine/src/modos.ts` gana `evaluarNuloEscucha(sala, escuchaYM)`
— el cruce geometría↔modo. Físicamente sólido: el modo axial n=1 de un
eje tiene forma de onda estacionaria cos(π·y/L), con antinodos (presión
máxima) en los dos muros y un único nodo (nulo de presión) exactamente
en el centro, y=L/2 — ahí ese modo en particular se cancela casi por
completo, sea cual sea su amplitud real (que este modelo no mide). Es
geometría de sala rígida, la misma salvedad que sala.ts/modos.ts.
`VENTANA_NULO_MODAL=0,10` (±10% de L alrededor del centro) es criterio
de este sitio, dado explícitamente para esta regla — declarado como tal,
no vestido de convención publicada. A diferencia de `evaluarModos()`
(que sólo mira dimensiones y se calcula una vez por "Analizar"), esto
depende de `disposicion.puntoDulce.y` — cambia con cada arrastre +
Recalcular, así que se recalcula por snapshot. 6 tests nuevos en
`modos.test.ts`, incluido uno que confirma que la disposición de
referencia de la sala por defecto (y≈3,126 m, centro=2,5 m,
ventana=±0,5 m) NO cae en el nulo — el feature no dispara falsos
positivos en el estado de fábrica del sitio.

Cablear el nulo de escucha en la tarjeta "Modos de sala" existente (en
vez de crear una tarjeta nueva) obligó a mover cuándo se calcula esa
tarjeta: `mModos` salió de `UltimoAnalisis` (calculado una sola vez por
"Analizar", como venía) y pasó a `SnapshotAnalisis` (recalculado en
`construirSnapshot`/pintado en `pintarSnapshot`, junto a potencia) —
`resModos` (agrupamiento, sólo dimensiones) se sigue calculando una sola
vez. `modeloModos(r, resNulo, idioma)` ahora combina las dos señales:
severidad = peor de las dos (agrupamiento `warn` y/o nulo `warn`
alcanzan igual), con 4 combinaciones de verdicto/texto/simpleHtml
("Bien distribuidos" / "Modos agrupados" / "Nulo en el punto de
escucha" / "Modos agrupados y nulo en la escucha") y el aviso + la
sugerencia acumulan las partes que aplican en vez de pisarse. La misma
severidad combinada alimenta tanto el puntaje 1-10 (componente "modos")
como el bucket "Sala" del veredicto — una sola fuente de verdad, no dos
cálculos por separado. `resultado.test.ts` suma 4 tests nuevos (nulo
solo, agrupamiento+nulo a la vez, e inglés) sobre los ya existentes.

Verificado extremo a extremo con Chrome headless (CDP crudo): forzando
Largo=5,5 m (con la sala por defecto, la disposición de referencia sin
arrastrar cae dentro de la ventana del nulo con esa profundidad) más
KEF LS50 Meta + Rega Brio, la tarjeta "Modos de sala" muestra el
verdicto combinado "Modos agrupados y nulo en la escucha" con las dos
explicaciones concatenadas, y "Tiempo de reverberación" muestra el
desglose de 3 bandas (125 Hz Eyring, 500/2000 Hz Sabine en ese vector),
el RT60 final y fs≈358 Hz — sin errores ni excepciones de consola.
**278 tests totales** entre los 4 workspaces (antes 266).

**Acople eléctrico: EPDR en la carga, nueva regla de amortiguamiento —
pedido con una especificación externa que traía una fórmula de EPDR
matemáticamente inconsistente en su propia condición de frontera.** La
fórmula original pedida, `EPDR = R_θ / (1 + cos θ)`, da `EPDR = R/2` en
θ=0° (carga puramente resistiva) — pero por definición, un resistor puro
no tiene estrés reactivo que contar: su EPDR tiene que ser exactamente
su propia resistencia. La fórmula además invertía la dirección física
(EPDR *subía* hacia R a medida que crecía el ángulo, cuando el punto
entero de EPDR —Otala— es mostrar que las cargas reactivas son *más*
exigentes que su módulo, no menos). Se avisó explícitamente antes de
tocar código; la especificación revisada trajo la fórmula corregida,
`EPDR = |Z| / (1 + |sen θ|)`, que sí cumple `EPDR(0°) = |Z|` exacto y
decrece monótonamente con `|θ|` — la que se implementó.

`packages/engine/src/carga.ts` combina dos preguntas distintas,
peor-de-las-dos (mismo patrón que modos+nulo de la ronda anterior): la
reserva de corriente bruta que ya existía, y EPDR cuando hay ángulo de
fase (real o supuesto). El catálogo casi nunca publica el ángulo de
fase en graves — cuando falta, se asume θ=-45° para cualquier parlante
de impedancia **nominal** ≤4 Ω (no impedancia mínima: son campos
distintos), declarado explícitamente como supuesto conservador del
sitio, nunca mostrado como si fuera un dato citado. Nuevos códigos
`epdr-critico`/`epdr-ajustado` (EPDR<2,0 Ω / <3,0 Ω) — **la primera vez
que `evaluarCarga()` puede devolver `alert`**, algo que nunca hacía
antes: no es una regla de sala (esas sí tienen techo `warn` por
doctrina, ver más abajo), es una regla eléctrica, con el mismo rango de
severidad que ya tenían carga/puente/recorrido en `tipos.ts`
(`Severidad = 'ok'|'warn'|'alert'|'sin-datos'`) — sencillamente nunca
había un camino que llegara a `alert` hasta ahora. 9 tests nuevos:
frontera θ=0°, ángulo real vs. supuesto, los dos umbrales, y que EPDR
"ok" no mejora un problema real de reserva de corriente ya detectado
(peor-de-las-dos, no promedio).

**`packages/engine/src/amortiguamiento.ts` (nuevo)** — pregunta
distinta a carga.ts: la impedancia de salida del amplificador (derivada
del factor de amortiguamiento, `Z_out = 8/DF`) forma un divisor de
tensión con la curva de impedancia del parlante, y ese divisor deja
pasar más o menos tensión en el pico de resonancia de graves que en el
mínimo — una coloración tonal real y calculable. La fórmula del divisor
(`ΔdB = 20·log₁₀(Zmax·(Zmin+Zout) / (Zmin·(Zmax+Zout)))`) se verificó
por álgebra: para Zmax>Zmin siempre da ΔdB>0, sin necesitar `abs()`.
Deliberadamente **no** penaliza un factor de amortiguamiento bajo por sí
solo (evita descartar sin motivo electrónica valvular, que puede sonar
perfectamente bien con el parlante correcto) — sólo cuenta la
interacción real con la curva de ESE parlante. Umbrales ΔdB≤0,3 dB
óptimo / ≤1,5 dB con reparos / >1,5 dB crítico. `impedanciaMaxOhm`
(pico de resonancia) usa un fallback de 25 Ω cuando el parlante no lo
publica, declarado como tal (`zMaxEsSupuesto`) — nunca mostrado como
dato citado. **Ninguno de los dos campos que esta regla necesita
(`factorAmortiguamiento` del ampli, `impedanciaMaxOhm` del parlante)
está poblado todavía en el catálogo** — ver "Falta" más abajo, ya
señalado en una ronda anterior como el motivo por el que esta regla no
existía aún. La regla en sí está completa y probada (13 tests): hasta
que una ronda de catálogo futura cargue datos reales, la tarjeta
"Amortiguamiento" se queda oculta (`sin-datos`) para todos los equipos
del sitio — mismo patrón que cualquier otro campo del catálogo con
cobertura parcial.

`packages/engine/src/veredicto.ts` suma `amortiguamiento` como sexto
componente del bucket "Acople eléctrico" (junto a carga, puente y
recorrido de streamer/dac) — mismo `peorSeveridad()` de siempre.
`resultado.ts` gana `modeloAmortiguamiento` (mismo patrón que
`modeloCarga`: `sinDatos`/`calcHtml` opcional) y `ModeloTarjetaCarga`
gana un `calcHtml` nuevo que muestra la fórmula de EPDR cuando se pudo
calcular, **independiente de si terminó siendo la parte más grave del
veredicto o no** — transparencia completa del cálculo, no sólo cuando
"gana". Tarjeta nueva en `index.html` (`card-amortiguamiento`, entre
Carga y Puente) con el mismo esqueleto `<details>` que el resto
(simple/técnico/calc/aviso/fuente) y su propia entrada en la Guía del
análisis (`info.amortiguamiento`) + botón "i". Verificado extremo a
extremo con Chrome headless: KEF R3 Meta (nominal 4 Ω, minZ 3,2 Ω,
sin ángulo publicado) + Cambridge Audio CXA81 da EPDR≈1,9 Ω →
"EPDR crítico" → Acople eléctrico "Conflicto" → veredicto general
"Configuración no recomendada" — la cadena completa de severidad
propagándose de un cálculo nuevo hasta el titular, sin errores de
consola. **311 tests totales** entre los 4 workspaces (antes 278).

**Plano isométrico: se ajusta por alto, no por ancho.** Primera vuelta
(revertida): un "breakout" que sacaba la tarjeta del ancho de `.wrap`
en pantallas grandes — corregido porque el pedido real era otro, y
además rompía la consistencia de que todas las tarjetas midan lo mismo.
`.plan-wrap svg` mantiene `width:100%` (llena la tarjeta, igual que
cualquier otra) pero suma `max-height:70vh`: en vistas altas (isométrica
sobre todo) que antes exigían scrollear dentro de la propia tarjeta para
verlas completas, el gráfico se achica proporcionalmente (ancho y alto
juntos, por la resolución estándar de CSS para elementos con relación de
aspecto — `viewBox` sin `width`/`height` en el `<svg>`) hasta entrar en
la pantalla. Verificado con Chrome headless: el ancho de la tarjeta de
Geometría vuelve a coincidir exactamente con el de cualquier otra
tarjeta (1076px = 1076px), y a un viewport de 900px de alto el diagrama
completo entra sin scroll adicional.

**Amortiguamiento: texto por 4 franjas de ΔdB, no por severidad —
pedido con una especificación que, dentro del contenido de texto, pedía
exactamente lo que la primera sección de este documento prohíbe por
nombre.** La especificación traía "calidez" en el texto de un tramo
("con reparos") — es el ejemplo literal que la lista de prohibiciones
usa para "juicios de carácter tonal" — además de atribuir la
coloración a "acople clásico con válvulas" (topología que este cálculo
no conoce) y recomendar géneros musicales por tramo (jazz/vocal sí,
electrónica/rock con reservas — una predicción de sinergia por gusto,
también prohibida). El tramo "crítico" atribuía la desviación a
"distorsión por excursión térmica descontrolada" — un mecanismo que
esta regla no calcula: ΔdB mide una desviación de nivel en dB, no
excursión ni temperatura. Se avisó explícitamente antes de escribir el
diccionario, y se implementó el resto (la estructura de 4 campos, la
granularidad de 4 franjas, la interpolación de cifras) con el
contenido reescrito para describir sólo lo que la fórmula realmente
mide — dónde y cuánto se desvía la respuesta, nunca cómo "suena".

`packages/engine/src/amortiguamiento.ts` suma dos constantes nuevas,
`TEXTO_TIER_MODERADO_MAX_DB` (1,2) y `TEXTO_TIER_SEVERO_MAX_DB` (2,5),
explícitamente documentadas como **umbrales de texto, no de
severidad** — `DELTA_DB_OPTIMO_MAX`/`DELTA_DB_WARN_MAX` (0,3/1,5) siguen
siendo los únicos que deciden `ok`/`warn`/`alert`. Esto es deliberado,
no un descuido: un ΔdB de 1,6 y uno de 4,0 pueden compartir severidad
"alert" (ambos >1,5) pero no son igual de graves, así que el tramo de
TEXTO "severo" (1,2–2,5 dB) puede aparecer con cualquiera de las dos
severidades según de qué lado de 1,5 caiga — verificado con un test que
construye ambos casos (ΔdB≈1,31→warn, ΔdB≈1,60→alert) y confirma que
los dos muestran el mismo tramo de texto "severo", distinto del tramo
"crítico" (>2,5 dB).

`resultado.ts` reemplaza el `texto`/`avisoConReparos`/`avisoCritico` de
una sola cadena por 4 campos por tramo (`titulo`, `explicacionFisica`,
`consecuenciaMedible` — renombrado de "perfilSonoro" pedido, sin
cambiar el propósito estructural, sólo evitando un nombre que invita a
describir cómo suena en vez de qué se mide —, `accionSugerida`), los 4
como funciones `(p) => string` con las cifras ya interpoladas (Z_out,
Z_min, Z_max, ΔdB con 2 decimales). El tramo "óptimo" no lleva
`avisoHtml` (mismo criterio que carga.ts/reverberacion.ts: el aviso se
reserva para cuando hay algo que conviene revisar). `index.html`
cambia `#am-text` de `<p>` a `<div>` para poder contener los 3
párrafos (`titulo` en negrita + `explicacionFisica` +
`consecuenciaMedible`) sin anidar bloques inválidos — la regla `.card
p` ya alcanza los `<p>` anidados por selector de descendiente, sin CSS
nuevo. 9 tests nuevos en `resultado.test.ts`, incluida una aserción
explícita de que ni el texto ni el aviso contienen vocabulario de
carácter tonal o mecanismos no medidos
(`/cálid|musical|retumbante|difuso|térmica descontrolada/i`).
Verificado con Chrome headless (inyectando el HTML que
`modeloAmortiguamiento` produciría, ya que el catálogo real sigue sin
`factorAmortiguamiento` poblado — ver el punto de "Falta" ya
existente): título en negrita + 2 párrafos + caja de cálculo + aviso,
todos cleanly separados, sin errores de consola. **313 tests totales**
entre los 4 workspaces (antes 311).

**Bug: selector de idioma pisando los botones del header en tablet/
teléfono.** Reportado por el usuario: en anchos angostos, ES/EN quedaba
montado sobre "Cambiar sistema"/"Volver al análisis" en vez de alinearse
con el título "THE HIFI MATCH". Causa raíz, confirmada con
`getBoundingClientRect` vía Chrome headless (no a simple vista): `.head`
usa `grid-template-areas:"hm hright" "hs hright"` — como `"hright"`
aparece en las dos filas, ese área ocupa el bloque completo de 2 filas y
`align-items:center` lo centra contra las DOS filas juntas, no sólo
contra la segunda; eso deja "hright" (con los botones de volver) pegado
al borde superior del header, sin aire para que `.idioma-splash`
(`position:fixed`, fuera del grid) quepa arriba sin tocarlo. El
breakpoint compacto que ya reestructuraba esto para separar "hright" en
su propia fila (antes sólo `≤640px`, sólo teléfono) se ensanchó a
`≤1024px` para cubrir tablet también — eso resolvió la superposición
grande, pero midiendo con precisión (no redondeada) el margen entre
ambos quedó en `-0,34px`: prácticamente tocándose, no una separación
real. Fix final: `row-gap` de `.head` en ese breakpoint sube de `6px` a
`12px` (con el `padding-top` de compensación de `.wrap` ajustado en la
misma medida, `82px`→`88px`) — dejó `~5,7px` de margen real, verificado
en los 6 anchos de teléfono/tablet relevantes (390/414/640/768/820/1024)
con `getBoundingClientRect` exacto, sin redondear, más capturas de
pantalla en 390 y 820. Cambio puramente de `estilos.css`, sin tocar
`main.ts`/`pintar.ts`/HTML.

**Perfiles genéricos (arquetipos) — respaldo para equipos fuera de
catálogo, primera vez que el catálogo tiene equipos que no son un
producto real.** Pedido explícito: 3 parlantes + 3 amplificadores bajo
una marca reservada `MARCA_GENERICA = 'Genérico (Arquetipo)'`
(`packages/data/src/catalogo.ts`, exportada junto con `PARLANTES_GENERICOS`/
`AMPLIFICADORES_GENERICOS`, antepuestos al resto de cada categoría — el
orden visible en el selector no cambia por esto: `marcasUnicas()`
siempre ordena alfabéticamente por `localeCompare`, sin importar la
posición en el array fuente). Sirven para aproximar el comportamiento
eléctrico de un equipo que el usuario tiene pero que no está en el
catálogo, evaluado por parecido físico (impedancia mínima/de pico,
ángulo de fase, factor de amortiguamiento) en vez de quedar sin
análisis. Parlantes: `MONITOR_ALTA_REACTIVIDAD` (Zmín 3,5 Ω, θ −55°,
Zmáx 30 Ω), `COLUMNA_ESTANDAR` (4,8 Ω, −35°, 24 Ω), `FILTRO_PURISTA_DOCIL`
(6,2 Ω, −15°, 16 Ω) — de más a menos exigente eléctricamente.
Amplificadores: `SOLID_STATE_ALTA_CORRIENTE` (DF 400),
`SOLID_STATE_VINTAGE_AVR` (DF 60), `VALVULAR_ALTA_ZOUT` (DF 8, sin
potencia4OhmW — un transformador de salida valvular no tiene una
relación simple de potencia 8→4 Ω).

**El pedido no traía sensibilidadDb ni potencia8OhmW — campos no
nulos en el esquema (`Parlante`/`Amplificador`, `tipos.ts`) que
`potencia.ts` exige siempre.** Sin ellos, ni la carga real de estos 6
perfiles compilaba. Se avisó explícitamente antes de inventar esos
números (misma doctrina de "no inventes umbrales, pregunta" aplicada
acá a specs de equipo, no a un umbral del motor) y se propuso un valor
razonable por arquetipo, coherente con su identidad eléctrica ya
declarada (más reactivo → sensibilidad más baja de monitor compacto;
carga más benigna → sensibilidad más alta de crossover simple;
alta corriente → más vatios que un receptor vintage o un valvular),
aprobado antes de escribir el catálogo. Todo dato sintético
(sensibilidadDb, potencia8OhmW, potencia4OhmW) lleva `confianza: 'baja'`
declarada y una `nota`/`fuente` que dice explícitamente "no es un
producto real" — nunca se disfraza de medición citada, mismo principio
de "fuente + confianza" que rige el resto del catálogo.

**Zmín/fase/Zmáx/DF se declaran directamente (no vía los fallbacks ya
existentes)**, así que `carga.ts` nunca activa `thetaEsSupuesto` (el
fallback de −45° para nominal ≤4 Ω) ni `amortiguamiento.ts` activa
`zMaxEsSupuesto` (el fallback de 25 Ω) para estos 6 perfiles — tienen
su propio valor declarado, más específico que cualquiera de los dos
supuestos genéricos que ya existían. Verificado con un vector extremo
(Monitor de alta reactividad + Válvulas alta Zout): EPDR≈1,92 Ω
("crítico") y ΔdB≈1,90 dB ("crítico") calculan de punta a punta sin
"sin-datos", y el veredicto general sube hasta "Configuración no
recomendada" — la cadena completa de severidad respondiendo a specs
enteramente declaradas por este sitio, no citadas de un fabricante.

**Aviso de aproximación en la tarjeta, arriba de todo.** Cuando el
equipo elegido tiene `marca === MARCA_GENERICA`,
`infoHtmlParlante`/`infoHtmlAmplificador` (`vista/selectores.ts`)
insertan `config.notaGenerico` (bilingüe, "Perfil genérico
(arquetipo): una aproximación física de referencia, no un producto
real ni una medición...") como primer elemento de la tarjeta `.info`,
antes del badge de tipo — no se puede confundir con un producto real
ni pasarlo por alto. `infoHtmlFuente` (streamers/DACs) no lo necesita:
esta ronda no agrega arquetipos de fuente.

**Chips nuevos, derivados automáticamente — cero riesgo para los 132
equipos reales.** `etiquetas.ts` ya derivaba chips de
`impedanciaMinOhm`/`potenciaRecMinW`/`maxSplDb`/`cargaMinOhm`, pero no
de `impedanciaMaxOhm`/`anguloFaseGrados`/`factorAmortiguamiento` — los
3 campos que ningún equipo real tiene poblado todavía (ver más abajo).
Se agregó el chip para cada uno (`Zmáx 30 Ω`, `θ −55°`, `DF 400`) sólo
cuando el campo no es `null`, así que los 132 equipos reales del
catálogo no ganan ningún chip nuevo — sólo lo ejercitan los 6
genéricos, primeros en poblar esos 3 campos. `θ`/`Ω`/`DF` no necesitan
traducción (símbolos y una sigla ya estándar en los dos idiomas);
`Zmáx`/`Zmax` sí reusa `catalogo.max` (`mín`/`min`), ya bilingüe.

**Decisión deliberada, documentada: `marca`/`nombre` de estos 6
perfiles se quedan en español en las dos versiones del sitio.** El
esquema declara ambos campos "NO se traduce" para TODO el catálogo,
real o genérico (`tipos-catalogo.ts`) — funciona para marcas reales
porque son nombres propios (KEF, Focal), pero "Genérico (Arquetipo)"
es prosa descriptiva, así que en inglés el selector de marca/modelo
sigue mostrando el literal en español. Traducirlo de verdad exigiría
que `marca`/`nombre` dejen de ser un string plano en TODO el catálogo,
o un shim de traducción por id en cada sitio que hoy interpola
`.nombre` directo (`vista/selectores.ts`, `vista/pintar.ts`
"La cadena", `resultado.ts` puente/recorrido/resumen/documento — más
de diez sitios) — desproporcionado para 6 entradas. En vez de eso, la
tarjeta `.info` (badge de tipo, chips, descripción, y sobre todo el
aviso `notaGenerico` de arriba) sí está completamente traducida y
aparece apenas se elige un modelo — mitiga el hueco sin tocar la
arquitectura de `marca`/`nombre` que el resto del catálogo ya daba por
sentada. Verificado con Chrome headless en inglés: el `<select>`
todavía dice "Genérico (Arque…" pero la tarjeta entera de abajo
(incluido el aviso) es inglés real, sin mezclar idiomas.

**197 (Falta, obsoleto) — este catálogo pasa a 138 equipos** (38
parlantes + 37 amplificadores + 30 streamers + 30 dacs + 3 cables, antes
132) — la primera vez que el conteo sube por perfiles sintéticos, no
por curaduría de un producto real. 331 tests totales entre los 4
workspaces (antes 313): 16 en `packages/data` (+4: existencia de los 6
perfiles, confianza baja, valores de carga/fase/Zmáx, DF exacto), 153
en `apps/web` (+14: 5 chips nuevos en `etiquetas.test.ts`, 5 en el
`selectores.test.ts` nuevo — primer test de ese archivo, cubre sólo las
funciones puras `infoHtml*`, nunca `document` — y 4 de integración
motor+catálogo en `adaptadores.test.ts`, vectores calculados con Node
igual que el resto del archivo).

**La Guía del análisis documenta los perfiles genéricos — pedido
explícito del usuario tras la ronda anterior ("falta actualizar la
ventana de info con las modificaciones, indicando modificaciones y
justificaciones de cálculo como extra al criterio original").** Nueva
entrada `info.generico` (`es.ts`/`en.ts`), tarjeta `<details>` número
3 de 12 en `#s-info` (justo después de `info.confianza`, antes de
`info.potencia` — mismo lugar en `index.html` y en el diccionario, para
que el orden del HTML documente la relación: "genérico" es una
extensión directa de la disciplina de fuente/confianza que ya explica
la tarjeta anterior, no un concepto aislado). El cuerpo declara
explícitamente que es un **agregado, no un reemplazo** de las 11
tarjetas ya existentes, y resuelve una tensión que un lector atento
podría notar: la tarjeta de "confianza" dice que este sitio nunca
rellena un hueco con un "estándar de mercado" inventado — un perfil
genérico podría leerse como justamente eso. La diferencia que la
tarjeta nueva declara: un estándar de mercado se inventaría en
silencio, adentro de los datos de un producto real con huecos; un
perfil genérico es una **categoría separada** que el usuario elige a
propósito, por nombre, nunca sustituida dentro de un equipo real.
También deja constancia de la justificación de cálculo pedida: EPDR y
la interacción de amortiguamiento corren con la misma fórmula y el
mismo umbral que usarían con un equipo real — el perfil genérico sólo
cambia el origen de los números de entrada (declarados por el sitio,
confianza baja), nunca la matemática. Deliberadamente **sin** botón
`.infobtn` propio en la tarjeta de equipo elegido (a diferencia de las
10 tarjetas de evaluación en `#s-results`, que sí tienen su atajo
contextual): esos botones se conectan una sola vez al arrancar
(`main.ts`, `querySelectorAll('.infobtn[data-info]')`), sobre HTML ya
presente en `index.html`; el `.info` de un equipo elegido se
reconstruye por completo en cada `pick()` (`selectores.ts`,
`box.innerHTML = ...`), así que un botón ahí necesitaría delegación de
evento nueva (mismo problema que ya resolvió `#plan-hint`/RECALCULAR)
— fuera de alcance de este pedido puntual, que fue sobre la ventana de
la guía. `idioma.test.ts` (`CLAVES_HTML`) suma `info.generico.cuerpoHtml`
en su posición real. Verificado con Chrome headless: la tarjeta abre en
el lugar correcto, con su propio texto (no mezcla con las tarjetas
vecinas), en los dos idiomas, sin tocar ninguna de las otras 11.

**Bug de documentación real, encontrado por el usuario probando el
sitio: la tarjeta "Puntaje del match (1-10)" de la Guía seguía
describiéndolo como visible ("el número lleva color... para que se lea
de un vistazo"), pero el rediseño del veredicto (ronda "Contexto no es
resultado", más arriba en este documento) ya lo había sacado por
completo de `#s-results` — `#pt-puntaje` y el resto de sus ids no
existen más en `index.html`.** Confirmado con Chrome headless antes de
tocar nada: `document.getElementById('pt-puntaje')` es `null` y ningún
"X,X/10" aparece en el texto de la pantalla de resultado en vivo — el
usuario tenía razón, no era una percepción. `info.puntaje.cuerpoHtml`
(`es.ts`/`en.ts`) se reescribió para decir la verdad actual: ya no
encabeza ni aparece en vivo (el veredicto lo reemplazó como resumen
visible), el cálculo sigue existiendo en la capa criterio-editorial
sin cambios (mismos pesos, mismo criterio de exclusión de componentes
sin dato), y hoy vive en la pantalla "Informe (vista previa)"
(`#s-documento`) — que, como ya declara la ronda del informe más
arriba, tampoco tiene un botón que la abra todavía. Alcance
deliberadamente acotado: sólo el texto de la guía, sin tocar
`puntaje.ts`, `#s-documento` ni reintroducir el bloque en
`#s-results` — el usuario eligió explícitamente "arreglar el texto de
la guía" en vez de "traer el puntaje de vuelta a pantalla" cuando se
le preguntó. Verificado con Chrome headless que el nuevo texto abre en
el lugar correcto, en los dos idiomas.

**El puntaje 1-10 se elimina por completo — pedido explícito del
usuario, "en todas partes... cambia por el nuevo concepto de
evaluación" (el veredicto y sus tres estados). Supera a la ronda
anterior** (que sólo corrigió el texto de la guía, dejando el cálculo
vivo "por si servía para un comparador futuro"): esta vez no queda
nada, ni en el motor ni en la UI ni en el informe.

`packages/engine/src/puntaje.ts` y su test se **borran enteros**
(`calcularPuntaje`, `clasificarPuntaje`, `PESOS_DECLARADOS`,
`ComponentePuntaje`, `UMBRAL_PUNTAJE_VERDE`/`NARANJO`). Lo único que
sobrevivía con un consumidor real fuera del propio módulo —
`peorSeveridad()`, que `veredicto.ts` ya reusaba explícitamente— se
**relocaliza** a `tipos.ts`, junto a su análoga `peorConfianza()`
(mismo patrón, mismo archivo); sus 4 tests se mudan con ella a
`tipos.test.ts`. `veredicto.ts` pasa a ser el único módulo de
evaluación de conjunto del sitio — su comentario de cabecera ya no
habla de "coexistir" con un puntaje, sino de haberlo reemplazado por
completo.

**En `apps/web`, dos piezas dejaban de tener casa propia al borrar
`puntaje.ts` y había que decidir dónde iban — ninguna de las dos era
en realidad "sobre el puntaje".** `motor.puntaje.rotulo` ("Criterio
editorial, no física") ya la reusaba la tarjeta del veredicto en vivo
(`#veredicto-card`) desde la ronda del veredicto — es un rótulo de
capa, no del puntaje; se promueve a `resultado.capaCriterioEditorial`,
mismo nivel que ya tenía `resultado.capaFisica` para la capa física.
`motor.puntaje.componente` (7 nombres — "Potencia", "Carga", "Modos de
sala"...) alimenta "Qué conviene hacer" y el resumen del informe, dos
piezas completamente vivas que no tienen relación con un número 1-10
más allá de haber compartido el mismo archivo de constantes; pasa a
`motor.componentes.nombre`, con un tipo `NombreComponenteEvaluacion`
declarado en `es.ts` en vez de importar el `ComponentePuntaje['nombre']`
que ya no existe. El resto de `motor.puntaje.*`
(`filaIncluida`/`filaExcluida`/`aviso`/`criterio`/`notaRecalculo`) sí
era exclusivo del `modeloPuntaje()` ya muerto en producción desde la
ronda del veredicto (calculado, nunca pintado) — se borra sin relocalizar.

**`comportamientoHtml` (el párrafo holístico de "En resumen", que sólo
sobrevive dentro del informe) citaba el puntaje ("con un puntaje de
8,7/10") — ahora cita el título del veredicto** ("... — Configuración
totalmente compatible."). `modeloResumenFinal` cambia su segundo
parámetro de `{valor: number, clase: ClasePuntaje}` a
`{tituloHtml: string, clase: ClaseVeredictoGeneral}` (tipo local nuevo
en `resultado.ts`, alias de `'ok'|'warn'|'alert'` — ya no hay un tipo
`ClasePuntaje` del motor que importar). `modeloDocumento` cambia igual
su parámetro `puntaje` por `veredicto`, y `ModeloDocumento` cambia
`puntajeTexto`/`puntajeClase` por `veredictoTituloHtml`/
`veredictoClase`.

**`main.ts`: el veredicto se calcula una sola vez por snapshot, no dos
veces con criterios distintos.** Antes, `construirSnapshot()` calculaba
`puntaje`/`mPuntaje` (para el informe) y `pintarSnapshot()` calculaba
`veredicto`/`mVeredicto` por separado, en dos sitios con la misma
entrada. Ahora `calcularVeredicto()`/`modeloVeredicto()` se mueven
dentro de `construirSnapshot()` (mismo lugar donde ya vivía el cálculo
de potencia/modos del snapshot) y quedan en `SnapshotAnalisis.veredicto`/
`.mVeredicto` — `pintarSnapshot()` los reusa tanto para `pintarVeredicto`
como para alimentar `modeloResumenFinal`/`modeloDocumento`, una sola
fuente de verdad en vez de dos cálculos paralelos. `InfoClave` pierde
el miembro `'puntaje'` (ya estaba muerto: ningún `.infobtn` en
`index.html` lo usaba desde que el bloque del sidebar se retiró).

**La pantalla "Informe (vista previa)" (`#s-documento`) tenía la única
pieza de UI que todavía *pintaba* un puntaje** (`#doc-puntaje`, el
bloque bajo el plano). Se rediseña como un bloque "Veredicto general"
(`documento.veredictoTitulo`, nueva clave) — mismo lugar, mismo rótulo
de capa (`resultado.capaCriterioEditorial`, no un texto propio), pero
ahora muestra el título del veredicto en vez de un número, con el
mismo color por clase (`--paper-ok/warn/alert`, ya existían).
`pintarDocumento()` pinta `#doc-veredicto-titulo` en vez de
`#doc-puntaje`; `estilos.css` renombra `.doc-puntaje-*` a
`.doc-veredicto-*` (font-size baja de 21px a 17px — una frase como
"Configuración totalmente compatible" necesita más aire que "8,7/10").

**La tarjeta "Puntaje del match (1-10)" de la Guía, que la ronda
anterior había corregido para decir "ya no aparece en vivo", se borra
del todo** — junto con su rótulo homólogo. `info.capas.cuerpoHtml`
(que usaba el puntaje como ejemplo de la capa criterio-editorial) se
reescribe para citar el veredicto en su lugar.

`docs/motor-mvp.md` sección 7 ("Puntaje del match") se reescribe
íntegra como documentación de `veredicto.ts` (agrupación peor-de-3-
estados, tabla de qué agrupa cada uno, redacción del titular, streamer+
dac simultáneos, vectores de prueba) — no se dejó como una sección
muerta ni se borró sin reemplazo, mismo criterio que el resto de este
documento de mantener la referencia técnica viva. La mención de
reverberación ("no participa del puntaje... es informativa") también
se corrige: sí participa, en el estado "Sala" del veredicto — esa
frase ya estaba desactualizada antes de esta ronda (`reverberacion`
tenía peso propio en `PESOS_DECLARADOS` desde hacía tiempo).

**311 tests totales** entre los 4 workspaces (antes 331): 133 en
`packages/engine` (antes 147 — se van los 18 de `puntaje.test.ts`,
vuelven 4 de `peorSeveridad` en `tipos.test.ts`), 147 en `apps/web`
(antes 153 — se van los 6 de `modeloPuntaje`, ya muerto en producción;
el resto de tests tocados por el cambio de forma del parámetro
`puntaje`→`veredicto` se actualizaron in situ, no se sumaron ni
restaron). `packages/data`/`packages/contact` sin cambios (16/15).
Verificado con Chrome headless en las 3 pantallas: resultado en vivo
sin ningún rastro de "puntaje" en el DOM (`document.getElementById
('pt-puntaje')` es `null`, cero coincidencias de texto), la Guía con
11 tarjetas (antes 12) sin la de puntaje, y el informe mostrando
"Configuración soportada, con límites" en `#doc-veredicto-titulo` con
la clase de color correcta — sin errores de consola en ningún caso.

**Rediseño de portada, "Personalizar sala" colapsado y transición con
deslizamiento — portado desde una maqueta local de diseño
(`mockup-rediseno/`, nunca commiteada, en `.gitignore`), no diseñado
desde cero.** El usuario pidió una revisión de diseñador senior sobre
el sitio completo; el resultado fue una maqueta standalone de 3
páginas HTML iterada en varias rondas de feedback, y luego la
instrucción de aplicar lo aprobado al sitio real. El puerto se hizo
pieza por pieza, verificando primero cuánto de la maqueta ya coincidía
con el sitio real antes de tocar código — bastante, como queda abajo.

**Portada:** `.subm` ("análisis de compatibilidad hi-fi") se fusiona
con el antiguo `.foot` ("basado en física · specs medidos") en una
sola línea arriba del logo; abajo, una línea nueva `.remate` ("TÚ
ESCUCHAS Y DECIDES", mayúsculas por CSS, no en el texto del
diccionario) reemplaza el `.cierre` de dos frases — la primera
("The Hifi Match te da la información") se descarta, la segunda queda
sola y más corta. `splash.pie`/`splash.cierreHtml` se borran de
`es.ts`/`en.ts` (y de `idioma.test.ts`) por quedar sin uso. Debajo del
botón "Analizar un sistema", una fila nueva de 3 cifras (`.proof`) con
contador rápido desde 0 al cargar (`iniciarContadorProof()` en
`main.ts`, `requestAnimationFrame` + easing de salida, arranca ~1,1s
después de cargar para no competir con la animación del logo; respeta
`prefers-reduced-motion` yendo directo al valor final). **Las cifras de
la maqueta (9 reglas, 160+ equipos) eran inventadas** — se verificaron
antes de escribirlas: `export function evaluar*` en
`packages/engine/src/*.ts` da exactamente **8** (potencia, carga,
amortiguamiento, puente de impedancias, recorrido de volumen, modos,
nulo de escucha, reverberación); `catalogo.test.ts` confirma **138**
equipos reales (35 parlantes + 34 amplificadores + 3 y 3 "Genérico
(Arquetipo)" + 30 streamers + 30 dacs + 3 cables). Se muestra "130+" en
vez de "138" a propósito: una cifra redondeada hacia abajo se mantiene
cierta aunque el catálogo siga creciendo, sin exigir tocar la portada
en cada ronda de catálogo futura — mismo criterio de no prometer un
número que se pueda desactualizar solo.

**Tarjeta de veredicto: sin cambios.** La maqueta pedía "menos
naranjo / sin difuminado / sin punto en el badge / título en gris" —
los cuatro ya eran ciertos en el sitio real antes de este puerto
(`--warn` ya venía atenuado, `.veredicto-card` nunca tuvo gradiente,
`.layer` nunca tuvo un punto y ya es `--faint`) — ese feedback había
sido sobre la propia maqueta, construida desde cero con sus propios
defaults, no sobre una regresión del sitio real. Deliberadamente **no**
se tocó el color por severidad de `.vd-titulo`
(`.veredicto-warn .vd-titulo{color:var(--warn)}` etc.) pese a la
ambigüedad del pedido original sobre la maqueta ("a ese mismo título
dejalo en gris") — es una decisión ya tomada y documentada en la ronda
del veredicto ("tono visual", más arriba), y nada en los mensajes de
esta ronda la nombra directamente: se prefirió no deshacer una decisión
de diseño explícita sin una instrucción clara sobre el sitio real.

**Configurar en dos pasos.** "Define la cadena" pasa a vivir dentro de
una caja (`.cfg-lead-box`, mismo padding vertical de 6px que ya
estandariza el resto de tarjetas del sitio) en vez de flotar suelto —
pedido explícito ("debería estar en un cuadro similar a la otra página
de resultados"). Parlante/amplificador (requeridos) y streamer/DAC
(opcionales) se quedan exactamente como estaban, siempre visibles.
"Dimensiones de la sala" + "Materiales de la sala" + nivel + género —
todo lo que ya tenía un default razonable y nunca bloqueaba "Analizar"
— pasa a vivir detrás de un `<details class="room-toggle">` colapsado
por defecto ("Personalizar sala · opcional"), con un resumen de una
línea (`#room-summary-desc`, `config.resumenSala`) sincronizado en vivo
con cada cambio de dimensión/material y con el idioma
(`actualizarResumenSala()`, llamada desde
`setDim`/`setMuroFrontal`/`setPiso`/`cambiarIdioma`/`main()`) — nunca
queda desactualizado ni en blanco. Debajo de 640px el resumen se oculta
(sólo queda "Personalizar sala · opcional") para no desbordar. Resuelve
la mitad del punto de fricción que la revisión externa de UX había
dejado señalado y explícitamente diferido (la otra mitad, presets de
sala, sigue sin diseñar — se retira igual de "Falta" por no haber
quedado nunca como un ítem propio, sólo una mención de paso).

**Transición entre pantallas: deslizamiento en vez de sólo fundido.**
`vista/pantallas.ts` ya envolvía cada cambio de pantalla en
`document.startViewTransition()`; sólo le faltaban keyframes propios —
sin ellos, el navegador usa el fundido cruzado por defecto. Dos
keyframes nuevos (`pantalla-sale`/`pantalla-entra`, translateY ±3,5% +
opacity, misma curva `cubic-bezier(.22,.61,.36,1)` que ya usa el resto
del sitio) reemplazan la regla genérica de duración/timing que había
antes — cero cambios en `pantallas.ts`, es puramente CSS sobre los
mismos pseudo-elementos `::view-transition-old(root)`/
`::view-transition-new(root)` que ya existían. Verificado con Chrome
headless leyendo `document.getAnimations()` ~120ms después de un click:
a diferencia de la transición cross-document que la maqueta no pudo
verificar en este mismo entorno (limitación ya documentada en una ronda
anterior), la transición same-document del sitio real sí es
observable — las animaciones `pantalla-sale`/`pantalla-entra` aparecen
corriendo de verdad, no sólo declaradas en CSS.

Verificado extremo a extremo con Chrome headless (`file://` sobre el
build real): portada con las tres cifras contando hasta su valor final,
configurar colapsado y expandido con el resumen sincronizándose al
mover un slider, elección de equipo real vía los selects marca→modelo
ya poblados, "Analizar" hasta el resultado con la tarjeta de veredicto
intacta, y las mismas pantallas a 390px de ancho — sin errores de
consola en ningún paso. 311 tests sin cambios (esta ronda no tocó el
motor ni agregó lógica testeable nueva, sólo estructura/copy/CSS de
`apps/web`).

**Fondo ambiente de la portada: cubos de alambre isométricos — pieza de
la maqueta que había quedado afuera del primer puerto.** El puerto
anterior llevó el bloque de texto (eyebrow/logo/remate/cifras) pero se
saltó el `.ambient` de fondo de la maqueta; esta ronda lo suma.
`main.ts` gana `pintarFondoAmbiente()`: dibuja 2 cubos de alambre en un
`<svg data-ambient>` (viewBox 1440×900, `preserveAspectRatio="xMidYMid
slice"`) con la **misma fórmula** de proyección isométrica 30° que
`vista/plano.ts` usa para el plano de reflexiones real
(`sx=(x−y)·cos30, sy=(x+y)·sin30−z`) — reimplementada localmente, no
importada: acá las proporciones son arbitrarias (decoración, no una
sala real), así que acoplarla a la API de `plano.ts` (pensada para
`Sala`/`DisposicionSala`) sería una dependencia falsa. Mismo motivo
visual que la maqueta, no un adorno genérico — es el activo más
distintivo del producto, llevado a la marca. Fade-in propio
(`@keyframes ambient-in`, 2,8 s hasta opacidad ,24) y `.splash` gana
`position:relative; z-index:1` para pintar encima del fondo
`position:fixed`.

Verificado con Chrome headless en varios anchos: a 1440×900/1920×1080
(la mayoría de los desktops reales) los dos cubos caen donde la
maqueta los diseñó, sin cruzar el bloque de texto. A una ventana
angosta y alta (probado 1400×1700, y el mismo problema aparece en
cualquier viewport de teléfono) el mismo viewBox con
`preserveAspectRatio="slice"` amplifica el motivo mucho más — una
línea terminaba cruzando justo detrás de "Analizar un sistema". En vez
de recalcular coordenadas por proporción de pantalla, `.ambient` se
oculta directo bajo 760px (`@media (max-width:760px)`): existe para
llenar el espacio vacío alrededor del bloque central, algo que sólo
sobra en pantallas anchas — en mobile el contenido ya ocupa todo el
ancho. 311 tests sin cambios (decoración pura, sin lógica testeable).

**Logo de portada más grande/pesado, y los 3 contadores nunca se
apilan.** Dos ajustes puntuales sobre el puerto de la maqueta, pedidos
tras verla lado a lado con el sitio real. `.mark` pasa de `34px`/peso
600 fijos a `clamp(32px, 6.5vw, 60px)`/peso 800 — clamp propio, no el
`clamp(26px,5.8vw,72px)` literal de la maqueta: ese piso quedaba más
chico que el tamaño anterior en teléfono, una regresión que la maqueta
no tenía que evitar porque nunca compartió breakpoints con el sitio
real. Las animaciones de entrada (`the-in`/`hm-in`) suman
`filter:blur()` + `scale()` al fundido/deslizamiento que ya tenían
(mismo espíritu que el "rise"/"riseSlide" de la maqueta: se asienta,
no llega de golpe), con radios más chicos porque acá el bloque es más
compacto. `.splash .proof` pasa de `flex-wrap:wrap` (se apilaba
verticalmente bajo cierto ancho) a `nowrap` siempre, con una segunda
capa bajo 640px (`gap`/`font-size` más chicos, `flex:1 1 0` por ítem en
vez de `max-width` fijo) para que los 3 números quepan en una sola
fila incluso en teléfono — pedido explícito, verificado hasta 360px de
ancho sin overflow. 311 tests sin cambios (puramente CSS).

**Eyebrow/remate/cifras: mayúsculas y tracking ancho, como la maqueta —
faltaba después de portar el bloque de texto.** Las dos rondas
anteriores portaron tamaño/posición/animación pero no el tratamiento
tipográfico fino de estas líneas de apoyo; comparando lado a lado con
la maqueta, la diferencia real estaba ahí. `.subm`/`.remate` pasan a
compartir una sola regla (`text-transform:uppercase`, tracking `.26em`,
color `--faint`) en vez de reglas separadas con tracking angosto y
`--dim` — mismo criterio que la maqueta, que usa un único selector
para las dos líneas. `.proof-num` cambia de `--dorado` a `--text`
(blanco, no dorado) y `.proof-label` suma mayúsculas + tracking. El
tracking de `.26em` (no el `.32em` literal de la maqueta) es una
concesión al ancho real del sitio: se probó hasta 360px de ancho antes
de fijar el valor, para que el eyebrow siga envolviendo a 2 líneas
limpias en vez de 3. 311 tests sin cambios (puramente CSS).

**"Personalizar sala" con el tratamiento de la maqueta: selects con
label arriba, sliders dorados, Nivel/Género pasan de botones a
selects.** Cuarto ajuste sobre el puerto del rediseño, esta vez sobre
`configurar.html` de la maqueta (no la portada). Los 6 materiales
mantienen sus mismos `<select>`/ids — sólo cambia `.materiales-grid
.rline` de fila horizontal (label a la izquierda) a columna (label
arriba, mayúsculas, `--faint`, tracking) — CSS puro, sin tocar
`main.ts` ni HTML de esa parte. **Nivel de escucha y Género musical
dejan de ser `.segs` (botones segmentados) y pasan a `<select>`**,
mismo componente `.sel-compact` que ya usan los materiales, agrupados
en `.materiales-grid.nivel-genero-grid` (2 columnas, mismo tratamiento
de celda) — unifica el lenguaje de controles de toda la sección en vez
de mezclar botones y selects. `setNivel`/`setGenero` se simplifican
(ya no gestionan `aria-pressed`, el propio `<select>` lo resuelve);
`wireEventos()` cambia de `click` sobre `.segs button[data-lvl/genero]`
a `change` sobre los dos `<select>` nuevos.

Los 3 sliders de dimensión ganan **relleno dorado hasta la posición
actual** (`input[type=range]{background:linear-gradient(...var(--fill,
50%)...)}`) en vez de una línea pareja — `--fill` no es nativo del
input, lo calcula `actualizarFillSlider()`/`wireSlider()` en `main.ts`
en cada `input` y una vez al cargar (para arrancar en la posición
correcta del default, no en el 50% del fallback del degradé). Las
etiquetas de dimensión (`.dl`) suman mayúsculas/tracking, mismo
criterio que las de material. El botón "Analizar" (y "Enviar" del
formulario de contacto, que reusa la misma clase `.analizar`) pasa de
relleno blanco a dorado. 311 tests sin cambios (sin lógica nueva en el
motor; `setNivel`/`setGenero` siguen siendo setters triviales).

**Corrección del módulo de potencia (`potencia.ts`) — 7,25 dB de error
acumulado que una auditoría externa encontró en tres defectos que se
cancelaban parcialmente entre sí, por eso los 133 tests anteriores
pasaban.** No era un bug contra la especificación: era la especificación
la que estaba mal. Los tres, todos en `evaluarPotencia()`:

1. **Convención de sensibilidad sin normalizar.** `unidades.ts` ya tenía
   `sensibilidadA1WDb(sensibilidad283VDb, impedanciaOhm)` desde hacía
   tiempo, con un comentario que la describe como "la fuente de error más
   común del dominio" — nadie la llamaba. `Parlante`/`ParlanteCat` suman
   `sensibilidadConvencion: '2.83V' | '1W' | null`: `'2.83V'` normaliza
   con esa función (2,83V sólo equivale a 1W cuando la impedancia nominal
   es 8 Ω — a 4 Ω sobreestima el SPL en ~3 dB); `null` (la fuente citada
   no declara cuál usó) usa el valor tal cual pero degrada la confianza
   del resultado a `'baja'` sin excepción — nunca se asume una convención
   en silencio.
2. **Potencia a 8 Ω usada siempre**, aunque el parlante fuera de 4 Ω y el
   catálogo tuviera `potencia4OhmW` (ej. Cambridge CXA81: 80 W/120 W, 1,76
   dB reales descartados). Ahora usa la potencia de la carga real cuando
   corresponde, y marca `potenciaDeCargaEstimada: true` si el ampli no
   publica el dato a 4 Ω. `carga.ts` no se tocó: el ratio p4/p8 que usa
   para reserva de corriente es una pregunta distinta.
3. **`SUMA_PAR_DB` (6→3 dB)**: +6 dB sólo vale para contenido
   correlacionado (graves prácticamente mono); el estéreo descorrelacionado
   — casi toda la música en medios/agudos — suma +3 dB. **`GANANCIA_SALA_DB`
   deja de sumarse al SPL de banda ancha**: ese refuerzo aparece bajo la
   frecuencia del modo axial de la dimensión mayor de la sala, no en todo
   el rango — ahora se expone como información
   (`gananciaSalaDb`/`frecuenciaGananciaSalaHz`, `evaluarPotencia()` gana
   el parámetro explícito `dimensionMayorSalaM` para calcularla).

**Guardarraíl explícito del pedido, respetado:** el cambio mueve buena
parte del catálogo hacia `justo`/`insuficiente` en niveles alto y
referencia — es el resultado correcto, no un problema a compensar. No se
tocaron `PICO_OBJETIVO_DB` ni los umbrales de severidad (`margenDb≥3`/
`≥0`), y `GANANCIA_SALA_DB` no se reintrodujo por otra vía.

**Catálogo: `sensibilidadConvencion` poblado sólo donde la fuente ya
citada lo declara explícito — 2 de 38 parlantes.** `diatone-ds251-mk2`
(`'1W'`, la nota ya citaba el estándar japonés "New JIS" de época) y
`wharfedale-linton-heritage` (`'2.83V'`, la nota ya declaraba que el
valor usado "está en la referencia estándar del proyecto"). Los otros 36
—incluidos KEF LS50 Meta y Klipsch RP-600M II, los dos parlantes de los
vectores de prueba— quedan en `null`: no por falta de investigar, sino
porque se revisó su fuente citada y no lo dice. `etiquetas.ts` deriva el
calificador del chip de sensibilidad desde ese campo estructurado
("sin convención"/"no convention") en vez de sólo texto suelto por
equipo — nuevo, se suma al `calificador` manual existente ("anecoica")
en vez de reemplazarlo.

**Vectores A/B/C recalculados, vector D nuevo.** Klipsch y KEF son ambos
de 8 Ω nominales y ninguno declara convención — los cambios 1 y 2 no les
mueven el SPL (2,83V sobre 8Ω ≈ 1W), así que todo el movimiento es el
cambio 3: una baja neta de exactamente 6 dB. A (Klipsch+CXA81, 2,5m,
alto) pasa de "Con margen" a "Justo"; B (KEF+Rega, 3m, alto) de "Justo" a
"Insuficiente"; C (KEF+Rega, 3m, referencia) ya era "Insuficiente" y
sigue siéndolo. Los tres bajan de confianza `media`/`alta` a `baja`
(sensibilidadConvencion null en ambos parlantes). El vector D es
sintético (88 dB @2,83V, 4 Ω, ampli 80W/120W) — el único que ejercita los
3 cambios a la vez: SPL sin corregir 106,49 dB ("Con margen") → corregido
99,23 dB ("Insuficiente"). Textos actualizados en consecuencia: `motor.
potencia.calc` en `es.ts`/`en.ts` ya no hardcodea "+6 par +3 sala" ni
"8 Ω" — muestra la potencia realmente usada (8 o 4 Ω) y suma líneas
condicionales (sensibilidad normalizada, sin convención declarada,
potencia estimada, refuerzo de sala informativo) sólo cuando aplican.
314 tests totales entre los 4 workspaces (antes 311) — la mayoría de la
diferencia son fixtures de `Parlante` en otros archivos de test
(`carga.test.ts`, `amortiguamiento.test.ts`) que necesitaron el campo
nuevo para seguir tipando, más los tests nuevos de `potencia.test.ts`
(vector D, cambio 2 sin dato a 4Ω, informativo de ganancia de sala).

**Ronda posterior sobre el mismo cambio: la degradación de confianza a
`'baja'` por convención de sensibilidad desconocida se condiciona a la
impedancia, y el caso donde sí importa muestra un rango, no un punto —
feedback directo tras ver la primera versión.** El diagnóstico: a 8 Ω,
2,83V y 1W difieren <0,01 dB — degradar la confianza de Klipsch RP-600M
II o KEF LS50 Meta (ambos 8 Ω, ninguno declara convención) castigaba un
dato que en la práctica no tiene ambigüedad, y diluía la señal justo
donde sí importa (un parlante de 4 Ω con convención desconocida, donde la
diferencia puede superar 3 dB).

`ResultadoPotencia` suma `sensibilidadRangoAplica: boolean`
(`sensibilidadSinConvencion && impedanciaNominalOhm<8`) y tres campos de
rango — `sensibilidadEfectivaRangoDb`/`splDisponibleRangoDb`/
`margenRangoDb`, todos `[pesimista, optimista] | null`. Cuando
`sensibilidadRangoAplica` es `true`: la confianza degrada a `'baja'` (acá
sí hay ambigüedad real) y `sensibilidadEfectivaDb` —de donde salen
`splDisponibleDb`/`margenDb`/`codigo`/`severidad`— usa el extremo
**pesimista** (`sensibilidadA1WDb`, como si la fuente hubiera citado a
2,83V), conservador y coherente con el resto del motor. El extremo
optimista (el valor citado tal cual, como si ya estuviera a 1W) queda en
los tres campos de rango — no es un número "menos preciso" descartado,
es información: la tarjeta ahora puede decir "si tu parlante ya reporta
a 1W, el margen real sería X en vez de Y". A 8 Ω o más con convención
`null`, nada de esto aplica — `sensibilidadEfectivaDb` usa el valor
citado tal cual, la confianza no degrada, y los tres campos de rango
quedan en `null`; `sensibilidadSinConvencion` sigue declarando el hecho
(la fuente no dijo cuál convención usó), simplemente sin consecuencia
numérica.

Efecto en los vectores de prueba: A (Klipsch+CXA81) vuelve a confianza
`'media'`, B/C (KEF+Rega) vuelven a `'alta'` — exactamente los valores de
antes de la primera versión de esta corrección, porque a 8 Ω la
ambigüedad de convención nunca debió cambiar nada. El vector D (sintético
4 Ω, convención `'2.83V'` conocida) no se toca. Vector nuevo: mismo
parlante/ampli que D pero con convención `null` — confirma que el
extremo pesimista del rango coincide casi exacto con D (ambos asumen,
por distinta razón, 2,83V), que la confianza sí degrada a `'baja'` ahí, y
que el extremo optimista del rango (`margenRangoDb[1]`) es exactamente el
número que este mismo cálculo daba en la versión anterior de la
corrección, antes de distinguir por impedancia — buena señal de que el
cambio es una restricción del alcance, no un cálculo nuevo. Un archetype
genérico real del catálogo (`generico-parlante-monitor-reactivo`, 4 Ω,
convención `null`) también se mueve: su margen headline pasa de −5,10 a
−8,12 dB (el extremo pesimista, antes se usaba el valor tal cual sin
distinguir impedancia) — sigue "Insuficiente" en los dos extremos del
rango. `docs/motor-mvp.md` sección 2 documenta la primera versión
revertida y el porqué, no sólo el estado final. 316 tests totales (antes
314): +2 en `potencia.test.ts` (el caso con rango a 4 Ω, y el caso sin
rango a 8 Ω pese a convención `null`), ajustes de valores esperados en
`adaptadores.test.ts` sin sumar tests ahí.

**Tercera vuelta sobre la degradación de confianza: el corte a 8 Ω es un
proxy nominal, declarado como tal; y el rango que cruza un umbral de
severidad ahora dice los dos veredictos posibles, no sólo el pesimista —
la mejor pieza de producto de toda esta corrección, según feedback
directo.** Dos matices más sobre la ronda anterior, ninguno cambia el
umbral de 8 Ω en sí:

**Límite declarado, no corregido.** El corte usa `impedanciaNominalOhm`
— un número de ficha, redondo — no la impedancia real en la banda media
donde se mide la sensibilidad. Un parlante "de 8 Ω nominales" suele caer
en 6-6,5 Ω reales ahí; a 6 Ω, 2,83V son 1,33 W, ~1,25 dB de diferencia
(no los <0,01 dB del caso idealizado exacto a 8 Ω). Para varios
parlantes de 8 Ω nominales del catálogo, la ambigüedad real puede rondar
1 dB, no cero. **Deliberadamente no se corrige** — el catálogo no tiene
impedancia media medida por equipo, y asumirla inventaría un dato — pero
queda declarado en `docs/motor-mvp.md` sección 2, para que quien audite
el modelo lo encuentre escrito, no lo descubra.

**El caso que faltaba testear: cuando el rango cruza un umbral de
severidad, no sólo cambia el margen — cambia el veredicto.** Con el
arquetipo genérico (4 Ω) los dos extremos daban "insuficiente" — el caso
"limpio", donde reportar el pesimista solo es razonable porque el
optimista tampoco salva la combinación. El caso interesante es cuando el
pesimista da "insuficiente" y el optimista "con-margen": ahí el
`codigo` headline no es una propiedad del sistema, es un artefacto de
qué dato de catálogo falta. `ResultadoPotencia` suma
`codigoRangoOptimista: CodigoPotencia | null` (el `codigo` que
resultaría con el extremo optimista, vía `clasificarMargen()` — extraída
como función para no duplicar los tres umbrales de severidad) y
`margenCruzaUmbral: boolean`. Cuando es `true`, `modeloPotencia`
(`apps/web`) **reemplaza** el `simpleHtml` normal (el % de capacidad
usada) por un texto que nombra los dos códigos posibles y declara que
falta el dato de convención para decidir — no un detalle enterrado en
"Ver detalle técnico": es la frase que se lee sin abrir nada, porque es
la pieza más accionable de esta ambigüedad. `calcHtml` usa su propia
variante (`sensibilidadRangoCruzaUmbralHtml`, distinta de
`sensibilidadRangoHtml`) que también nombra los dos códigos, no sólo los
números.

Vector de prueba nuevo (sintético, 1 Ω a propósito — fuera del rango real
de un parlante, para separar los extremos lo bastante como para cruzar
los dos umbrales de severidad a la vez): sensibilidad 92 dB sin
convención, amplificador 40 W sin `potencia4OhmW`, 2,0 m, nivel alto.
Pesimista ≈−4,04 dB ("insuficiente"), optimista +5,0 dB ("con-margen") —
`margenCruzaUmbral=true`. Test adicional en `resultado.test.ts` verifica
que `modeloPotencia` realmente reemplaza `simpleHtml`/`calcHtml` con las
variantes de dos códigos, no sólo que el motor calcula los flags
correctos. 318 tests totales (antes 316): +2 en `potencia.test.ts`
(el vector de cruce, y la corrección del comentario de un test anterior
que ya cruzaba un umbral sin que el test lo dijera), +1 en
`resultado.test.ts`.

**Corrección del bloque de sala: reverberación deja de emitir veredicto, y
se recalibra el umbral de agrupamiento de modos — pedido con una auditoría
externa que corrió el motor sobre 17.784 salas plausibles y encontró que
las dos reglas de sala casi no discriminaban nada.** Con materiales
típicos, RT60 daba `rt60-largo` en el **100%** de esas salas; modos daba
`modos-agrupados` en el **86%**. Dos semáforos que casi siempre dicen lo
mismo no informan.

**RT60: agregar mueble no arregla la regla, le da vuelta el signo.** El
modelo sólo tenía las seis superficies desnudas — sin sofá, cortinas ni
biblioteca, la mayor parte de la absorción real en medios/agudos de una
sala doméstica. Calibrando un término de contenido en sabines por m² de
piso (`CONTENIDO_SABINES_M2_PISO`, criterio del sitio, no una tabla
publicada), el veredicto pasaba a `rt60-ok` en el 100% de las salas — y
peor: como volumen y absorción del contenido crecen los dos con la
superficie de piso, se cancelaban, y el RT60 terminaba dependiendo casi
sólo de la altura del techo (una sala de 8 m² y una de 63 m² con la misma
altura daban 0,43 s y 0,46 s). El resultado lo decidía un control que el
usuario tiene que adivinar, no la sala. **Conclusión: el RT60 estimado no
da para veredicto, sí da para estimación declarada.**
`evaluarReverberacion()` ahora calcula **dos escenarios** — `vacio`
(sólo estructura) y `amoblado` (estructura + contenido) — y expone
`rt60RangoS: [amoblado, vacio]` en vez de un solo número con semáforo.
`severidad` es siempre `'sin-datos'`, con un código nuevo
`rt60-estimado`: se reutiliza a propósito la semántica de `'sin-datos'`
que `veredicto.ts` ya tenía probada ("esto no cuenta como reparo, falta
medir") — acá lo que falta es justamente eso, una medición real, así que
la semántica es correcta, no un truco. `RT60_MIN_OK_S`/`RT60_MAX_OK_S` y
los códigos `rt60-corto`/`rt60-ok`/`rt60-largo` se eliminan enteros, con
sus tests. La tarjeta (siempre visible, nunca oculta como "sin-datos" por
falta de dato de catálogo) presenta el rango, declara que ninguno de los
dos extremos es una medición, y cierra invitando a medir — **el RT60 es
lo único de todo el análisis que el usuario puede verificar él mismo en
cinco minutos con una app de teléfono**, el remate es el punto, no un
adorno.

**Bug numérico real encontrado al implementar el término de contenido:
ᾱ puede superar 1, y Eyring no lo tolera.** Los coeficientes de Sabine
son empíricos, no acotados a 1 por construcción — sumar contenido sobre
una combinación ya muy absorbente (los 4 muros declarados "vacío" a la
vez, un caso ya existente en los tests de sala) empuja ᾱ por encima de 1,
y `Eyring` exige ᾱ<1 estricto (`ln(1−ᾱ)` indefinido en ᾱ≥1) — sin guardia,
esto daba `NaN` en producción para esa combinación extrema. Fix:
`ALPHA_EYRING_MAX=0,9999` clampea sólo el argumento del logaritmo — el
resultado converge a un RT60 casi nulo de todas formas cuando ᾱ→1, así
que el clamp no cambia el sentido físico del resultado, sólo evita el
indeterminado. Test de regresión nuevo con el vector exacto que lo
dispara.

**La frontera de Schroeder deja de contradecir el techo de modos.** `fs`
se calculaba desde el RT60 final ya promediado (500+2000 Hz, dominado por
agudos) — para la sala por defecto eso daba 371,6 Hz, por encima del
techo fijo de modos (300 Hz): quedaba una banda de 300 a 372 Hz que
ninguna de las dos reglas gobernaba, pese a que los textos de ambas
tarjetas afirmaban cubrir el rango completo entre las dos. Ahora `fs` sale
de la banda de 500 Hz sola, del escenario amoblado (205,2 Hz para la sala
por defecto) — y `evaluarModos(sala, techoModosHz?)` gana un parámetro
opcional (por defecto sigue siendo `TECHO_MODOS_HZ=300`) para que
`apps/web/src/main.ts` le pase esa `fs`, clampeada a `[150,400]` Hz
(`techoModosDesdeSchroeder`, criterio del sitio) para que un RT60 extremo
no produzca un techo absurdo. Con esto, la región que "Modos de sala"
lista y la región donde "Reverberación" declara que un tiempo único tiene
sentido quedan contiguas por construcción. El techo dinámico sólo afecta
el LISTADO de modos, nunca la detección de agrupamiento (siempre bajo el
`TECHO_AGRUPAMIENTO_HZ=150` fijo) — el clamp mínimo (150) garantiza que
nunca recorte por debajo de eso.

**Modos: el umbral de agrupamiento baja de 5% a una regla de dos
condiciones.** Un umbral único más bajo no alcanzaba: la sala por defecto
del sitio (3,6×5,0×2,4) tiene una única coincidencia, pero es **exacta**
(0,00% de diferencia, ancho orden 3 = alto orden 2) — el peor caso
posible, y una regla de "2 o más pares" la habría dejado pasar como sala
"buena". Regla nueva, `warn` si se cumple cualquiera de las dos: existe
al menos un par con Δ<`UMBRAL_AGRUPAMIENTO_EXACTO` (1%), o existen
`MIN_PARES_AGRUPADOS` (2) o más pares con Δ<`UMBRAL_AGRUPAMIENTO` (bajado
de 5% a 2%) — los tres declarados como criterio del sitio.
`TECHO_AGRUPAMIENTO_HZ` (150 Hz) no cambió, y `paresMasImportantes` (la
curación para las curvas 1D) tampoco. Con esta regla, un barrido propio
(25.254 salas, paso de 0,1 m en los mismos rangos que la auditoría
externa) marca 35,3% de las salas — en la misma banda que el 37%
reportado externamente, sin haber movido ningún umbral para forzar ese
número (guardarraíl explícito del pedido, respetado). La sala por defecto
del sitio, que antes tenía 4 agrupamientos bajo el umbral de 5%, ahora
tiene 1 — y sigue en `warn`, exclusivamente por la condición del par
exacto. `apps/web/src/vista/curvamodal.test.ts` necesitó una sala de
vector distinta (2,5×3,8×2,5, 4 pares) para seguir probando el recorte de
`paresMasImportantes` a `TOP_N_AGRUPADOS`, ya que la sala por defecto ya
no alcanza para eso.

**`veredicto.ts`: el grupo "Sala" ya sabe excluir reverberación sin
tratarla distinto del resto del motor.** `EntradaVeredicto.reverberacion`
cambia de `'ok'|'warn'` a un tipo nuevo `SeveridadSala = 'ok'|'warn'|
'sin-datos'` (declarado explícitamente: "casi siempre sin-datos en la
práctica"), y `calcularVeredicto()` filtra reverberación con el mismo
`sinFaltantes()` que ya usaba para "Acople eléctrico" — como `modos`
siempre tiene valor, "Sala" nunca queda vacío, pero reverberación ya no
puede arrastrarlo a `warn` por sí sola. `peorEntre()` (`resultado.ts`,
`modeloVeredicto`) ya filtraba `'dim'` de sus entradas desde que existe
— no necesitó ningún cambio: automáticamente pasó a mostrar siempre el
texto de `modos` como el detalle de "Sala" en el veredicto en vivo.

**El aviso de "muro vacío no ajusta los modos" se muda de "En resumen" a
la propia tarjeta de Reverberación.** Antes vivía sólo como
`avisoHtml` de un componente `componentesResumen` que dependía de que la
severidad fuera `warn` — con reverberación siempre `sin-datos`/dim ahora,
ese aviso jamás habría vuelto a mostrarse en ningún lado si se dejaba el
mecanismo tal cual (los componentes `dim` no pasan el filtro de avisos de
"Qué conviene hacer" ni de "Lo que conviene revisar"). Se corrigió
moviendo el cálculo de `murosVacios`/el aviso **adentro** de
`modeloReverberacion()` (que ya recibía `materiales`), concatenado al
final de `textoHtml` — la tarjeta de Reverberación es la única superficie
del sitio que siempre se muestra, así que es el lugar correcto. De paso,
`reverberacion` se saca por completo de `componentesResumen`
(`main.ts`) y de `NombreComponenteEvaluacion`/`motor.componentes.nombre`
(`idioma/es.ts`+`en.ts`): mostrarla ahí con el texto genérico de "sin
datos suficientes... falta el dato del fabricante" habría sido falso —
nada falta, es una estimación declarada, no un hueco de catálogo. El
informe (`#s-documento`) sigue mostrando la tarjeta completa de
Reverberación igual que antes, directo desde `DatosSeccionesDocumento`,
sin pasar por `componentesResumen`.

Verificado extremo a extremo con Chrome headless sobre el build real: la
sala por defecto (KEF LS50 Meta + Rega Brio) muestra "Modos agrupados"
(1 par, por debajo de 150 Hz) y la tarjeta de Reverberación con badge gris
"Estimado, no medido", el rango "≈0,5 s a ≈1,5 s" y el desglose
estructura+contenido en el detalle técnico — sin errores de consola; el
informe (Sonus Faber Lumina II + Rega Brio) muestra la sección de
Reverberación completa y un resumen que ya no la cuenta ("De 2
componentes evaluados", no 5 como antes). **325 tests totales** entre los
4 workspaces (antes 318): 145 en `packages/engine` (antes 139 — suben
`reverberacion.test.ts`/`modos.test.ts`/`veredicto.test.ts`), 149 en
`apps/web` (antes 148, más el vector de sala reescrito en
`curvamodal.test.ts`).

**Límite de dominio de Sabine/Eyring, y una nota al pie que separa "todavía
no medido" de "el fabricante no publica este dato" — feedback directo tras
revisar la ronda del bloque de sala, con el argumento correcto: un clamp
numérico no es lo mismo que un límite físico.** El commit anterior había
agregado `ALPHA_EYRING_MAX=0,9999` para evitar `NaN` cuando ᾱ (con el
término de contenido sumado) superaba 1 — matemáticamente necesario, pero
insuficiente: Sabine y Eyring asumen los dos un campo sonoro difuso
(energía rebotando muchas veces antes de absorberse), y esa condición deja
de sostenerse mucho antes de ᾱ=1 — en el rango de 0,7-0,8, la energía se
absorbe en uno o dos rebotes, no hay campo difuso que promediar. Un clamp
cerca de 1 evitaba la excepción pero seguía devolviendo un RT60 de un
modelo que, físicamente, ya no describía la sala — exactamente el mismo
argumento que ya había justificado retirar el veredicto ok/con-reparos del
RT60 unas rondas antes, esta vez aplicado al número en sí, no sólo a su
semáforo.

`ALPHA_CAMPO_DIFUSO_MAX=0,8` (`packages/engine/src/reverberacion.ts`,
criterio del sitio en el rango que informa la literatura, no una cifra
única publicada) reemplaza el clamp: por encima de ese ᾱ, la banda no
reporta RT60 (`rt60S: null`, `metodo: 'fuera-de-dominio'`) — con el
chequeo de dominio cortando *antes* de evaluar el logaritmo de Eyring, el
`NaN` que motivó el clamp original ya ni siquiera es alcanzable, así que
el fix reemplaza al anterior en vez de sumarse. `rt60Final()` no promedia
a medias: si 500 Hz o 2000 Hz es `null`, el resultado completo es `null`
— fabricar una cifra con la mitad de los datos sería peor que no dar
ninguna. `codigo` gana `'rt60-fuera-de-dominio'` (junto al ya existente
`'rt60-estimado'`), y `frecuenciaSchroederHz` también cae a `null` en ese
caso — `techoModosDesdeSchroeder(null)` cae a su techo por defecto
(`TECHO_MODOS_HZ`) en vez de inventar un número. La tarjeta, en ese
estado, no muestra ningún rango: un párrafo propio (`textoFueraDeDominio`)
explica que ni Sabine ni Eyring aplican ya, y refuerza más todavía la
invitación a medir — acá el modelo genuinamente no tiene alternativa
mejor. Vector real que dispara el caso: la sala por defecto con
`panelAcustico` en los 4 muros + techo y `alfombra` en el piso da ᾱ≈0,97
a 2000 Hz en el escenario amoblado. 13 tests en `reverberacion.test.ts`
(reescritos, no sólo agregados — el vector que antes probaba el clamp
ahora prueba el límite de dominio) más 4 nuevos en `resultado.test.ts`
(es/en, verificando que `modeloReverberacion` arma el texto/calc propios
del caso `null`, no una versión rota del texto normal).

**La segunda mitad del feedback: la mitad de las tarjetas del análisis
pueden terminar en gris, y "sin datos" no siempre significa lo mismo.**
Con amortiguamiento siempre `sin-datos` (el catálogo no tiene el factor
de amortiguamiento poblado en ningún amplificador — ver la sección de
`amortiguamiento.ts` más arriba), más carga cuando el parlante no publica
impedancia mínima, más puente/recorrido cuando la fuente no trae ficha, un
análisis típico puede fácilmente tener 2-3 tarjetas ocultas sin ninguna
explicación visible en `#s-results` — antes de esta ronda, esas tarjetas
simplemente desaparecían (`pintarCarga`/`pintarGanancia`, `.hidden`) sin
dejar rastro en la pantalla de resultado en vivo, y la sección "Sin datos
suficientes" que sí las explica sólo vive en el informe (`#s-documento`,
no conectado a ningún botón visible hoy). El diagnóstico correcto: eso no
es lo mismo que el RT60 de la tarjeta de Reverberación. RT60 dice
"todavía no medido" — el usuario puede resolverlo esta tarde con el
teléfono, es una invitación. Un factor de amortiguamiento no publicado
dice "el fabricante no publica este dato" — el usuario no puede hacer
nada, es un límite del catálogo. Confundir las dos bajo el mismo gris
genérico hace que la página se lea como rota, no como rigurosa.

El arreglo no fue traer de vuelta la vieja tarjeta "Sin dato" (retirada a
propósito hace varias rondas — CLAUDE.md ya documentaba por qué: "no
puede seguir generando análisis con componentes sin su información") ni
la sección completa "Sin datos suficientes" (demasiado peso visual para
lo que es). `modeloNotaSinDatos()` (nuevo, `resultado.ts`) arma **una
frase corta**, reusando exactamente los mismos componentes `'dim'` que ya
filtraba `componentesResumen` — nombres unidos con `listaY()` (mismo
`Intl.ListFormat` que ya usa `modeloVeredicto` para los grupos del
veredicto), nunca una lista de tarjetas. Vive en un `<p class="src
nota-sindatos">` nuevo al pie de `#s-results` (después de "La cadena y
los datos de sala", antes del footer genérico del sitio) — reusa la
tipografía chica y apagada de `.src` (la misma que ya usan las cajas
"Fórmula:" de cada tarjeta), con un separador propio (`.nota-sindatos`,
mismo patrón `border-top` que `.ficha-final`). Sólo aparece cuando hay al
menos un componente sin dato — vacía, se oculta entera, mismo principio
de "nunca una confirmación vacía" que ya regía `sinDatosHtml`.
Deliberadamente **no** incluye reverberación (que nunca entra a
`componentesResumen` desde la ronda anterior) — mostrarla ahí con el
texto genérico "el fabricante no publica este dato" habría sido falso: a
reverberación no le falta nada, es una estimación declarada. 6 tests
nuevos en `resultado.test.ts` (vacía sin componentes `dim`, junta nombres
con "y", singular sin conjunción, declara explícitamente que no es un
problema del sistema, inglés sin mezclar idiomas). Verificado con Chrome
headless sobre el build real: KEF LS50 Meta + Rega Brio (sin streamer ni
dac) muestra "Datos que el fabricante no publica: Amortiguamiento." al
pie de la página, sin tocar el resto del layout ni la tarjeta de
Reverberación (que sigue con su propio "Estimado, no medido" o "No se
puede estimar", intactos). 334 tests totales entre los 4 workspaces
(antes 325): 147 en `packages/engine` (antes 145), 156 en `apps/web`
(antes 149).

**"Que mover los parlantes cambie la física, no sólo el dibujo" — cinco
cambios sobre colocación de parlantes y punto de escucha, con una
excepción aprobada a "no tocar potencia.ts".** El editor del plano ya
calculaba 8 caminos reflejados (lateral/trasera/piso/techo × 2 canales)
pero sólo los dibujaba; mover un parlante sólo tocaba
`distanciaEscuchaM` y el cruce geometría↔modo del oyente. El detalle
completo de fórmulas y vectores está en `docs/motor-mvp.md` sección
4quater; acá el resumen de qué cambió y por qué.

**Cambio 1 (`sala.ts`):** la reflexión del muro FRONTAL (detrás de cada
parlante, el SBIR clásico) nunca se calculaba — sólo la trasera (detrás
del oyente). Mismo método de imagen especular que las demás, reflejando
por `y=0`. **Cambio 2 (`modos.ts`, `evaluarAcoplamientoModal`):** la
misma forma cos(nπy/L) que ya usaba el nulo de escucha, aplicada a la
posición del PARLANTE — una fuente en un nodo de presión de un modo
casi no lo excita. Se pliega en la tarjeta "Modos de sala" existente
(3 señales: agrupamiento, nulo, acoplamiento — peor-de-las-3 para la
severidad; agrupamiento+nulo conserva su texto dedicado, cualquier
combinación con acoplamiento usa un titular genérico "N problemas" en
vez de una matriz de 8 combinaciones, el aviso sigue concatenando el
detalle completo). **Cambio 3 (`colocacion.ts`, módulo nuevo,
`evaluarFiltroPeine`):** cada una de las 5 reflexiones × 2 canales
interfiere con el directo — nulo en `c/(2Δ)` — ponderado por la
absorción real de esa superficie (sin eso, la regla marcaría aviso en
cualquier sala). Con los materiales por defecto del sitio, sólo el piso
da `warn` — hallazgo real: ningún material de piso del catálogo absorbe
lo suficiente a 125 Hz. **Cambio 4 (`colocacion.ts`,
`evaluarAsimetria`/`evaluarAnguloEscucha`):** asimetría entre canales
(directo + 5 reflexiones) y ángulo del triángulo de escucha contra la
convención de 60°, con un hallazgo documentado y no corregido: la
disposición automática de este sitio da **siempre** ≈45,24° en
cualquier sala (consecuencia del factor 1,2 de `filaEscuchaM`, nunca
declarado en función del ángulo) — no es un error, se declara en vez de
corregirse en silencio. Las dos señales se pliegan en una tarjeta nueva,
"Triángulo de escucha". **Cambio 5 (`sala.ts`,
`calcularDisposicionAsientoManual`):** el "candado" del punto de
escucha — cerrado (default) deriva el asiento de los parlantes como
siempre; abierto, el asiento se arrastra de forma independiente. Con el
asiento libre, los parlantes dejan de ser necesariamente equidistantes
del oyente, así que `potencia.ts` cambió: `evaluarPotencia` recibe dos
distancias (izq/der) y suma los canales como fuentes descorrelacionadas
(`10·log₁₀(10^(L1/10)+10^(L2/10))`) en vez del `SUMA_PAR_DB=3` fijo —
en el caso simétrico da 3,0103 dB, 0,0103 dB sobre el valor redondeado
anterior, sin regresión en ningún vector (tolerancia del proyecto:
0,05 dB). Esta fue la única excepción a "no tocar potencia.ts" de la
instrucción original — confirmada explícitamente antes de tocar código
vía pregunta directa al usuario.

**Candado en la UI:** un botón en la fila de controles del plano: abierto
vuelve arrastrable el punto dulce en vista Superior (mismo patrón que
los parlantes) y dibuja la posición simétrica de referencia como
marcador punteado. Abrir nunca mueve el asiento; cerrar no borra la
posición arrastrada (`asientoManualGuardado` en `main.ts` sobrevive al
ciclo cerrado→abierto). El estado de candado viaja en cada
`SnapshotAnalisis`; si "Análisis original" (siempre cerrado) y
"Modificado" difieren, un aviso declara que la diferencia entre pestañas
puede deberse al método, no sólo a la posición. **Bug real encontrado
recién en la verificación end-to-end:** "Recalcular" exigía un parlante
arrastrado (`disposicionManual`) para no ser un no-op — mover sólo el
asiento dejaba esa variable en `null`, así que Recalcular no hacía nada
pese al arrastre visible en la vista previa; corregido para que también
proceda con el candado abierto solo. Verificado con Chrome headless real
(CDP crudo, sin Puppeteer): selects marca→modelo, Analizar, vista
Superior, apertura de candado (asiento arrastrable + referencia
punteada dibujadas), arrastre sintético del asiento, Recalcular
(pestaña "Modificado" con "Triángulo asimétrico"), aviso de candado en
ambas pestañas, y el ciclo cerrar→reabrir restituyendo el grupo
arrastrable — sin errores de consola en ningún paso.

**395 tests totales** entre los 4 workspaces (antes 334): 187 en
`packages/engine` (antes 147 — suben `sala.test.ts`/`modos.test.ts`/
`colocacion.test.ts` nuevo/`potencia.test.ts`/`veredicto.test.ts`), 16
en `packages/data`, 15 en `packages/contact`, 177 en `apps/web` (antes
156 — suben `resultado.test.ts`/`plano.test.ts`).

**Jerarquía de la página de resultado — de once tarjetas planas a
veredicto → tres estados → evidencia plegada por grupo, sin tocar una
sola regla del motor.** Pedido explícitamente como ronda de interfaz:
"si algo parece necesitar un cambio en `packages/engine`, detente y
pregunta en vez de hacerlo" — no hizo falta, ningún archivo de
`packages/engine` se tocó. El único `<details class="detalle-evidencia">`
que envolvía las 8 tarjetas físicas en una lista plana se reemplaza por
**tres acordeones de grupo** (`grupo-potencia`/`grupo-acople`/
`grupo-sala`, clase `.grupo-evidencia` — mismo tratamiento "no-tarjeta"
que el `<details>` que reemplazan, para no subir el conteo de tarjetas
visibles), uno por estado del veredicto — "la evidencia se pliega bajo
el estado que le corresponde" — con las 10 reglas físicas repartidas
entre los tres (Potencia: 1; Acople eléctrico: hasta 6, carga/
amortiguamiento/puente×2/recorrido×2; Sala: 4, modos/filtro peine/
triángulo de escucha/reverberación). El summary de cada acordeón
reutiliza exactamente los mismos `ModeloEstadoGrupo` (`estadoTexto`/
`detalleTexto`) que ya pinta la grilla "Tres estados" de la tarjeta de
veredicto (`pintarGrupoResumen`, nueva función en `pintar.ts`, llamada
desde el mismo `pintarVeredicto` que ya recibía ese dato) — una sola
fuente de verdad, pintada en dos lugares, cero redacción nueva.

**Cada regla física deja de ser una tarjeta con marco propio
(`.card`) y pasa a ser una fila (`<details class="regla-fila">`, mismos
ids que antes en `card-carga`/`card-amortiguamiento`/etc. — el mecanismo
de ocultar por `sinDatos` de `pintarCarga`/`pintarGanancia` sigue
funcionando sin cambios porque sólo togglea `.hidden` sobre el mismo
id).** Colapsada: nombre a la izquierda, severidad + un "dato" numérico
en monoespaciado a la derecha (`.fila-dato`). Expandida: el mismo
contenido de siempre (simple/técnico/calc/aviso/fuente/gráficos),
reempaquetado sin recortar — los selectores `.card p`/`.card h4`/etc. se
extendieron a `.regla-fila` en vez de duplicarse. El "dato" de cada fila
no es texto nuevo del motor: son 8 funciones puras nuevas en `main.ts`
(`datoPotencia`/`datoCarga`/`datoAmortiguamiento`/`datoPuente`/
`datoRecorrido`/`datoModos`/`datoFiltroPeine`/`datoTriangulo`/
`datoReverberacion`) que sólo re-muestran un número que la regla ya
calculó — mismo principio que `ComponenteResumen.detalle`, que ya hacía
esto para potencia/puente/recorrido antes de esta ronda. `datoCarga`
prioriza EPDR sobre la impedancia mínima citada cuando está disponible
(más decisivo); `datoModos` prioriza la frecuencia del nulo de escucha,
después la del par agrupado de menor frecuencia, después el % de
acoplamiento del peor modo — el primero que aplique.

**Filtro peine: diez filas es ruido, no evidencia — recorte a 3, con
"Ver las diez" para la transparencia completa.** `ModeloTarjetaFiltroPeine`
gana `calcHtmlTodas` (las 10 combinaciones completas, sin cambios) junto
al `calcHtml` ya existente, que ahora se recorta a
`TOP_N_FILTRO_PEINE=3` — peor severidad primero y, dentro de la misma
severidad, la superficie más reflectante primero (coeficiente de
absorción más bajo, "ya ponderada por absorción"; `Array.prototype.sort`
es estable, así que los empates conservan el orden original). Si ninguna
de las 10 combinaciones supera el umbral, `calcHtml` es una sola línea
declarando que ninguna reflexión cae en zona problemática — información,
no ausencia de ella — en vez de mostrar 3 filas "ok" sin valor. La
tarjeta anida un segundo `<details>` ("Ver las diez",
`resultado.plano.verLasDiez`) con `calcHtmlTodas` detrás.

**Botón "i" dentro de un `<summary>` — bug de un solo click, encontrado
al verificar, no al escribir el HTML.** Cada fila de evidencia (y cada
acordeón de grupo) es ahora un `<details>`, y varios `.infobtn` viven
adentro de su `<summary>` (para poder verse en el estado colapsado) —
sin `preventDefault()`, un click en el botón "i" abre el popup de info
**y** togglea el acordeón a la vez, porque el navegador interpreta
cualquier click dentro de un `<summary>` como "abrir/cerrar" salvo que
se lo prevenga explícitamente. El listener de `.infobtn[data-info]` en
`main.ts` gana `ev.preventDefault(); ev.stopPropagation();` antes de
abrir el popup — verificado con Chrome headless que el click abre el
popup sin togglear la fila.

**Decisión pendiente resuelta — Opción B: 45° declarado como criterio
propio del sitio, sin tocar `colocacion.ts`.** La disposición automática
de este sitio da siempre ≈45,24° (factor 1,2 de `filaEscuchaM`, ver
sección "Colocación" más arriba), no 60° (la convención de triángulo
equilátero estéreo) — mostrar sólo "60°" como referencia hacía que el
sitio se leyera como si estuviera fallando su propia convención en
**todos** los análisis por defecto. Opción A (mover el factor 1,2 para
que el default caiga en 60°) es un cambio de motor —mueve vectores de
`sala.test.ts`/`modos.test.ts`— y quedó descartada a propósito por el
propio pedido ("si eliges esta, detente y confírmalo"); se implementó
la **Opción B**, explícitamente "texto, no código": `colocacion.ts` no
se tocó — `ANGULO_ESCUCHA_CONVENCION_GRADOS` sigue en 60, el umbral de
severidad (`ANGULO_ESCUCHA_MIN_GRADOS`/`MAX_GRADOS`, 40°-65°) tampoco
cambió. Sólo `resultado.ts` gana una constante local nueva,
`ANGULO_REFERENCIA_SITIO_GRADOS=45` (comentada como decisión de texto,
no de física), que `modeloTrianguloEscucha`/`motor.triangulo.texto`/
`.fuente` citan explícitamente como "la disposición de referencia de
este sitio", aparte de la convención de 60° — las dos declaradas, ninguna
escondida, y el sitio deja de leerse como si incumpliera su propio
criterio. `info.triangulo.cuerpoHtml` (la guía) se actualizó con la
misma explicación.

**"Chequeo aparte" pedido explícitamente tras el bug de Recalcular de la
ronda anterior — no apareció ningún otro caso silencioso.** Se recorrió
en Chrome headless: cambiar género, nivel de escucha y un material antes
de "Analizar" (funcionan como siempre — sólo toman efecto en el próximo
"Analizar", no hay recálculo en vivo que romper ahí); y, ya en la
pantalla de resultado, abrir el candado **sin arrastrar nada** y
"Recalcular" — crea y activa la pestaña "Modificado" correctamente
(`recalcular()` ya lo cubría desde el fix de la ronda anterior, que
proceder con el candado abierto solo, sin exigir además un parlante
arrastrado). Cero errores de consola en todo el recorrido.

**Verificado extremo a extremo con Chrome headless (CDP crudo):** el
conteo de tarjetas visibles sin expandir nada se midió ANTES de tocar
código (baseline real: 3 — veredicto, "Qué conviene hacer", geometría) y
se volvió a medir después del cambio completo — **sigue en 3**, cumple
el guardarraíl explícito ("si al terminar no bajó respecto de la cuenta
inicial, la pasada no sirvió"). Los tres acordeones de grupo pintan
severidad+línea reales desde el primer render; abrir un grupo y una fila
revela el contenido completo; el botón "i" no togglea su fila; Filtro
peine recorta a 3 y "Ver las diez" trae las 10; la fila de reverberación
lleva la clase `regla-dim` (tratamiento visual distinto de "warn", nunca
ámbar). **397 tests totales** entre los 4 workspaces (antes 395): 179 en
`apps/web` (antes 177 — suman tests de truncamiento de filtro peine y de
la cita explícita de 45° en `fuenteHtml`).

**Cinco equipos nuevos — Accuphase, Gold Note, Wilson Benesch — y un
descarte documentado de Conrad-Johnson.** Catálogo a **143 equipos** (39
parlantes + 39 amplificadores + 30 streamers + 32 dacs + 3 cables, antes
138): **Wilson Benesch Horizon** (parlante, columna compacta de chasis
monocasco de fibra de carbono, medio de 17 cm acoplado directo al
amplificador sin filtro pasivo — 89 dB/2,83 V/1 m, 6 Ω nominal/4 Ω
mínima, todas del mismo fabricante y consistentes entre los tres modelos
de su gama actual consultados); **Accuphase E-380** (integrado, 120 W/
8 Ω · 180 W/4 Ω, factor de amortiguamiento 500 a 8 Ω/50 Hz — de los más
altos del catálogo) y **Accuphase DC-1000** (DAC insignia, 8× ES9038 PRO
en paralelo por canal, 2,5 V/50 Ω idéntico en RCA y XLR); **Gold Note
IS-1000 MkII Deluxe** (integrado italiano de alta corriente con DAC/
phono/streamer propios, evaluado sólo como amplificador — 125 W/8 Ω ·
250 W/4 Ω) y **Gold Note DS-10 EVO** (DAC/streamer de red, 2,0 V/50 Ω
igual en RCA que en XLR, sin refuerzo balanceado a diferencia de otros
equipos de este catálogo).

**Conrad-Johnson quedó fuera a propósito, no por falta de investigar.**
Se relevaron las fichas oficiales de su lineup completo de amplificación
actual — CAV-60 (el único "control amplifier"/integrado de la marca),
ART27A, Classic Sixty-Two/62SE, Classic One-Twenty/120SE — y **ninguno
publica una potencia a 8 Ω**: la convención de la marca es citar la
potencia únicamente al tap de 4 Ω del transformador de salida (con 8/16 Ω
disponibles como conexión alternativa, sin cifra propia). `potencia8OhmW`
es un campo no-nulo del esquema (`AmplificadorCat`, `tipos-catalogo.ts`)
— completarlo con la cifra de 4 Ω habría hecho pasar un dato de otra
carga como si fuera el de 8 Ω, y dejarlo en un valor inventado viola la
misma disciplina que ya regía el resto del catálogo. Conrad-Johnson
tampoco fabrica parlantes, streamers ni DACs, así que no hay una
categoría alternativa donde encajarlos limpiamente. Se optó por no
forzar una entrada en vez de comprometer la disciplina de "nunca
inventes un dato" — mismo principio que ya regía, aplicado por primera
vez a una marca completa en vez de a un campo suelto.

**AR anclada (WebXR + hit-test): "Ver en AR" muestra las reflexiones ya
calculadas superpuestas sobre la sala real, sólo en Chrome/Android —
pedido explícito con las limitaciones conocidas y aceptadas de
antemano.** Analizado primero como pregunta abierta ("¿es viable AR
mostrando esto en la sala real desde el teléfono, sin instalar una
app?"): el motor ya tenía toda la geometría 3D necesaria
(`packages/engine/src/sala.ts`, `DisposicionSala`, en metros, origen en
la esquina frontal-izquierda del piso) sin ningún cambio — el problema
real no era de tecnología, era de **anclaje**: el motor no sabe dónde
está la sala real en el espacio, sólo conoce las dimensiones que el
usuario tipeó. AR con la cámara ANCLADA de verdad (el usuario toca la
pantalla para fijar un punto real) exige seguimiento 6DoF —
WebXR `immersive-ar` con hit-test, que **sólo existe en Chrome/Android
(ARCore)**; Safari/iOS no implementa WebXR AR inmersivo, ninguna versión
actual, sin indicio de que vaya a cambiar. Se presentó la alternativa
más barata y compatible con todo (una vista 3D navegable sin cámara,
sin problema de anclaje) como recomendación por defecto; el usuario, ya
informado de que la opción "real" excluye a la mitad del mercado de
teléfonos, eligió construir igual la AR anclada de verdad.

**Página separada `ar.html`, nunca inlineada — la única forma de
que `three.js` no entre al bundle que abre por `file://`.**
`apps/web/vite.ar.config.ts` (config de Vite propio, sin
`vite-plugin-singlefile`, `emptyOutDir:false`) construye `ar.html` como
segundo paso del script `build` (`vite build && vite build --config
vite.ar.config.ts && node scripts/verificar-build.mjs`) — no hay
conflicto doctrinal en que dependa de red: AR nunca puede funcionar por
`file://` de todos modos (necesita cámara + permisos + ARCore).
`verificar-build.mjs` (que sigue revisando sólo `dist/index.html`, sin
tocar su lógica) suma un canario: falla si `index.html` llega a
contener `'immersive-ar'` o `THREE.` — detecta en el build, no por el
tamaño del archivo, si algún import futuro de `src/main.ts` hacia
`src/ar/**` con dependencia de `three` se cuela por error. Confirmado:
`dist/index.html` creció de 516 KB a 522 KB (el botón + los textos
nuevos, nada de `three`); `dist/ar.html` es un HTML de 3,6 KB con su
propio JS de ~643 KB (three.js + la lógica de AR), servido aparte.

**Calibración de 2 toques sobre el piso, no piso+pared — resuelve la
ambigüedad de orientación con la dirección de mirada de la cámara.**
`apps/web/src/ar/anclaje.ts` (puro, sin `three`, sin DOM, 8 tests):
toque 1 fija el origen (esquina real frontal-izquierda), toque 2 marca
otro punto del piso a lo largo de la pared frontal → define el eje
"ancho"; la ambigüedad de las dos perpendiculares candidatas para
"hacia el fondo de la sala" se resuelve con el producto punto contra la
dirección de mirada de la cámara en el instante del segundo toque —
declarado explícitamente en la instrucción de calibración ("parado
dentro de la sala, mirando hacia el fondo"), no asumido en silencio.
Toques prácticamente coincidentes usan un eje X de emergencia declarado
(mismo criterio defensivo que ya usa `puntoDulceDesdeParlantes` en
`sala.ts`) — nunca `NaN`.

**`apps/web/src/ar/geometriaAr.ts`** (puro, 8 tests) traduce una
`DisposicionSala` ya anclada a segmentos/puntos en el mundo real —
mismos elementos que ya dibuja `plano.ts` (cubo de sala, triángulo de
escucha, 8 reflexiones, omitiendo las de un muro `'vacio'`; lógica de
omisión duplicada a propósito desde `plano.ts`, no extraída a un
helper compartido — alcance de esta ronda) con el mismo principio
"wireframe honesto, sin fingir opacidad". **`escenaThree.ts`** es el
único módulo que importa `three` — arma el `THREE.Group` con la misma
paleta que ya usa `plano.ts` (dorado para reflexiones, blanco para
parlantes/punto dulce), esferas chicas (no volúmenes fingidos) y
etiquetas de texto vía sprites con textura de canvas 2D.

**Handoff de datos por query string, no `sessionStorage`.**
`apps/web/src/ar/estadoUrl.ts` (puro, 8 tests): codifica sala +
posición de parlantes/asiento + banderas de muro vacío (booleano, no el
`MaterialMuro` completo — geometriaAr.ts sólo distingue vacío/no vacío)
en claves cortas; decodificación defensiva — cualquier campo
ausente/`NaN`/fuera de rango devuelve `null`, nunca tira (mismo
criterio que ya declara `calcularDisposicionManual`: el motor no
confía ciegamente en coordenadas externas). Del lado de `ar.html`, la
reconstrucción siempre pasa por `calcularDisposicionAsientoManual` —
la AR nunca recalcula física por su cuenta, sólo ancla lo que
`sala.ts` ya calculó.

**Detección de soporte, mismo criterio que ya usa `enviarContacto` para
`file://`: declarar la limitación, nunca fallar en silencio.**
`apps/web/src/ar/soporte.ts` (puro, `navigator` recibido como
parámetro — nunca leído del global adentro — para poder testear con
`node --test`, 7 tests): chequeo síncrono barato
(`tieneNavigatorXr`) antes de navegar, y uno autoritativo async
(`soportaArInmersiva`, con try/catch — algunos navegadores rechazan la
promesa en vez de resolver `false`). El botón "Ver en AR"
(`#btn-ver-ar`, junto al candado en la tarjeta de Geometría) reusa el
mismo `<dialog id="info-popup">` de siempre para el mensaje de "no
soportado" cuando `file:` o sin `navigator.xr` — nunca navega a una
página muerta. `ar.html` repite el chequeo (defensa en profundidad, por
si alguien llega por bookmark) más el autoritativo antes de
`requestSession`.

**Sesión WebXR (`sesion.ts`, impura): retícula por hit-test contra el
piso, `select` sólo lee valores ya calculados en el loop de render, no
vuelve a pedir un `XRFrame` dentro del propio evento** (evita depender
de si `renderer.xr.getFrame()` es seguro de llamar fuera del loop de
animación, no está claramente documentado). `referenceSpace:
'local-floor'` da el eje vertical alineado con la gravedad real (IMU)
sin depender de una calibración propia. Overlay de texto por paso
(`ar.calibrandoPaso1/2/anclado`) vía callback — `sesion.ts` reporta
transiciones de estado, `entrada-ar.ts` escribe el texto localizado,
misma separación pura/impura que el resto del sitio.

**Verificado con Chrome headless (sirviendo `dist/` por HTTP local,
`file://` habría bloqueado por CORS el JS/CSS externos de `ar.html` —
esperado, esa página nunca corre por `file://` en producción):** click
en "Ver en AR" bajo `file://` abre el popup de "no soportado" sin
navegar; `ar.html` sin query string cae en el fallback de estado
inválido; con `navigator.xr` real de Chrome headless (que existe, pero
sin ARCore) cae en "no soportado" vía el chequeo autoritativo; con un
`navigator.xr` simulado que sí resuelve soporte, muestra los pasos y el
botón "Entrar en AR"; con `requestSession` rechazando (simula permiso
de cámara denegado), cae en el panel de error de sesión con el mensaje
real. Bilingüe confirmado. **Un hit-test real contra una superficie
real, con cámara y ARCore, no se puede simular con Chrome headless —
gate de QA manual en un Android+Chrome real, pendiente, antes de dar la
función por cerrada del todo** (mismo límite de verificación que ya
tuvo el arrastre táctil del plano en su momento). 428 tests totales
entre los 4 workspaces (antes 397): 31 nuevos en `apps/web`
(`anclaje.test.ts`, `geometriaAr.test.ts`, `soporte.test.ts`,
`estadoUrl.test.ts`).

**Pulido de UI pedido tras probar: flecha desplegable faltante en
`.regla-fila`, candado con ícono de líneas en vez de emoji, y dos mejoras
a la sesión de AR (líneas más gruesas + vista previa del muro frontal).**
Cuatro pedidos puntuales, sin relación entre sí más que "cosas notadas al
usar el sitio":

- **`.regla-fila` (las filas "Potencia frente a los picos de la sala",
  "Modos de sala", etc., dentro de los 3 acordeones de evidencia) no
  tenía flecha de "esto se despliega"** — sí la tenían ya `.grupo-
  evidencia`, `.detalle` y `.info-item` (mismo patrón: borde en L
  rotado 45°→225° al abrir). Hueco real, no una regresión — se sumó el
  mismo `::after` que ya usan las otras tres, con su propio `order` en
  el breakpoint mobile de 480px para que caiga junto al botón "i" en la
  fila apilada.
- **Candado: emoji 🔒/🔓 → ícono de líneas (Feather lock/unlock,
  `stroke="currentColor"`).** Un solo `<svg>` fijo en el botón con un
  `<path id="candado-shackle">` cuyo `d` cambia entre abierto/cerrado —
  `actualizarUiCandado()` (`main.ts`) dejó de tocar `btn.textContent`
  (que borraba el ícono) y pasó a escribir sólo en un `<span
  id="btn-candado-texto">` interno, más el `d` del shackle. Con
  `stroke="currentColor"`, el ícono hereda el mismo color que el texto
  del botón — incluido el cambio a `--warn` cuando está abierto
  (`.candado-btn[aria-pressed=true]`, ya existía), sin CSS de color
  nuevo. `resultado.plano.candadoCerrado`/`candadoAbierto` pierden el
  emoji del texto en los dos idiomas — el ícono ya lo comunica.
- **Líneas del cubo de AR más gruesas — con un hallazgo real detrás:
  `THREE.LineBasicMaterial.linewidth` no funciona en casi ningún
  hardware.** Es una limitación conocida y documentada de WebGL: el
  spec deja el grosor de línea como "puede ignorarse", y prácticamente
  todo lo que usa ANGLE (desktop) o un driver móvil típico (Android/
  Chrome/ARCore, el hardware exacto al que apunta esta función) lo
  ignora — quedaba en 1px real sin importar el valor pedido. Se
  reemplazó por `Line2`/`LineSegments2`/`LineSegmentsGeometry`/
  `LineMaterial` de `three/addons/lines/` (el enfoque estándar de
  three.js para grosor real: dibuja la línea como una cinta con shader
  propio) — necesita el tamaño del viewport en píxeles
  (`material.resolution`), por eso `construirGrupoThree()` ahora recibe
  una `Resolucion` como parámetro en vez de asumirla, y
  `actualizarResolucionLineas()` (nueva, recorre el grupo con
  `.traverse()`) se llama de nuevo en cada resize de `sesion.ts`. Sin
  esto último, rotar el teléfono habría dejado el grosor calculado para
  la resolución vieja. Verificado visualmente (no en AR real — ver
  "Falta" — sino renderizando la misma `construirGrupoThree()` con una
  cámara de prueba normal vía Chrome headless): las líneas del cubo se
  ven notoriamente más gruesas que antes.
- **Vista previa del muro frontal durante el segundo toque de
  calibración — para poder verificar el anclaje ANTES de confirmarlo,
  no después.** Hasta ahora, entre el toque 1 y el toque 2 no había
  ninguna señal visual de hacia dónde iba a quedar orientada la sala
  ancorada — recién se veía el resultado (bien o mal) después del
  segundo toque, con el único remedio de "Volver a calibrar" (recargar
  la página) si había quedado mal. `geometriaAr.ts` suma
  `construirPlanoFrontalPreview(sala, anclaje)` (puro, 2 tests): las 4
  esquinas del muro frontal ancladas, dado CUALQUIER anclaje —
  incluido uno todavía no confirmado. `sesion.ts` usa esto en el loop
  de render, mientras se espera el segundo toque: cada cuadro, si hay
  una superficie detectada bajo la retícula, trata esa posición como un
  "toque 2" tentativo, resuelve un anclaje de prueba, y actualiza un
  plano translúcido (dorado, opacidad 0,22, `DoubleSide`) con esas 4
  esquinas — un mesh creado una sola vez al arrancar la sesión
  (`construirPlanoFrontalPreviewMesh`) y actualizado in-place cuadro a
  cuadro (`actualizarPlanoFrontalPreviewMesh`, escribe directo el
  `BufferAttribute` en vez de recrear el mesh) para no alocar geometría
  nueva 60 veces por segundo. Desaparece al confirmar el segundo toque
  (lo reemplaza el wireframe completo ya anclado) y al perderse la
  superficie bajo la retícula. Verificado igual que las líneas gordas:
  visualmente vía Chrome headless con datos de prueba, no en sesión AR
  real.

**Primera prueba real en Android confirma el pipeline completo — y
encuentra un bug real de orientación en la calibración.** El usuario
probó "Ver en AR" en su teléfono y mandó una captura: la sesión WebXR
arrancó, el hit-test detectó el piso, los 2 toques calibraron, y el
wireframe (líneas gordas, etiquetas, todo) se dibujó anclado sobre la
cámara real — confirma que toda la mecánica de `sesion.ts` funciona de
punta a punta en hardware real, la primera vez que se pudo verificar
eso. Pero el resultado apuntaba "para el lado que no es" (confirmado
por el usuario entre varias opciones de síntoma) — el eje de
profundidad quedó mal orientado.

**Causa raíz: la mirada de la cámara en el instante del segundo toque
es una señal poco confiable — se reemplazó por la posición del
visor.** La versión anterior de `resolverAnclaje()` (`anclaje.ts`)
pedía "parado dentro de la sala, mirando hacia el fondo" y usaba la
dirección de mirada de la cámara en ese instante para elegir cuál de
las dos perpendiculares candidatas es "hacia el fondo". El problema:
para tocar un punto de piso pegado a la pared frontal, el usuario
naturalmente inclina el teléfono hacia abajo y hacia esa pared —
exactamente lo opuesto a "mirar hacia el fondo" — así que la señal
estaba rota justo en el momento en que se la necesitaba. Se reemplazó
por la **posición del visor** (`renderer.xr.getCamera().position`, no
su dirección): geométricamente, quien calibra está parado en algún
punto DENTRO de la sala durante todo el proceso, sin importar hacia
dónde apunte el teléfono en cada instante — un hecho mucho más estable
que no depende de que el usuario recuerde mirar en una dirección
particular mientras hace otra cosa con las manos.
`resolverAnclaje(toque1, toque2, posicionVisor)` ahora calcula la
dirección desde el punto medio de los 2 toques hacia esa posición, y
elige el candidato de `ejeProfundidad` más alineado con ella. Como
consecuencia, **la instrucción de calibración se simplificó** —
`ar.paso2`/`ar.calibrandoPaso2` dejan de pedir "mirando hacia el
fondo", ahora sólo "sin moverse de dentro de la sala" — un requisito
más fácil de cumplir sin querer, porque ya lo cumple cualquiera que
esté parado ahí calibrando. Los otros dos síntomas que mencionó el
usuario en el mismo momento ("queda flotando, no a nivel de piso" y
"probablemente un problema de escala") no se pudieron aislar como
bugs separados — el análisis geométrico no encontró una causa
independiente para ninguno de los dos (el origen del anclaje es
siempre exactamente el punto real tocado, sin offset vertical ni de
escala posible en `anclarPunto()`), así que quedan como posibles
consecuencias visuales del mismo eje mal orientado, a confirmar en el
próximo test real — no se inventó un segundo fix sin evidencia de un
segundo bug.

5 tests de `anclaje.test.ts` reescritos para el nuevo contrato
(posición del visor en vez de dirección de mirada) — mismos casos
cubiertos (elección de candidato, altura sin efecto, caso degenerado,
toques coincidentes), vectores nuevos. 430 tests, typecheck y build
verificados de nuevo tras el cambio.

**Segunda vuelta de hardware real: "mejoró bastante" — y una idea del
usuario que resultó en medición real de ancho/alto, no sólo un ajuste
cosmético.** El usuario probó de nuevo con la corrección de arriba y
mandó una foto: el wireframe ya queda razonablemente alineado con la
sala real. Sugirió, con sus propias palabras, aprovechar la esquina
derecha que ya se toca como referencia y sumar un toque en la esquina
superior derecha "para escalar y ajustar la altura" — pedido explícito
de evaluar la mejor forma de implementarlo.

**El ancho real sale gratis de los mismos 2 toques que ya existían — no
hacía falta un toque nuevo para eso.** Cambio de instrucción, no de
mecánica: el toque 2 pasa de "cualquier punto sobre el piso a lo largo
de la pared frontal (por ejemplo, la esquina...)" a **la esquina real
frontal-derecha**, sin la flexibilidad de "cualquier punto" — con eso
garantizado, la distancia entre los 2 toques (`medirAnchoM`, nuevo en
`anclaje.ts`) es una medición real del ancho de la sala, disponible en
el mismo instante en que se ancla, sin acción extra del usuario.

**La altura sí necesita un toque nuevo — pero opcional, no bloqueante.**
Un botón "Medir altura real" aparece recién después de anclar; al
tocarlo, se reactiva el hit-test (que en realidad nunca se cancela al
anclar — sólo se deja de reaccionar a sus resultados hasta que hace
falta de nuevo, así no hay que volver a pedirlo) y el próximo toque, en
la parte de arriba de la misma esquina donde la pared llega al techo,
da `medirAlturaM(toque1, toqueNuevo)` — la diferencia vertical entre el
toque de piso original y este. Opcional a propósito: hit-testing cerca
del techo es menos confiable que contra el piso (menos textura, ángulo
más forzado) y el flujo de 2 toques ya funciona razonablemente solo, no
convenía arriesgar la robustez del caso base por una mejora que no todos
van a necesitar.

**Ninguna medición se aplica sin pasar antes por un rango de sanidad
declarado** (`anchoMedidoValido`/`alturaMedidaValida`, 0,5–15 m y
1,5–5 m respectivamente — descartan un hit-test claramente erróneo, no
pretenden validar que la medida en sí sea exacta): si una medición cae
afuera, se mantiene la medida tipeada en la web para esa dimensión y un
aviso (`ar.medicionFueraDeRango`) lo declara — nunca un número sin
sentido aplicado en silencio, mismo principio de todo el sitio.

**Ancho y alto reales, cuando están disponibles, recalculan
`DisposicionSala` de verdad — no sólo estiran el dibujo.** Con un ancho
o alto medido, `sesion.ts` arma una `Sala` nueva (`{...sala, anchoM:
medido}` o `{...sala, altoM: medido}`) y vuelve a llamar a
`calcularDisposicionAsientoManual()` con las mismas posiciones de
parlante/asiento — así las reflexiones laterales/de techo (que sí
dependen de `anchoM`/`altoM`) quedan consistentes con lo que se dibuja,
en vez de un wireframe con un tamaño y una física con otro. La
profundidad (`largoM`) sigue sin medirse — sigue siendo la del análisis
tipeado en la web, declarado en `ar.avisoWireframeAproximado`
(reescrito para hablar sólo de la profundidad, ya que ancho y alto
pueden ser reales ahora).

`anclaje.ts` suma `medirAnchoM`/`medirAlturaM`/`anchoMedidoValido`/
`alturaMedidaValida` (4 tests nuevos, puros). `sesion.ts`:
`EstadoCalibracion` suma `'midiendo-altura'`; `iniciarSesionAr()` ahora
devuelve un `ControladorSesionAr` (con `medirAlturaReal()`) cuando la
sesión arranca bien, para que `entrada-ar.ts` cablee el botón sin que
`sesion.ts` tenga que conocer ningún id del DOM; nuevo callback
`onMedicion(info)` (ancho/alto medidos o `null`) además de
`onCambioEstado`. `entrada-ar.ts` distingue "todavía no se intentó
medir" de "se intentó y no dio un valor creíble" con un flag local
(`esperandoAltura`) — sin eso, el aviso de fuera-de-rango se dispararía
para la altura antes de que nadie tocara el botón. Verificado con
Chrome headless (sirviendo `dist/` por HTTP): las instrucciones nuevas
(paso 3) y toda la estructura del panel anclado (botón, líneas de
medición, aviso — todo oculto hasta que corresponde) están presentes y
bien formadas; el propio flujo de anclaje+medición con hit-test real
sigue sin poder probarse sin hardware. 434 tests totales (antes 430).

**Confirmado con hardware real: el ancho medido (automático) también
mejoró la altura sin siquiera usar el toque opcional** — reporte del
usuario tras la ronda anterior ("al medir los 2 primeros puntos la
altura es casi perfecta"), esperable ya que `dispActual` se recalcula
completo con `calcularDisposicionAsientoManual()` cuando el ancho
cambia, no sólo se estira el dibujo (ver más arriba) — la geometría de
techo/reflexiones ya se beneficia de eso aunque `altoM` en sí siga sin
medirse.

**Bug reportado en la misma ronda: "Volver al análisis" volvía a la
portada, no a la pantalla de resultado de la que salió quien entró a
AR.** Causa directa: los 4 links "← Volver al análisis" de `ar.html`
eran `<a href="/">` — cualquier click recargaba el sitio entero desde
cero, perdiendo el equipo elegido y el análisis ya calculado (todo vive
en memoria de `main.ts`, no en la URL). Se cambiaron a `<button
class="back volver-analisis">` cableados a una función nueva en
`entrada-ar.ts`: si `document.referrer` es del mismo origen (el caso
real siempre, ya que `irAVerEnAr()` en `main.ts` llega acá con
`location.href = 'ar.html?...'` desde la propia pantalla de resultado,
nunca en pestaña nueva), usa `history.back()` — el navegador restaura
la página anterior completa vía bfcache, sin recalcular nada; si no
(entrada directa por marcador/enlace externo, sin nada real atrás), cae
al mismo `location.href='/'` de siempre. Verificado con Chrome headless
navegando de verdad desde `index.html` (no con `Page.navigate`, que no
fija `document.referrer`): el click en "Volver al análisis" devuelve
efectivamente a `index.html`. 434 tests sin cambios (fix de navegación
puro, sin lógica nueva testeable con `node --test`).

**Gold Note IS-10 — catálogo a 144 equipos (40 amplificadores).** Integrado
italiano compacto (chasis de medio ancho) que combina streaming, DAC
AKM AK4493 y etapa de potencia en un solo aparato — la otra mitad del
combo IS-10/PA-10 EVO junto a la Gold Note DS-10 EVO ya catalogada.
Potencia (90 W/8 Ω · 140 W/4 Ω) de la ficha oficial (goldnote.it), con
confianza alta. **Caso de interés: el factor de amortiguamiento es
autoajustable por diseño, no una cifra fija que falte publicar** — dos
reseñas independientes (Soundnews.net, Hifi Chicken) lo describen así
("self-adjustable damping factor... depending on the connected load");
`factorAmortiguamiento` queda en `null` con un `pendiente` que declara
explícitamente que no es un dato faltante, es una característica de
diseño — mismo criterio que ya aplicaba a la Gold Note IS-1000 MkII
Deluxe con su amortiguamiento ">100" sin cifra exacta, llevado un paso
más allá acá (ni siquiera hay una cifra que redondear). La clase de la
etapa de potencia tampoco la declara el fabricante en su ficha —
Class D según ambas reseñas, con matices distintos entre ellas (una
dice "ajustada para sonar más cerca de Clase B/AB", la otra describe un
previo Clase A) — se citan las dos en vez de elegir una sola
caracterización como si fuera la oficial. Sensibilidad e impedancia de
entrada de línea, y carga mínima de parlante, tampoco se encontraron
publicadas. 16 tests en `packages/data` (conteo actualizado, sin tests
nuevos — el lint de separador decimal y el resto de las reglas
genéricas ya cubren un equipo más automáticamente). Verificado en el
sitio real (Chrome headless): aparece en el selector marca→modelo de
Gold Note en su posición alfabética (antes de IS-1000 MkII Deluxe), con
los chips y la descripción correctos al elegirlo.

**Filtro peine: "Piso (izquierdo)" confundía — el usuario preguntó si en
realidad era un muro mal etiquetado, y el texto acompañante no explicaba
nada en palabras simples.** Dos problemas reales, no uno:

1. **"(izquierdo)/(derecho)" nombra el parlante de origen del camino
   reflejado, nunca un lado de la superficie** — pero el piso y el
   techo no tienen lado, así que "Piso (izquierdo)" leía como si el
   piso tuviera una mitad izquierda. `motor.filtroPeine.canalIzq/
   canalDer` (`es.ts`/`en.ts`) pasan de `'izquierdo'`/`'derecho'` a
   `'parlante izquierdo'`/`'parlante derecho'` — mismo cambio aplicado
   a las 5 superficies por igual (incluida "Lateral", donde ya
   coincidía con un lado físico real, para no tener dos convenciones
   distintas según la superficie).
2. **La frase que el usuario vio ("Piso (izquierdo): primer nulo en
   ≈250 Hz.") se muestra SOLA, sin el `simpleHtml`/`textoHtml` de la
   tarjeta como contexto, dentro de "Qué conviene hacer"**
   (`modeloRecomendacionesTop`, arriba de la página) — confirmado
   leyendo `main.ts`: ese bloque arma cada recomendación con
   `avisoHtml` puro, nunca junto al texto simple. `motor.filtroPeine.
   avisoFila` se reescribió para ser autocontenida: en vez del dato
   crudo, ahora explica el mecanismo y el efecto audible en la misma
   frase ("el reflejo llega justo a tiempo para cancelar parte del
   sonido directo cerca de ≈X Hz — un bache angosto de timbre ahí, más
   notorio en voces e instrumentos, no una pérdida de volumen
   general"). `simpleOk`/`simpleWarn` (el texto italic dentro de la
   tarjeta expandida) también se reescribieron: usaban "nulo de peine"/
   "zona audible" sin traducir nunca esa jerga a lenguaje llano — ahora
   describen el mismo efecto ("cancela una frecuencia en la zona donde
   más se nota la voz") sin nombrar el término técnico como si ya
   estuviera explicado en otro lado.

Un test existente (`resultado.test.ts`) esperaba el patrón viejo
`/Piso \(izquierdo\)/` — actualizado al nuevo. 216 tests sin cambios de
cantidad. Verificado en el sitio real (Chrome headless): "Qué conviene
hacer" ya trae el texto autocontenido nuevo sin necesidad de expandir
la tarjeta, y la tarjeta expandida muestra "Piso (parlante izquierdo)"
consistente en `simple`/`calc`/`flag`.

**AR en iPhone: AR Quick Look, con la calibración de Android intacta —
pedido tras analizar por qué ni iPhone ni PC pueden tener la AR anclada
real, y elegir explícitamente perseguir Quick Look de todos modos.**
Análisis previo (documentado en el plan de esta ronda): WebXR
`immersive-ar` no existe en ningún Safari de iOS (nunca lo va a tener,
no es falta de esfuerzo), y PC no tiene ningún concepto de "cámara de
ambiente" expuesto a la web en ningún sistema operativo de escritorio —
ahí no hay AR posible, punto. La única AR real posible en iPhone sin
instalar una app es **AR Quick Look** (`<a rel="ar" href="modelo.usdz">`,
el visor nativo de Apple), con dos límites que el usuario aceptó
conscientemente antes de pedir la implementación: (1) es una caja negra
— la página nunca se entera de cómo el usuario colocó/escaló el modelo,
así que **no hay equivalente posible de la calibración de 2 toques ni
de la medición real de ancho/alto** que sí tiene Android; (2) necesita
un archivo USDZ.

**Hallazgo que abarató la implementación real, encontrado durante la
investigación (no asumido de entrada): `three.js` ya trae un exportador
USDZ 100% del lado del cliente.** La suposición inicial (conversión
GLB→USDZ del lado del servidor, una segunda función serverless) resultó
innecesaria — `three/addons/exporters/USDZExporter.js` (ya en el
paquete `three` instalado para la AR de Android) genera el USDZ
directo en el navegador vía `parseAsync()`. **Pero tiene un límite real
que sí cambió el diseño**: revisando su código fuente, sólo procesa
objetos `.isMesh` — no exporta `LineSegments2` (las líneas gordas de
`escenaThree.ts`) ni `THREE.Sprite` (las etiquetas de distancia), que
es justo cómo está armada la escena de Android. Hizo falta un builder
de malla aparte.

`apps/web/src/ar/escenaMalla.ts` (nuevo) construye un `THREE.Group` de
**tubos** (`THREE.CylinderGeometry` orientado entre dos puntos, vía
cuaternión) en vez de líneas, y esferas (`MeshStandardMaterial`, con
`emissive` propio — Quick Look ilumina con su entorno, sin garantía de
que alcance) en vez de las de `escenaThree.ts` — a partir del mismo
`EscenaAr` puro de `geometriaAr.ts`, sin tocarlo: la capa de geometría
no sabe ni le importa si el consumidor renderiza con líneas o mallas.
Sin etiquetas de distancia en esta primera versión (quedan fuera,
declarado como mejora futura no bloqueante). Confirmado de forma
inesperada pero bienvenida: construir `THREE.Mesh`/`Geometry`/
`Material`/`Group` no necesita DOM — corre limpio bajo `node --test`
(4 tests en `escenaMalla.test.ts`, incluido uno que arma la escena
completa de la sala por defecto y verifica que cada hijo del grupo es
un `.isMesh` de verdad).

Como no hay hit-test que anclar, la escena de Quick Look usa
`ANCLAJE_CANONICO` (nuevo en `anclaje.ts`): origen en (0,0,0), ejes de
libro — la sala queda apoyada en el origen del sistema de coordenadas,
y Quick Look coloca/escala el conjunto con sus propios gestos nativos
(arrastrar, pellizcar), no con nada calculado por este sitio.

**Detección**: `esUserAgentIOS()` (nuevo en `soporte.ts`, puro,
recibe el `userAgent` como parámetro — mismo criterio de testabilidad
que el resto del módulo) combinado con
`document.createElement('a').relList.supports('ar')` — mismo patrón de
dos señales que ya usa `<model-viewer>` de Google (referencia externa
de criterio, no un paquete instalado acá), para evitar tanto un UA
manipulado como un falso positivo en Safari de escritorio (que
comparte motor con iOS pero no tiene Quick Look). `entrada-ar.ts`
intenta primero WebXR (como siempre) y, sólo si falla, prueba Quick
Look antes de caer al mensaje de "no disponible" — Android nunca ve el
panel de Quick Look, ni viceversa. **`main.ts` (`irAVerEnAr()`) tenía
que actualizarse también**: el guardia que decide si navegar a
`ar.html` sólo miraba `navigator.xr` — sin el cambio, habría bloqueado
a todo iPhone antes de siquiera llegar a la página donde Quick Look
funciona. Se agregó `tieneChanceDeQuickLook()` (misma lógica de
detección, sin importar `three` — `main.ts` es parte del bundle que
tiene que abrir por `file://`, y `esUserAgentIOS()` vive en
`soporte.ts`, que ya no depende de `three` ni de nada más).

**Textos honestos sobre la diferencia real entre las dos versiones** —
`ar.quickLookAviso` declara explícitamente que la versión de iPhone no
mide la sala real, a diferencia de la de Android. De paso,
`avisoSoloAndroidChrome`/`noSoportadoCuerpo` se reescribieron: antes
decían "no disponible en iPhone" de forma categórica, lo cual dejó de
ser cierto — ahora nombran las dos tecnologías (WebXR y Quick Look) y
declaran cuál falta en cada caso, sin la afirmación general que ya no
aplica.

Verificado con Chrome headless simulando un iPhone real (UA de iOS +
`relList.supports('ar')` forzado a `true` vía
`Page.addScriptToEvaluateOnNewDocument`): el panel de Quick Look
aparece, el USDZ se genera sin errores de consola, y el archivo
resultante es un ZIP válido de verdad (firma `PK\x03\x04`, ~466 KB
para la sala por defecto) — la validación más profunda posible sin
hardware Apple real. Confirmado además que Android (WebXR simulado)
sigue mostrando el flujo de calibración sin ningún cambio, y que un
navegador sin ninguna de las dos tecnologías sigue cayendo en el
mensaje de "no disponible" como antes — sin regresión en ninguno de
los dos caminos existentes. **Lo que no se puede verificar sin un
iPhone real**: si Quick Look efectivamente se abre desde una blob URL
en la versión de iOS actual (documentado como mecanismo esperado,
usado por otras implementaciones sin servidor, pero no confirmado acá)
y cómo se ve/comporta el modelo dentro del visor nativo de Apple.
228 tests totales (antes 222): 4 de `escenaMalla.test.ts` + 2 de
`esUserAgentIOS` en `soporte.test.ts`.

**AR Quick Look en iPhone, deshabilitada tras probarla en hardware
real — el usuario reportó que no funcionaba bien, sin más detalle
todavía sobre qué falló específicamente.** En vez de borrar el trabajo,
se apagó con un interruptor: `QUICK_LOOK_HABILITADO = false` (nuevo,
`soporte.ts`) — `main.ts` (`tieneChanceDeQuickLook`) y `entrada-ar.ts`
(`soportaQuickLook`) lo chequean antes que cualquier otra cosa, así que
hoy un iPhone cae siempre al mismo mensaje de "no disponible" que antes
de que existiera esta función, sin importar si su Safari en particular
soporta `rel="ar"` o no. La implementación completa
(`escenaMalla.ts`, el panel `#ar-quicklook` de `ar.html`, el flujo de
generación de USDZ en `entrada-ar.ts`) queda intacta y sin usar, no
eliminada — para retomarla más adelante si aparece un diagnóstico más
preciso de qué salió mal, en vez de tener que reconstruirla de cero.
Los textos que habían empezado a mencionar "AR Quick Look (iPhone)"
como alternativa real (`avisoSoloAndroidChrome`, `noSoportadoCuerpo`)
volvieron a su redacción anterior — con la función apagada, afirmar que
existe una alternativa en iPhone dejó de ser cierto. Verificado con
Chrome headless (UA de iPhone + `relList.supports('ar')` simulado en
`true`, el mismo entorno que antes SÍ mostraba Quick Look): tanto
`ar.html` directo como el botón "Ver en AR" de `index.html` caen ahora
en el mensaje de "no disponible", igual que un navegador sin ningún
soporte de AR. 228 tests sin cambio de cantidad (deshabilitar por flag,
sin lógica nueva testeable).

**Preparación para agentes de IA (auditoría externa "Is Agentic",
60/100) — sitemap, robots.txt, llms.txt, JSON-LD, OG/canonical,
jerarquía de encabezados, tres páginas de confianza reales, y
negociación de contenido Markdown vía Vercel Routing Middleware.** El
usuario corrió una auditoría de terceros contra `thehifimatch.com` en
producción y pasó 9 hallazgos priorizados, orden fallas-primero. Se
implementó todo lo corregible con código; lo que no lo es
(descubribilidad de marca en buscadores) queda declarado como
recomendación, no como tarea de motor ni de frontend.

`apps/web/public/` (carpeta nueva — Vite copia su contenido tal cual a
la raíz de `dist/`, sin pasar por `vite-plugin-singlefile` ni por
`verificar-build.mjs`, que sólo inspecciona `dist/index.html`) suma:
`sitemap.xml` (las 5 URLs reales del sitio), `robots.txt` (permite
todo, declara el sitemap), `llms.txt` (formato llmstxt.org — H1,
blockquote de resumen, sección `## Cuándo usar esto` con casos de uso
concretos y el límite declarado del motor: no recomienda marcas por
gusto ni predice sinergia sonora), `404.html` (standalone, sin JS, con
enlaces de recuperación a inicio/sitemap/llms.txt — Vercel ya devolvía
404 real para rutas inexistentes en output estático; sólo faltaba
darle un cuerpo útil), `og-image.png` (1200×630, generada con Chrome
headless sobre una tarjeta hecha a medida con el wordmark/paleta ya
establecidos, no un screenshot del sitio real), y tres páginas de
confianza reales — `about.html`/`contact.html`/`privacy.html`, HTML
plano sin JS con `<style>` inline reusando la paleta oscura/dorada del
sitio, ≥500 caracteres de texto visible cada una, español neutro
verificado con grep. `privacy.html` declara explícitamente lo único
que el código confirma: sin cuentas, sin cookies de seguimiento ni
analítica de terceros — el único dato personal es el del formulario de
contacto (nombre opcional/email/mensaje), enviado por email vía Resend,
nunca guardado en una base de datos propia. El Organization JSON-LD
(ver abajo) y `contact.html` usan `thehmcontacto@gmail.com` — el valor
real de `CONTACTO_EMAIL_FALLBACK` en `main.ts`, no el
`contacto@thehifimatch.com` que este mismo documento mencionaba en una
sección "Falta" de una ronda anterior: ese texto había quedado
desactualizado: el código es la fuente de verdad, no la prosa.

**Omitido a propósito: `address` (PostalAddress) en el Organization
JSON-LD.** La auditoría lo pide para "completeness", pero el sitio no
tiene un domicilio comercial que publicar — inventar uno violaría la
misma doctrina de "no inventes un dato" que rige el motor, aplicada acá
a los metadatos del sitio. Se prefirió puntaje parcial en ese ítem
antes que un dato falso.

`index.html` gana, en el `<head>`: `<link rel="canonical">`, el set
completo de meta OG (`og:type`/`site_name`/`title`/`description`/`url`/
`image`) y un único `<script type="application/ld+json">` con
`@graph` de dos nodos — `Organization` (contactPoint, sin address) y
`WebApplication` (`applicationCategory`, `offers` gratuito,
`isPartOf` apuntando a la Organization). Todas las URLs nuevas son
absolutas (`https://www.thehifimatch.com/...`) — nunca `href="/..."`,
la regla 4 de `verificar-build.mjs` seguiría rompiendo el build si
alguna lo fuera. `ar.html` suma su propio canonical/OG básico (sin
JSON-LD — es una vista secundaria, no la identidad del sitio).

**Bug encontrado al verificar contra producción (pedido explícito del
usuario, "revisa"), no antes de desplegar: el dominio canónico real es
`www.thehifimatch.com`, no el apex.** La primera versión de esta ronda
usó `https://thehifimatch.com/...` (sin `www`) en absolutamente todas
las URLs nuevas — canonical, OG, JSON-LD, `sitemap.xml`, `robots.txt`,
`llms.txt` — porque es literalmente el dominio que el usuario tipeó al
correr la auditoría (`npx is-agentic thehifimatch.com`). `curl -sI
https://thehifimatch.com/` reveló que el apex devuelve **308** hacia
`https://www.thehifimatch.com/` (configuración de dominios de Vercel,
preexistente — no algo que esta ronda haya tocado) — el `www` es el que
sirve `200` con contenido real. Un `rel="canonical"`/`og:url`/JSON-LD
`url` apuntando a una URL que a su vez redirige es exactamente el caso
que la práctica de SEO recomienda evitar (apuntar al destino final, no
a un salto intermedio). Las ~35 URLs nuevas de todos los archivos de
esta ronda (`index.html`, `ar.html`, los 3 de `public/*.html`,
`sitemap.xml`, `robots.txt`, `llms.txt`, `middleware.ts`, y las
aserciones de los dos archivos de test) se corrigieron a `www` — un
`sed` sobre las ocurrencias de texto plano más 6 correcciones manuales
donde el dominio vivía dentro de un literal de RegExp de test
(`/thehifimatch\.com/`, con las barras ya escapadas — el `sed` de texto
plano no las alcanza porque busca `://` sin barras invertidas de por
medio). Verificado con `curl` real contra `www.thehifimatch.com` en
producción después del segundo deploy: middleware, 404, y los 7
archivos de `public/` responden igual de bien que en el primer chequeo
(que sin saberlo había sido contra el dominio equivocado, aunque
funcionalmente ambos dominios sirven el mismo build vía el redirect).

**Jerarquía de encabezados: de tres `<h1>` competidores a uno solo.**
La auditoría marcaba "contenido sin JavaScript" como parcial pese a
4244 caracteres reales en el HTML crudo (ya sobraba el mínimo de 500)
— el defecto era estructural: `index.html` tenía tres `<h1 class=
"lead">`/`<h1 class="doc-title">` distintos (pantallas configurar/
guía/informe), sin ningún `<h1>` en portada ni en resultado — un
esqueleto plano, no una jerarquía. Los tres bajaron a `<h2>` (cero
cambio visual: `.lead`/`.doc-title` están definidos por clase en
`estilos.css`, no por tag) y se agregó un único `<h1 class="sr-only">`
real al principio de `<body>` con el título/tagline del sitio — oculto
visualmente con la técnica estándar de accesibilidad
(`position:absolute` + `clip`, no `display:none`, que algunos
crawlers penalizan por parecer contenido oculto/spam), pero presente
en el HTML crudo. No es SSR real (el sitio sigue sin servidor, tiene
que abrir por `file://`) — el hueco de fondo que la auditoría señalaba
(encabezados) sí se resuelve sin tocar esa arquitectura.

**Dos links nuevos en el pie de la portada, nada más — deliberadamente
sin tocar los `.hright` de configurar/resultado/guía.** "Acerca de" y
"Privacidad" se suman a "Contacto" dentro de un contenedor fijo nuevo
(`.foot-links-splash`, reemplaza el `position:fixed` que antes tenía
`.contacto-splash` sola) en la portada — mismo componente visual
`.back` que ya usan todos los botones de navegación del sitio (que
ganó `text-decoration:none` para poder aplicarse también a un `<a>`,
no sólo a `<button>`). Se evaluó agregarlos también a los headers de
las otras pantallas, pero se descartó: esas filas de botones ya
pasaron por varias rondas de ajuste fino de quiebre responsive
documentadas en este mismo archivo, y el riesgo de una regresión
visual no se justificaba frente al beneficio marginal —
sitemap.xml/llms.txt/robots.txt ya cubren el descubrimiento por
rastreadores sin necesidad de un link en cada pantalla.

**`middleware.ts` (nuevo, raíz del repo): negociación de contenido
Accept sobre la portada — el único ítem que exige lógica de servidor
por petición, algo que este sitio no tenía fuera de
`api/contact.ts`.** Vercel Routing Middleware (el nombre vigente de lo
que documentación anterior llama "Edge Middleware"), matcher `'/'`
únicamente: si el `Accept` del cliente prefiere `text/markdown` sobre
`text/html` (comparando `q=` cuando ambos aparecen; si el cliente sólo
pide `text/markdown` — el caso exacto de la auditoría — se asume
preferencia), responde un Markdown corto escrito a mano (mismo
contenido de fondo que `meta.descripcion`, con links a inicio/acerca-
de/contacto/sitemap) con `Content-Type: text/markdown; charset=utf-8`;
en cualquier otro caso, deja pasar el HTML estático de siempre pero
agregando `Vary: Accept, Accept-Encoding` — el header que la auditoría
marcaba como ausente en los dos casos. Usa `next()` de
`@vercel/functions` (paquete oficial vigente para middleware sin
framework — verificado contra la documentación real de Vercel antes de
escribir código, no asumido de memoria; `@vercel/edge`, el nombre
planeado originalmente, quedó reemplazado por ese paquete) para
continuar la cadena sin re-fetchear el origen a mano.

El `package.json` raíz gana `"type":"module"` — sin eso, Vercel
compilaría `middleware.ts` como CommonJS y el `import` de un paquete
ESM reventaría en runtime (`ERR_REQUIRE_ESM`, el mismo bug ya sufrido y
documentado con `api/contact.ts`, esta vez evitado antes de desplegar
en vez de después). Confirmado que ningún archivo `.js`/`.cjs` suelto
del repo (fuera de `node_modules`) dependía del default CommonJS de la
raíz antes de este cambio. `tsconfig.middleware.json` (nuevo, mismo
patrón que `tsconfig.api.json`) + `typecheck:middleware` +
`test:middleware` (`node --test middleware.test.ts`, en la raíz —
`middleware.ts` no vive dentro de ningún workspace npm) se enganchan a
`verify`/`test` de siempre.

**Verificado contra producción real, no sólo local — y en verde.**
`curl -H "Accept: text/markdown" https://www.thehifimatch.com/`
devuelve `text/markdown` con `Vary: Accept, Accept-Encoding` en el
deploy real; la ruta HTML normal también trae `Vary`; una ruta
inexistente da `404` real con el `404.html` nuevo como cuerpo; y los 7
archivos de `public/` (`robots.txt`/`sitemap.xml`/`llms.txt`/
`about.html`/`contact.html`/`privacy.html`/`og-image.png`) responden
`200` con el contenido correcto — confirmado leyendo el HTML servido
(mismo tamaño de bytes que `dist/index.html`, `sr-only`/JSON-LD/
`foot-links-splash` presentes). Este chequeo sólo era posible después
de desplegar — se verificó exhaustivamente todo lo que corre local
antes de eso: `prefiereMarkdown()` y el propio `middleware()`
(construyendo un `Request` real y leyendo la `Response`) con 8 tests en
`middleware.test.ts`; el 404 real y cada archivo nuevo de `public/`
sirviéndose con el content-type correcto, con un servidor estático
mínimo hecho a mano sobre `dist/` (`curl` real, no mock); y la
jerarquía de encabezados/JSON-LD/links nuevos con Chrome headless real
sobre `dist/index.html` vía `file://`, sin errores de consola, en
portada (1400px y 390px), configurar, resultado y guía.

**Ítem de la auditoría "brand name discoverability" queda fuera de
alcance — no es corregible con código.** Depende de NAP consistente en
listados externos, menciones de prensa que enlacen al dominio raíz, y
evitar cadenas de redirect que lo oculten en resultados de búsqueda;
queda como recomendación para el usuario, no como tarea de esta ronda.

15 tests nuevos en `apps/web/src/seo/paginas-estaticas.test.ts` (PURO,
lee `index.html`/`ar.html`/`public/*` reales de disco con `node:fs`,
sin DOM ni bundler) + 8 en `middleware.test.ts` (raíz). **463 tests
totales**: 187 `packages/engine` + 16 `packages/data` + 15
`packages/contact` + 237 `apps/web` (antes 222) + 8 de `middleware.ts`
(fuera de los 4 workspaces npm de siempre).

**Segunda vuelta de la auditoría (86→ítem 5 sigue Partial): `address`
en Organization JSON-LD, sólo país — nunca una dirección completa
inventada.** Confrontado de nuevo con el hueco de "Organization schema
completeness", el usuario confirmó que no tiene un domicilio comercial
real, pero autorizó explícitamente declarar el país (`"Chile"`,
codificado `addressCountry: "CL"`, el campo que schema.org/Google
reconocen como suficiente por sí solo dentro de `PostalAddress` — no
hace falta calle/ciudad para que el tipo sea válido). Es un dato real
(coherente con `lang="es-CL"` en todo el sitio), no inventado — sigue
la misma disciplina de "declarar lo que se sabe, nunca rellenar lo que
no" que ya regía la decisión de omitirlo por completo en la ronda
anterior. Agregado en los dos lugares donde vive el nodo Organization:
`index.html` y `public/contact.html` (cada uno con su propio JSON-LD
autocontenido, ver la ronda original). 2 tests actualizados en
`paginas-estaticas.test.ts` (uno por archivo) confirman
`address.addressCountry === 'CL'`, explícitamente comentado como "sólo
país, nunca una dirección completa".

**Tercera vuelta de la auditoría (86→89): encabezados "—" reemplazados
por texto real, y rutas sin extensión para las 3 páginas de
confianza.** Dos hallazgos con causa nueva, distinta de las dos rondas
anteriores:

- **"Flat heading structure" seguía marcado pese a la jerarquía ya
  corregida** (un solo `<h1>`, sin `<h2>` hermanos sin nivel
  intermedio). Revisando el HTML crudo de nuevo: 13 `<h3>` de la Guía
  del análisis (`info.capas.titulo`...`info.veredicto.titulo`) y el
  `<h2 id="vd-titulo">` del veredicto mostraban literalmente `—` — el
  placeholder que `main.ts` pisa recién con JS (`el.textContent =
  leerRuta(...)`, ver `idioma.ts`). Un rastreador sin JS ve una
  jerarquía con la forma correcta pero sin contenido real debajo del
  único `<h1>` — tan "plano" en la práctica como no tener jerarquía. A
  diferencia de otros textos dinámicos genuinamente dependientes del
  equipo elegido (que sí deben quedar en `—` hasta que haya un
  análisis real), estos 13 títulos son fijos — nombran secciones de
  ayuda que no cambian nunca — así que se hardcodearon con el mismo
  texto exacto de `es.ts`, mismo patrón que ya usaban "Define la
  cadena"/"Cómo leer este análisis" antes de esta ronda. `vd-titulo`
  (el único de los 14 genuinamente dependiente del análisis) pasó de
  `—` a una etiqueta neutra, "Veredicto del análisis" — no un
  resultado inventado, sólo un rótulo, reemplazado por el título real
  en cuanto corre un análisis (confirmado con Chrome headless: KEF
  LS50 Meta + Rega Brio da "Configuración no recomendada" ahí mismo).
  Nuevo test compara cada uno de los 13 `<h3>` contra `es.info[clave]
  .titulo` importado directo — si `es.ts` cambia un título más
  adelante y el HTML no se actualiza junto, el test lo detecta.
- **"Trust anchor pages": About y Privacy verificadas, Contact no** —
  pese a que `/contact.html` responde 200 con el mismo contenido real
  que las otras dos. Confirmado con `curl` que las tres páginas se
  comportan idéntico en el dominio real (200 con `.html`, 404 sin
  extensión) — no hay ninguna asimetría de servidor entre ellas. La
  explicación más probable es que la lista de rutas candidatas que
  prueba la auditoría para "about"/"privacy" incluye la forma sin
  extensión y para "contact" no (o prueba una variante distinta,
  como `/contact-us`), y nunca llega a pedir `/contact.html`. En vez
  de adivinar la forma exacta, `vercel.json` gana `rewrites` (rutas
  sin extensión, mismo contenido, sin redirect — el canonical de cada
  página sigue apuntando a la versión `.html`, así que no hay
  contenido duplicado real): `/about`, `/contact`, `/contact-us`,
  `/privacy`, `/privacy-policy` → sus `.html` respectivos. Cubre
  varias formas plausibles a la vez en vez de una sola adivinanza.

Ninguno de los dos hallazgos restantes de esta ronda (marca en
buscadores, 404 en el apex sin `www`) tiene código pendiente — quedan
igual que en la ronda anterior. 246 tests (240 + 4 nuevos en
`paginas-estaticas.test.ts` — comparación de los 13 títulos contra
`es.ts`, y validación de los 5 `rewrites` de `vercel.json`). Verificado
con Chrome headless que la Guía se ve idéntica (los 13 títulos ya
estaban ahí visualmente, sólo cambió qué hay en el HTML *antes* de que
corra JS) y que un análisis real sigue reemplazando "Veredicto del
análisis" por el veredicto verdadero, sin excepción.

Falta:
- **Descubribilidad de marca ("The Hifi Match" no aparece en los
  primeros resultados de una búsqueda de su propio nombre)**: no es un
  problema de código — depende de NAP consistente en listados
  externos, menciones de prensa que enlacen al dominio raíz, y evitar
  redirects que lo oculten en resultados de búsqueda. Fuera del
  alcance de este repo.
- **Verificación end-to-end de AR en un Android+Chrome real con
  ARCore**: todo lo automatizable (geometría de anclaje, construcción
  de escena, detección de soporte, codificación de estado, fallbacks de
  UI) tiene test — el hit-test contra una superficie real, la
  estabilidad de la retícula, la legibilidad real del grosor de línea
  de `Line2` y de la vista previa del muro frontal sobre la cámara de
  verdad, y ahora también el botón "Medir altura real" (hit-test contra
  una pared cerca del techo — la superficie más difícil de las tres que
  usa esta función) quedan pendientes de una prueba en teléfono real.
  Confirmado hasta la ronda de "posición del visor" que el flujo de
  2 toques ya funciona razonablemente en hardware real — falta
  confirmar la medición de ancho/alto de la misma forma.
- **AR Quick Look en iPhone: pausada, no cerrada.** Deshabilitada por
  `QUICK_LOOK_HABILITADO=false` (`soporte.ts`) tras probarla en
  hardware real — no funcionó bien, sin diagnóstico específico todavía
  de qué falló (¿el USDZ no abría? ¿abría pero se veía mal? ¿el
  wireframe de tubos no se distinguía?). El USDZ generado sí se
  confirmó como un ZIP válido con Chrome headless simulando un iPhone,
  así que el archivo en sí no está corrupto — el problema está en algo
  posterior a eso (la apertura real en Quick Look, o el resultado
  visual ahí adentro). Antes de retomarla hace falta ese diagnóstico
  puntual del usuario; no tiene sentido adivinar un segundo intento a
  ciegas.
- **Modelo de campo mixto para la regla de potencia** (en vez del término
  de campo libre puro `−20·log₁₀(distanciaM)`): hoy `potencia.ts` mezcla
  ese término con correcciones que sólo existen porque hay una sala
  (antes `GANANCIA_SALA_DB` sumado siempre; ahora informativo bajo un
  techo de frecuencia) — la corrección de fondo sería derivar la
  distancia crítica de la sala a partir del RT60 que ya calcula
  `reverberacion.ts`, y usarla para pasar de campo libre a campo
  reverberante donde corresponda. Identificado explícitamente al corregir
  el módulo de potencia (auditoría externa) y dejado fuera de esa ronda a
  propósito: es un cambio de modelo mayor, con sus propios vectores de
  prueba, no un ajuste de constante.
- **Factor de amortiguamiento (`factorAmortiguamiento`) e impedancia de
  pico de graves (`impedanciaMaxOhm`)**: los dos campos que necesita
  `amortiguamiento.ts` existen en el esquema (`Parlante`/`Amplificador`
  en `tipos.ts`, `ParlanteCat`/`AmplificadorCat` en `tipos-catalogo.ts`)
  y siguen en `null` para los 35 parlantes y 34 amplificadores **reales**
  del catálogo — ninguna ficha de fabricante consultada hasta ahora
  publica DF referido a una carga fija de forma consistente entre
  marcas (los 3 parlantes y 3 amplificadores "Genérico (Arquetipo)" sí
  los declaran, pero son perfiles sintéticos de este sitio, no una
  medición citada — ver más arriba). Motor y UI ya están listos; falta
  la ronda de catálogo dedicada a investigar y poblar estos dos campos
  en equipos reales, con fuente y confianza, igual disciplina que el
  resto. Lo mismo para `anguloFaseGrados` (fase en graves) de EPDR —
  casi ningún fabricante lo publica; el fallback de -45° para nominal
  ≤4 Ω cubre el caso común mientras tanto.
- **Presets de sala** ("living con placa yeso, piso flotante, un
  ventanal"): la otra mitad del punto de fricción de la revisión
  externa de UX, la que este puerto no tocó (el colapso detrás de
  `<details>` sí se implementó — ver más arriba). Falta definir qué
  presets existen, a qué combinación de los 6 materiales + qué supuesto
  de dimensiones mapea cada uno, y dónde vive esa data.
- **Componente fuera de catálogo → especificar specs a mano** (en vez
  de un callejón sin salida al formulario de contacto): los 6 perfiles
  "Genérico (Arquetipo)" (ver más arriba) cubren una parte de esto —
  aproximar por parecido eléctrico cuando el equipo real no está — pero
  siguen siendo 6 puntos fijos, no un formulario donde el usuario tipee
  sus propios números. El motor ya acepta objetos planos desacoplados
  del catálogo (`tipos.ts`), así que un formulario libre es viable sin
  romper doctrina, pero exige decidir primero qué `confianza` le
  corresponde a un dato que tipeó el propio usuario — sesión aparte.
- **Arquetipos genéricos de streamer/DAC**: esta ronda sólo cubrió
  parlantes y amplificadores (lo pedido); `FuenteCat`/`Fuente` podrían
  recibir el mismo tratamiento (`salidaV`/`impedanciaSalidaOhm`
  declarados por arquetipo) si hace falta aproximar el puente de
  impedancias/recorrido de volumen sin el equipo real en catálogo —
  sin diseñar todavía.
- **Verificar `thehifimatch.com` en Resend** (Resend → Domains, no es
  el mismo paso que agregar el dominio en Vercel — son paneles y
  registros DNS distintos): recién ahí tiene sentido cambiar
  `CONTACT_FROM_EMAIL` a algo `@thehifimatch.com` en vez del dominio de
  pruebas de Resend. `RESEND_API_KEY`/`CONTACT_TO_EMAIL` ya están
  cargadas en Vercel (`thehmcontacto@gmail.com`, misma dirección que
  `CONTACTO_EMAIL_FALLBACK` en `main.ts`).
- **Activar el Firewall/protección de bots de Vercel** (dashboard, cero
  código, gratis incluso en Hobby) — capa adicional gratuita que no se
  activó desde acá porque requiere acceso al dashboard del usuario.
- **Verificar qué versión de Node soporta el runtime de Functions** de
  Vercel (Project Settings → Functions) — es una config de plataforma
  separada del `engines.node` que fija el build, puede ir un escalón
  atrás del Node más nuevo; no confirmable sin acceso al dashboard.
- **Confirmar `CONTACTO_EMAIL_FALLBACK`** (`main.ts`,
  `contacto@thehifimatch.com` hoy) apunta a una casilla real que se
  revisa — es el destino del enlace `mailto:` de `file://`,
  independiente de `CONTACT_TO_EMAIL` (esa es server-side); si cambia
  una, hay que actualizar la otra a mano.
- **Guardar configuraciones con login**, pantalla de configuraciones
  guardadas y comparación entre ellas: pedido explícitamente como
  trabajo futuro, no de esta ronda. Necesita backend/auth/base de datos
  — arquitectura nueva, sin diseñar todavía. La vista previa ("Documento",
  `#s-documento`, ver más arriba) ya existe con "Análisis 1" real y las
  8 tarjetas + gráficos — queda guardada pero desconectada
  (`#btn-guardar` vuelve a abrir el popup de login); conectarla de nuevo
  es un cambio de una línea (`ir('documento')` en vez de
  `abrirGuardarPopup()`), pero falta la lógica real detrás de
  "Análisis 2"/"Comparar"/"Descargar PDF" (segunda fuente de datos,
  generación de PDF) antes de que tenga sentido reconectarla en serio.
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
- **Alternativa de teclado para arrastrar parlantes o el asiento**
  (accesibilidad): el arrastre del plano (vista Superior) — parlantes y,
  con el candado abierto, el punto de escucha — queda como mejora
  progresiva puramente mouse/touch por ahora — se puede sumar después
  sin rediseñar la geometría ni el sistema de snapshots/pestañas.
- **`modeloUbicacionParlantes` no reporta la posición del asiento
  cuando el candado está abierto**: el párrafo "Ubicación de referencia
  de los parlantes" sigue describiendo sólo la posición de cada
  parlante (sin cambios de esta ronda) — con el asiento arrastrado de
  forma independiente, ese texto ya no cuenta toda la historia de la
  disposición. El plano sí lo muestra (marcador + referencia punteada);
  falta la frase equivalente en prosa.
