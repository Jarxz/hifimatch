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

**"Documento" — "guardar y comparar como PDF", vista previa de la
mitad real de esa función.** Pantalla nueva (`#s-documento`, mismo
patrón `Pantalla`/`ir()` que splash/config/resultado/guía) que muestra
el análisis actual reformateado como un informe — logo en negro sobre
fondo blanco (el único lugar del sitio con fondo claro), título, fecha,
equipo elegido con specs, sala, puntaje y veredicto por componente.
`#btn-guardar` navega ahí directo (`ir('documento')`) — primera versión
de esta pantalla la dejaba sin ningún botón conectado (referencia de
diseño interna, sólo alcanzable desde la consola); el usuario probó el
botón "Guardar" esperando ver justo esta vista y pidió conectarlo, así
que quedó así: **"Análisis 1" es real y abierto** (el análisis vigente,
sin login), y sólo lo que de verdad necesita cuentas/backend —
"Análisis 2", "Comparar", "Descargar PDF" — sigue bloqueado.

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

Falta:
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
  — arquitectura nueva, sin diseñar todavía. `#btn-guardar` ya navega a
  la vista previa ("Documento", `#s-documento`, ver más arriba) con
  "Análisis 1" real; falta la lógica real detrás de "Análisis 2"/
  "Comparar"/"Descargar PDF" (segunda fuente de datos, generación de
  PDF) — hoy los tres sólo reusan el mismo popup de login.
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
- **Alternativa de teclado para arrastrar parlantes** (accesibilidad): el
  arrastre del plano (vista Superior) queda como mejora progresiva
  puramente mouse/touch por ahora — se puede sumar después sin rediseñar
  la geometría ni el sistema de snapshots/pestañas.
