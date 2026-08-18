# Motor MVP — fórmulas, esquema y vectores de prueba

Esto es lo que calcula el motor (`packages/engine/src/`), consumido por
`apps/web/`. Los números de los vectores están calculados a mano y viven
también como tests (`*.test.ts` junto a cada regla, más
`apps/web/src/datos/adaptadores.test.ts`, que los reproduce contra el
catálogo real de `packages/data/src/catalogo.ts`); si cambia un dato del
catálogo o una fórmula, son la referencia para saber qué se rompió.

Convención: `log₁₀` es logaritmo base 10. Tolerancia de los tests: ±0,05 dB salvo
que se indique otra.

---

## 1. Esquema de datos

Cada spec lleva su fuente y su confianza (`alta` | `media` | `baja`). Un campo sin
dato es `null`, y eso tiene consecuencias en las reglas: nunca se rellena.

**Parlante**
```
id, nombre, tipo
sensibilidadDb        { valor, unidad:"dB/2.83V·m", fuente, confianza }
impedanciaNominalOhm  número
impedanciaMinOhm      número | null      // null => la regla de carga da "sin-datos"
potenciaRecMinW       número | null
potenciaRecMaxW       número | null
```

**Amplificador**
```
id, nombre, tipo
potencia8OhmW         { valor, fuente, confianza }
potencia4OhmW         { valor, fuente, confianza } | null
cargaMinOhm           número | null
sensEntradaMv         número | null
impedanciaEntradaOhm  número | null
```

**Fuente digital (streamer o DAC)** — usada sólo por la regla de la sección 6,
opcional, no entra a potencia/carga:
```
id, nombre, tipo
salidaV                número | null   // tensión de salida analógica, RMS
impedanciaSalidaOhm    número | null
fuente, confianza      igual que el resto
```

El catálogo (`packages/data/src/catalogo.ts`) además guarda `tipo`,
`descripcion`, `chipsExtra[]` y `fuentes[]` por equipo, bilingües — eso es
presentación, no entra al motor. Los chips que sí son físicos (`8 Ω`,
`mín 3,5 Ω`, `40–100 W`…) no se guardan: se derivan de estos mismos campos
en `apps/web/src/datos/etiquetas.ts`, así no pueden divergir del dato real.

---

## 2. Regla de potencia (`potencia.ts`)

La pregunta: ¿el amplificador entrega el SPL de pico que la sala pide?

**Constantes del modelo** (declararlas como tales, son supuestos):
- `SUMA_PAR = 6` dB — dos parlantes sumando en el punto de escucha.
- `GANANCIA_SALA = 3` dB — refuerzo típico de sala pequeña. **Se verifica
  midiendo**; es un supuesto, no un dato del equipo.

**Nivel de escucha → SPL de pico objetivo** (dB en el punto de escucha):
```
moderado    90
alto       100
referencia 105
```

**Fórmula:**
```
SPL_disponible = sensibilidadDb
               − 20·log₁₀(distanciaM)      // atenuación por distancia
               + 10·log₁₀(potencia8OhmW)   // ganancia por potencia
               + SUMA_PAR
               + GANANCIA_SALA

margen = SPL_disponible − pico_objetivo
```

**Veredicto** (por `margen`, en dB). El motor devuelve `codigo` — no texto;
la traducción a pantalla vive en `apps/web/src/idioma/{es,en}.ts`:
```
margen ≥ 3     ok      codigo: 'con-margen'
0 ≤ margen < 3 warn    codigo: 'justo'
margen < 0     alert   codigo: 'insuficiente'
```

**Aviso extra:** si `potenciaRecMinW` no es null y `potencia8OhmW < potenciaRecMinW`,
el motor agrega a `avisos[]` un `{ codigo: 'bajo-potencia-recomendada',
recomendadaW, entregadaW }` — números en crudo, sin redactar la frase (eso
también es tarea del diccionario, no del motor).

**Confianza:** el veredicto hereda la peor confianza de los datos que usó (sobre
todo la de `sensibilidadDb`).

### Vectores de prueba
```
A · sens=86, p8=80, dist=2.5, nivel=alto(100)
   SPL = 86 − 7,959 + 19,031 + 6 + 3 = 106,07  → margen +6,07  → "Con margen"

B · sens=85, p8=50, dist=3.0, nivel=alto(100)
   SPL = 85 − 9,542 + 16,990 + 6 + 3 = 101,45  → margen +1,45  → "Justo"

C · sens=85, p8=50, dist=3.0, nivel=referencia(105)
   SPL = 101,45  → margen −3,55  → "Insuficiente"
```

---

## 2bis. Crest factor por género (`genero.ts`)

**Estado: implementada.** No es una regla con veredicto: es información
adicional sobre la tarjeta de potencia, sin severidad ni umbral propio —
no cambia `ok`/`warn`/`alert` de la sección 2.

El pico objetivo de la sección 2 es un pico, no un nivel sostenido. El
crest factor (relación pico/promedio, en dB) típico del género elegido
convierte ese pico en el nivel promedio de escucha que implica:

```
CREST_FACTOR_DB = { rockpop: 10, jazzvocal: 14, clasica: 18 }   // dB, criterio del sitio

nivelPromedioEstimadoDb = picoObjetivoDb − CREST_FACTOR_DB[genero]
```

Valores típicos de literatura de ingeniería de audio sobre rango dinámico
de masterización — varían por grabación específica (un rock muy comprimido
puede tener menos crest factor que un jazz poco comprimido); el motor lo
declara así, no lo presenta como medición de la pista real que se escucha.

### Vector de prueba
```
picoObjetivoDb=100, genero=rockpop  → nivelPromedioEstimadoDb = 100 − 10 = 90
picoObjetivoDb=100, genero=clasica  → nivelPromedioEstimadoDb = 100 − 18 = 82
```

---

## 3. Regla de carga / impedancia (`carga.ts`)

La pregunta: ¿el amplificador tiene corriente para la caída de impedancia del
parlante? Es distinta de la potencia (SPL): acá manda la impedancia mínima.

```
si impedanciaMinOhm === null:
    → sin-datos   codigo: 'sin-dato'   // NUNCA ok. Falta la curva de impedancia.

si no:
    dura   = impedanciaMinOhm ≤ 4
    // "casi dobla" al bajar a 4 Ω = buena entrega de corriente
    reserva = (potencia4OhmW != null) ? (potencia4OhmW / potencia8OhmW ≥ 1.7)
                                      : false
    potente = potencia8OhmW ≥ 60
    resuelta = reserva || potente

    si  dura && !resuelta → warn   codigo: 'exige-corriente'
    si  dura &&  resuelta → ok     codigo: 'cubierto'
    si !dura              → ok     codigo: 'carga-benigna'
```

### Vectores de prueba
```
KEF (minZ 3,5) + Cambridge CXA81 (p8 80, p4 120):
   dura=sí, potente=sí(80≥60) → resuelta → "Cubierto"

KEF (minZ 3,5) + Rega Brio (p8 50, p4 73):
   dura=sí, reserva=no(73/50=1,46<1,7), potente=no(50<60) → "Exige corriente"

Klipsch (minZ null) + cualquier amp:
   → "Sin dato"
```

---

## 4. Geometría de sala (`sala.ts`)

Ejes: `x` a lo ancho (0..W), `y` de adelante hacia atrás (0 = muro frontal donde
van los parlantes, L = muro trasero). Todo en metros. `clamp(lo,v,hi)` acota.

```
cx     = W / 2
sep    = clamp(1.5, 0.55·W, min(3.0, W − 1.0))    // separación entre parlantes
spOff  = clamp(0.5, 0.15·L, 1.2)                  // parlantes al muro frontal
ly     = clamp(spOff+1.0, spOff + sep·1.2, L−0.6) // fila de escucha
xL     = cx − sep/2
xR     = cx + sep/2

distanciaEscucha = √( (sep/2)² + (ly − spOff)² )   // ← alimenta la regla de potencia

puntoDulce = (cx, ly)
```

Las reflexiones laterales (`reflexionIzq`/`reflexionDer`) se calculan con el
mismo `reflexionEnPlano` genérico que las reflexiones 3D de más abajo
(`eje='x'`, `valorPlano=0` para la izquierda, `valorPlano=W` para la
derecha) — **no** una fórmula 2D aparte. Hasta la ronda de arrastre manual
(ver más abajo) existía una segunda fórmula independiente (`t = xL/(xL+cx)`,
`rpy = spOff + t·(ly−spOff)`) que sólo coincidía con `reflexionEnPlano` por
la simetría de la sala; se unificó porque una disposición manual asimétrica
sí las distingue. El resultado numérico en el caso simétrico no cambia (es
la misma sala del vector de más abajo) — la corrección es de duplicación,
no de resultado.

**Disciplina:** esto predice desde una sala rectangular rígida y se equivoca fácil.
El veredicto de sala nunca es `error`; es disposición **de referencia**, que se
afina midiendo. El frontend ya lo rotula así.

### Vector de prueba (W=3.6, L=5.0)
```
cx=1,80  sep=1,98  spOff=0,75  ly=3,126  xL=0,81  xR=2,79
distanciaEscucha ≈ 2,574 m
reflexionIzq=(0, 1,487)   reflexionDer=(3,6, 1,487)   puntoDulce=(1,8, 3,126)
```

### Reflexiones 3D: trasera, techo, piso

Además de las dos reflexiones laterales de arriba, `sala.ts` calcula 6
reflexiones más (trasera×2, techo×2, piso×2 — una por canal), con el mismo
método de imagen especular generalizado a un eje cualquiera (`x`, `y` o
`z`): reflejar el punto de escucha a través del plano de la superficie y
trazar la recta desde el parlante; donde esa recta cruza el plano es el
punto de reflexión, y la distancia parlante→espejo es igual a la
distancia real del camino reflejado completo (parlante→reflexión→escucha).

```
ALTURA_ESCUCHA_M = 1,0   // altura de oído y de parlante, asumidas iguales — criterio del sitio

reflexionEnPlano(parlante, escucha, eje, valorPlano):
  espejo   = escucha con [eje] = 2·valorPlano − escucha[eje]
  t        = (valorPlano − parlante[eje]) / (espejo[eje] − parlante[eje])
  punto    = parlante + t·(espejo − parlante)          // en los 3 ejes
  distancia = |parlante − espejo|                        // camino reflejado total
```

- **Trasera** (muro en `y = largoM`): mismo método que las laterales, sólo
  que reflejando en el eje Y en vez de en X.
- **Techo/piso** (`z = altoM` / `z = 0`): como parlante y oído comparten
  altura, el punto de reflexión cae siempre en el punto medio horizontal
  entre el parlante y el punto dulce — no es un caso especial, es lo que
  da la misma fórmula cuando ambos extremos comparten altura (t=0,5 sale
  algebraicamente, no se fuerza).

**Por qué asumir `ALTURA_ESCUCHA_M`:** sin una altura de oído/parlante no
hay geometría vertical que calcular, y el catálogo no tiene una altura por
equipo. Se asume la recomendación estándar de instalación (tweeter a la
altura del oído) para poder calcular algo, declarado como supuesto — igual
disciplina que `GANANCIA_SALA` en la sección 2.

### Vectores de prueba de las reflexiones 3D (misma sala, W=3.6, L=5.0, H=2.4)
```
trasera:  espejo de escucha (1,8, 3,126) a través de y=5,0 → (1,8, 6,874)
          reflexionTraseraIzq ≈ (1,4971, 5,0)   reflexionTraseraDer ≈ (2,1029, 5,0)
          distanciaTraseraIzqM = distanciaTraseraDerM ≈ 6,2035 m

techo/piso: punto medio (parlanteIzq, puntoDulce) = (1,305, 1,938)
          distanciaPisoIzqM ≈ 3,2597 m   distanciaTechoIzqM ≈ 3,8034 m
          (simétrico en el canal derecho)
```

### Renderer (`apps/web/src/vista/plano.ts`) — 4 vistas, parlantes como volumen

El renderer isométrico acepta una `Vista = 'isometrica'|'frontal'|'lateral'|
'superior'`: misma geometría, sólo cambia la fórmula de proyección
(`proyectar(p, vista)`) — botones de vista preestablecida; el cambio de
vista sólo re-dibuja, no recalcula nada, `main.ts` cachea la última
`{sala, disposicion, murosVista}` para eso. La vista Superior es además la
única **editable** (arrastre de parlantes) — ver la subsección de más
abajo; las otras 3 siguen siendo de sólo lectura. En vistas ortográficas
(frontal/lateral/superior)
dos etiquetas de muro caen exactamente superpuestas cuando la vista deja
caer el eje que las distingue — se omiten en vez de mostrar texto
amontonado (`frontal` oculta frontal/posterior; `lateral` oculta
izquierdo/derecho; `superior` e `isometrica` muestran las 4).

**Colisión "izquierdo" / "largo" en Superior, corregida.** La etiqueta
"largo" (dimensión, ancla en `z=0`) y la etiqueta de muro "izquierdo"
(ancla en `z=altoM`) comparten el mismo `(x,y)` — se distinguen sólo por
`z`. Superior es la única de las 4 proyecciones que descarta `z`
(`sx=x, sy=y`), así que ahí las dos etiquetas caían exactamente
superpuestas (texto ilegible). Se corrigió dándole a "largo" un offset
horizontal mayor sólo cuando `vista==='superior'` (`dxLargo=-34` en vez
de `-14`), separándolas en dos columnas de texto en vez de una — las
otras 3 vistas no cambian, ahí `z` ya las distinguía. Detectado
visualmente al agrandar el plano (ver más abajo): a 640px de ancho ya
existía, sólo que era menos legible.

Los parlantes se dibujan como una caja de alambre (12 aristas), no un
punto — `ANCHO_PARLANTE_M`/`PROFUNDIDAD_PARLANTE_M`/`ALTO_PARLANTE_M`
(0,20 / 0,25 / 0,34 m) son un tamaño **ilustrativo**, no físico: el
catálogo no tiene dimensiones por equipo, así que esto no alimenta ningún
cálculo, sólo hace que el ícono se lea como un volumen. Centrada en
`alturaM` (el mismo eje acústico asumido para las reflexiones de techo/
piso), sin modelar específicamente parlante de piso vs. de estante.

**Plano más grande dentro de su tarjeta.** `apps/web/src/estilos.css`
tenía `.plan-wrap svg{max-width:640px}` — un tope fijo, no relacionado con
el ancho real disponible de la columna de contenido (~770-800px en
desktop). Se cambió a `max-width:100%`: el SVG llena el ancho de su
`.plan-wrap` (que a su vez llena la tarjeta), limitado sólo por el padding
del `.card`. Como el SVG escala por `viewBox` (proporciones internas
intactas), este cambio de CSS no mueve ni un píxel de la geometría — sólo
la agranda; cualquier problema de superposición de etiquetas que se nota
más a este tamaño (ver el párrafo de la colisión Superior más arriba) ya
existía proporcionalmente al tamaño anterior.

### Disposición manual (`calcularDisposicionManual`) — parlantes independientes

El usuario puede arrastrar cada parlante por separado (no en espejo) en la
vista Superior. `calcularDisposicionManual(sala, parlanteIzq, parlanteDer)`
generaliza `calcularDisposicion(sala)` a dos posiciones arbitrarias, en vez
de derivarlas de las dimensiones de la sala:

```
MARGEN_MURO_MIN_M = 0,15   // distancia mínima de un parlante (o el punto dulce) a cualquier muro

clampPosicionParlante(p, sala, margen=MARGEN_MURO_MIN_M):
  x = clamp(margen, p.x, anchoM − margen)
  y = clamp(margen, p.y, largoM − margen)
```

**El punto dulce se recalcula solo**, no queda fijo en su posición
original. `calcularDisposicion` pone el punto dulce sobre la línea central
de la sala, a `sep·1,2` de distancia detrás de los parlantes — eso
garantiza por construcción que ambos quedan equidistantes de él (triángulo
simétrico). La generalización que preserva esa misma propiedad para dos
parlantes cualesquiera es ponerlo sobre la **mediatriz** del segmento que
los une (el lugar geométrico de los puntos equidistantes de ambos, sea
cual sea su posición), a la misma distancia `sep·1,2` del punto medio, del
lado que se aleja del muro frontal:

```
puntoDulceDesdeParlantes(parlanteIzq, parlanteDer, sala):
  medio = punto medio de (parlanteIzq, parlanteDer)
  sep   = |parlanteDer − parlanteIzq|                 // distancia real, no sólo en X
  dir   = (parlanteDer − parlanteIzq) / sep            // dirección del segmento; (1,0) si sep≈0
  perp  = ⊥dir, el de los dos candidatos (±90°) con mayor componente +Y   // hacia el fondo, no el frente
  offset = clamp(1.0, sep·1.2, largoM − 0.6 − medio.y)
  puntoDulce = clampPosicionParlante(medio + perp·offset, sala)
```

**Consecuencia, no un supuesto aparte:** como el punto dulce queda por
construcción sobre la mediatriz, cada parlante resulta exactamente
equidistante de él — no hace falta declarar qué distancia usar cuando los
parlantes quedan a distinta distancia del oyente (una asimetría real que
la primera versión de esta función iba a resolver con una heurística tipo
"la del parlante más lejano"; no hizo falta). `distanciaEscuchaM` sigue
siendo el mismo cálculo de siempre, `distancia3(parlanteIzq, puntoDulce)`.

**Reducción al caso simétrico:** cuando ambos parlantes comparten la
coordenada Y (el caso de `calcularDisposicion`), esta fórmula da
exactamente el mismo punto dulce que la fórmula simétrica original — no
una coincidencia numérica, es la misma expresión con `dir=(1,0)`,
`perp=(0,1)`. `sala.test.ts` prueba esta reducción llamando
`calcularDisposicionManual` con los parlantes que ya produce
`calcularDisposicion` para la misma sala y comparando cada campo.

**Vector asimétrico (W=4,5, L=6,0, H=2,6), parlantes en diagonal, no
alineados a ningún eje** — prueba de equidistancia por construcción, no un
resultado calculado a mano:
```
parlanteIzq=(0,8, 0,6)   parlanteDer=(3,5, 1,4)
distancia(parlanteIzq, puntoDulce) = distancia(parlanteDer, puntoDulce)   // exacto, salvo punto flotante
```

### Arrastre (`apps/web/src/vista/arrastre.ts`) — primer widget interactivo con mouse del sitio

Un solo listener delegado (`pointerdown`/`pointermove`/`pointerup` vía
Pointer Events, mouse y touch unificados) sobre el contenedor `#plan`
sobrevive a cada repintado del plano — `pintarPlano` sólo reemplaza el
`innerHTML`, no el contenedor, así que no hay que reconectar nada aunque
el propio arrastre dispare un repintado en cada frame. La captura de
puntero (`setPointerCapture`) se pide sobre ese contenedor, no sobre el
elemento bajo el dedo/mouse en el momento del `pointerdown` — ese elemento
puede desaparecer del DOM en el próximo frame (el repintado lo reemplaza)
y perdería la captura con él.

Conversión de coordenadas de pantalla a metros de sala: `svg.
createSVGPoint()` + `getScreenCTM().inverse()` (robusto a cualquier
escalado CSS del SVG) da un punto en unidades de viewBox; de ahí a metros
se invierte `proyeccionSuperior(sala)` — `pad`/`scale` de la vista
Superior (`sx=x, sy=y`, sin trigonometría: es la única de las 4
proyecciones invertible sin resolver un sistema). `construirPlanoSvg`
llama a esta misma función para esa vista, así que dibujo y arrastre no
pueden desincronizarse.

Cada `pointermove` crudo sobreescribe "último punto conocido"; un sólo
callback de `requestAnimationFrame` (agendado sólo si no hay uno
pendiente) dispara el callback de movimiento como máximo una vez por
frame. El `pointerup` fuerza un último flush de esa posición antes de
soltar — sin eso, un arrastre muy rápido (pocos eventos de movimiento
antes de soltar) podía perder la posición final si el frame de rAF
todavía no había corrido.

**Arrastrar es sólo vista previa** (redibuja el plano y el párrafo de
ubicación en vivo) — no toca potencia, puntaje ni "En resumen" hasta que
el usuario confirma con "Recalcular", que congela la posición en curso en
un snapshot completo y lo publica en una segunda pestaña ("Modificado")
junto a "Análisis original" (que nunca se pisa). Cambiar de pestaña
repinta un snapshot ya calculado — nunca recalcula el motor.

---

## 4bis. Modos de sala (`modos.ts`)

**Estado: implementada.** Modos axiales solamente (una sola dimensión) —
son los más fuertes porque no pierden energía en reflexiones múltiples;
tangenciales y oblicuos quedan fuera de este modelo. Mismo supuesto y misma
salvedad que `sala.ts`: sala rígida y rectangular, se verifica midiendo.

```
f(L, n) = n·c / (2·L)     c = 343 m/s (velocidad del sonido, ~20 °C)
```

Se listan los modos de cada eje (ancho, largo, alto) hasta `TECHO_MODOS_HZ =
300` — techo estándar de la región de modos de sala en acústica doméstica
(por encima, la densidad modal es alta y deja de comportarse como
resonancias individuales).

**Agrupamiento:** dos modos de **ejes distintos** (nunca del mismo eje —
ahí son armónicos, no una coincidencia) se consideran agrupados si su
diferencia relativa es menor a `UMBRAL_AGRUPAMIENTO = 0,05` (5 %), y ambos
caen por debajo de `TECHO_AGRUPAMIENTO_HZ = 150` — un techo más estricto que
el de listado, porque por encima de ~150 Hz la densidad modal sube y que dos
modos caigan cerca deja de ser indicio de mala proporción de sala. **Ambos
umbrales son criterio del sitio, no una convención publicada** — igual
salvedad que el umbral de recorrido de volumen de la sección 6.

**Severidad: techo `warn`, nunca `error`** (regla de sala, CLAUDE.md). `ok`
si no hay agrupamiento, `warn` si hay al menos un par.

### Vector de prueba (W=3.6, L=5.0, H=2.4 — la sala por defecto del sitio)

3,6 y 2,4 están en razón exacta 3:2 → el modo de orden 3 del ancho
(142,9167 Hz) coincide exactamente (diferencia 0 Hz) con el de orden 2 del
alto. Resultado: `warn`, con ese par entre los agrupados — la sala de
demostración del sitio tiene, de hecho, un problema real de proporciones.
**Esta sala tiene 4 agrupamientos en total**, no sólo ese: los otros tres
son `{largo orden 2, alto orden 1}` (68,60/71,46 Hz), `{largo orden 4,
ancho orden 3}` (137,20/142,92 Hz) y `{largo orden 4, alto orden 2}`
(137,20/142,92 Hz). El par ancho3/alto2 (diferencia exacta 0 Hz) es el más
"exacto" de los 4, pero **no** es uno de los que efectivamente se grafican
más abajo — ordenados por frecuencia promedio, `TOP_N_AGRUPADOS=2` corta
en `{largo2, alto1}` y `{largo4, ancho3}` (ver la sección siguiente).

Vector de control sin agrupamiento: W=2.5, L=3.0, H=2.2 (sin razones
simples entre ejes) → `ok`.

### Curvas de presión modal (`apps/web/src/vista/curvamodal.ts`)

Sólo cuando hay agrupamiento: una curva 1D por eje afectado, mostrando la
intensidad relativa cos²(n·π·x/L) a lo largo de esa dimensión (0 a L
metros) para cada orden involucrado en algún agrupamiento de ese eje.
**Deliberadamente no es un mapa combinado 2D/3D de la sala** (como los que
producen herramientas de simulación acústica real, ej. BEM/FEM) — eso exige
sumar fase y amplitud relativa de cada modo, dato que este motor no tiene y
no inventa. Son curvas independientes, una por eje, con esa salvedad
explícita en el texto de la tarjeta.

Sólo se grafican los `TOP_N_AGRUPADOS` (= 2) pares de menor frecuencia
promedio — los más audibles y más difíciles de tratar acústicamente. El
resto de los agrupamientos sigue contando en el texto de la tarjeta ("N
par(es)..."), sólo no se dibujan, para no saturar de curvas cuando hay
varios pares (la sala por defecto tiene 4). La tarjeta ya no lista todos
los modos individuales (hasta 300 Hz) — sólo el veredicto, la frase simple,
el aviso de agrupamiento y estas curvas curadas.

`TOP_N_AGRUPADOS` y la función que ordena+corta (`paresMasImportantes`)
viven en `packages/engine/src/modos.ts`, exportadas — antes era lógica
privada duplicada dos veces (`curvamodal.ts` y, a mano, dentro de su propio
test). Se promovió a una sola función compartida porque un segundo
consumidor la necesitaba (el mapa de zonas modales, más abajo): las dos
visualizaciones tienen que curar exactamente el mismo conjunto de pares,
por construcción, no por convención repetida.

**Aviso de filtro de modo activo:** cuando hay agrupamiento, la sugerencia
de la tarjeta (`sugerenciaHtml`) menciona, además de reposicionar
parlantes/punto de escucha, que un filtro paramétrico (EQ activo) centrado
en la frecuencia agrupada también puede atenuar el refuerzo — con la misma
salvedad de siempre: ajustarlo exige medir la sala real, este modelo no
tiene la amplitud ni la fase medidas como para proponer un Q o una
atenuación en dB.

### Mapa de zonas modales (`apps/web/src/vista/mapamodal.ts`)

Capa de fondo en la vista Superior del plano isométrico, sólo cuando hay
agrupamiento: una grilla de celdas coloreadas verde-amarillo-rojo mostrando
dónde, en el plano, coinciden los nodos y antinodos de los mismos pares que
`paresMasImportantes` ya cura para las curvas de arriba.

**Qué es y qué NO es — misma disciplina que las curvas 1D.** No es una
aproximación del campo combinado real de la sala (eso seguiría exigiendo
sumar fase y amplitud entre modos, dato que este motor no tiene y no
inventa — la misma razón por la que las curvas de arriba son 1D y no un
mapa 2D). Es un **mapa de coincidencia geométrica**: para cada modo de los
pares curados, se evalúa su propia condición de nodo/antinodo — la misma
fórmula cos²(n·π·x/L) que ya grafican las curvas 1D — en un punto del
plano en vez de a lo largo de un solo eje. Combinar dos modos es una regla
de combinación declarada, no una física nueva:

```
intensidadModo(modo, punto):
  eje='ancho' → cos²(orden·π·punto.x / anchoM)
  eje='largo' → cos²(orden·π·punto.y / largoM)
  eje='alto'  → cos²(orden·π·ALTURA_ESCUCHA_M / altoM)   // constante: no varía en un plano horizontal

intensidadPar(par, punto) = min(intensidadModo(par.modoA, punto), intensidadModo(par.modoB, punto))
```

**"min", no promedio, dentro de un par:** el refuerzo (verde) exige que
LOS DOS modos estén cerca de su antinodo a la vez; la cancelación (rojo)
es real si CUALQUIERA de los dos tiene un nodo ahí, sin importar el otro.
El promedio borra esa asimetría física — `min` la reproduce directamente.

```
intensidadCombinada(punto, pares) = el valor de intensidadPar(par, punto) más alejado de 0,5,
                                     entre los hasta 2 pares curados.
                                     Empate exacto en |valor−0,5|: gana el más bajo (más "rojo").
```

**"el más extremo gana", no promedio, entre los hasta 2 pares:** promediar
dos pares puede ocultar un problema real de uno detrás de que el otro esté
bien en ese mismo punto (ej. par1≈0 + par2≈1 → promedio≈0,5/"ideal", cuando
en realidad hay un hallazgo real de cancelación en par1 ahí). El empate
exacto (dos pares igual de extremos, en direcciones opuestas) se resuelve
a favor del valor más bajo — mismo sesgo que el resto del sitio: declarar
un hueco antes que taparlo.

**Color:** interpolación lineal (RGB) entre 3 tonos — 0→`#C58474`
(cancelación), 0,5→`#C7AD7C` (equilibrio), 1→`#96B6A2` (refuerzo). Mismos
3 hex que `--alert`/`--warn`/`--ok` del sitio, pero declarados como
variables CSS propias (`--mapa-cancelacion`/`--mapa-equilibrio`/
`--mapa-refuerzo`): ese trío en el resto del sitio codifica un orden
monótono estricto (verde siempre bien, rojo siempre mal); este gradiente
es **divergente** — lo "ideal" (amarillo) está en el medio, no en un
extremo. "Ideal" es sobre *ese* agrupamiento puntual, no una recomendación
general de dónde sentarse — mismo cuidado de alcance que el resto del
sitio ("se verifica midiendo", "criterio del sitio").

**El eje alto da un mapa parejo, y eso es correcto, no un bug.** Un modo
del eje alto no varía en un plano horizontal — se evalúa en
`ALTURA_ESCUCHA_M` (mismo supuesto que las reflexiones de techo/piso),
dando un término constante para ese modo en TODA la sala. Vector de
prueba: el par `{largo orden 2, alto orden 1}` de la sala por defecto —
`alto orden 1` da cos²(π·1,0/2,4) ≈ 0,067 en cualquier punto, un valor
bajo que domina el `min` casi en todas partes salvo donde `largo orden 2`
cae aún más bajo (sus propios nodos) — el mapa de ese par sale
mayormente rojo/parejo en toda la sala, con nada de estructura horizontal
visible. Es información real (esa coincidencia no se refuerza a la altura
de escucha, en ningún punto del piso), no un error de cálculo; la curva 1D
del eje alto (arriba) es la que muestra la variación vertical que este
mapa no puede.

**Resolución de la grilla:** 30 columnas fijas, filas proporcionales a la
razón largo/ancho de la sala (acotadas entre 12 y 50, para no degenerar en
salas muy alargadas). Justificado por el propio dominio: bajo
`TECHO_AGRUPAMIENTO_HZ` (150 Hz) el orden de un modo candidato ronda 7-9
como mucho en el eje más largo típico, así que incluso esta grilla
moderada da varias muestras por semiperíodo — sin aliasing visible para un
mapa de esta naturaleza. Opacidad parcial (0,55) para que el wireframe y
las etiquetas que se dibujan encima sigan leyéndose.

**Sólo vista Superior, sólo con agrupamiento.** `construirMapaModalSvg`
llama a `proyeccionSuperior(sala)` (`apps/web/src/vista/proyeccion.ts` —
extraída de `plano.ts` a un módulo propio para que este mapa la pueda
importar sin crear un ciclo: `plano.ts` inserta la capa del mapa, así que
no puede ser al revés) para alinear la grilla exactamente con el
wireframe/parlantes de esa vista. Devuelve `''` si no hay pares curados —
mismo criterio que las curvas 1D (`agrupados.length === 0` → sin nada que
mostrar).

**No depende de la posición de los parlantes.** `evaluarModos(sala)` sólo
ve las dimensiones de la sala — nunca la disposición de parlantes/escucha
— así que el campo de color es matemáticamente invariante al arrastre; el
mapa se calcula una sola vez por "Analizar" (junto con `resModos`) y viaja
sin cambios en cada repintado, incluidos los frames de arrastre. Lo único
que se mueve encima es el marcador de parlante/punto dulce — que es
exactamente cómo el usuario experimenta "se actualiza al mover los
parlantes": ve su marcador cruzar zonas de color fijas, sin que el motor
tenga que recalcular nada por cuadro.

---

## 4ter. Reverberación estimada — RT60 (`reverberacion.ts`)

**Estado: implementada.** Igual que `modos.ts`, depende sólo de la
geometría de la sala (más los materiales declarados por el usuario) —
nunca de los equipos elegidos, y por eso nunca es `sin-datos`.

**Fórmula — ecuación de Sabine, sumada superficie por superficie** (no un
coeficiente único para toda la sala, ni siquiera un único valor de
"muro": cada muro se orienta y se declara aparte — ver "Historia de la
regla" más abajo):
```
RT60 = 0,161 · V / A

V = anchoM · largoM · altoM                       (volumen, m³)
S_frontal = S_posterior = anchoM · altoM          (m²)
S_izquierdo = S_derecho = largoM · altoM          (m²)
S_piso = S_techo = anchoM · largoM                (m²)

A = α_frontal·S_frontal + α_posterior·S_posterior + α_izquierdo·S_izquierdo
  + α_derecho·S_derecho + α_piso·S_piso + α_techo·S_techo    (sabines)
```

El usuario elige un **material por cada muro orientado** (frontal,
posterior, izquierdo, derecho) más piso y techo — 6 selectores
independientes en la pantalla de configuración. Cada material tiene un
coeficiente de absorción de Sabine declarado — **criterio del sitio**,
valores típicos de literatura de acústica arquitectónica (banda media,
~500 Hz–1 kHz), no una medición real:

```
MaterialMuro    α       MaterialPiso        α       MaterialTecho   α
hormigón        0,02    hormigón            0,02    hormigón        0,02
vidrio/ventanal 0,03    madera laminado     0,05    madera          0,11
madera          0,11    porcelanato         0,01    yeso cartón     0,06
yeso cartón     0,08    alfombra            0,28    panel acústico  0,75
panel acústico  0,75
vacío           1,00
```

Hormigón/vidrio/porcelanato son muy reflectantes (superficies duras, no
porosas); madera y placas sobre bastidor absorben algo más por resonancia
de panel; panel acústico dedicado y alfombra son los únicos materiales
"normales" de absorción alta. **`vacio`** (sólo disponible para muros, no
para piso/techo) representa una abertura — vano, pasillo, ambiente
integrado — y usa **α=1,0**, el coeficiente de referencia histórico de
Sabine (1900): "ventana abierta", nada de lo que llega ahí vuelve a la
sala. No es una estimación del sitio, es la convención estándar de toda
tabla de coeficientes de absorción para una abertura. Cuando un muro es
`vacio`, el plano isométrico (ver sección 4) tampoco dibuja su reflexión
— el sonido se escapa, no rebota.

El default del sitio es yeso cartón en los 4 muros + techo, madera
laminado en el piso — terminaciones residenciales comunes, sin alfombra
ni tratamiento — y da, a propósito, una sala bastante viva: no se fuerza
un resultado "ok" de fábrica sólo para que la pantalla inicial se vea
bien.

**Rango cómodo declarado** para escucha crítica en una sala doméstica:
`RT60_MIN_OK_S = 0,3` a `RT60_MAX_OK_S = 0,6` segundos (una sala de
concierto apunta mucho más alto, ~1,5–2,5 s, porque es otro tipo de
espacio — la tarjeta lo aclara para que el número no se lea fuera de
contexto).

**Severidad: techo `warn`, nunca `error`** (regla de sala, CLAUDE.md):
```
rt60 < RT60_MIN_OK_S                        warn   codigo: 'rt60-corto'  ("Muy seca")
RT60_MIN_OK_S ≤ rt60 ≤ RT60_MAX_OK_S        ok     codigo: 'rt60-ok'     ("En rango")
rt60 > RT60_MAX_OK_S                        warn   codigo: 'rt60-largo'  ("Muy viva")
```

Aparece en "En resumen" (fortaleza si `ok`, debilidad si `warn`) pero
**no participa del puntaje 1-10 de `puntaje.ts`** — es informativa, igual
que el plano de reflexiones; los pesos declarados en la sección 7 no
cambian.

### Vectores de prueba (sala por defecto, 3,6×5,0×2,4 m)
```
V = 43,2 m³; S_frontal=S_posterior=8,64 m²; S_izquierdo=S_derecho=12,00 m²; S_piso=S_techo=18,00 m²

los 4 muros=yesoCarton, piso=maderaLaminado, techo=yesoCarton (default del sitio)
  A = 0,08·(8,64·2+12·2) + 0,05·18 + 0,06·18 = 5,2824   RT60 ≈ 1,317 s → "warn" ("Muy viva")
  (mismo total que el modelo de un solo "muro": decomponer una superficie con el
  mismo material en sub-superficies no cambia la absorción total)

muroFrontal=vacío, resto = default (abertura al frente, ej. living integrado)
  A = 1,0·8,64 + 0,08·8,64 + 0,08·24 + 0,05·18 + 0,06·18 = 13,2312
  RT60 ≈ 0,526 s → "ok" ("En rango") — la abertura por sí sola resuelve una sala
  que sin ella era demasiado viva

frontal=posterior=panelAcustico, izquierdo=derecho=madera, piso=alfombra, techo=panelAcustico (muy tratada)
  A = 0,75·17,28 + 0,11·24 + 0,28·18 + 0,75·18 = 34,14   RT60 ≈ 0,204 s → "warn" ("Muy seca")
```

**Historia de la regla.** Primera versión (Fase 6): un solo selector "tipo
de sala" (moderna/balanceada/tratada) con un coeficiente promedio único
para toda la sala. Segunda versión: un solo selector "muro" aplicado a
toda la superficie de muros combinada, más piso/techo separados —
reemplazó el "tipo de sala" por ser más granular y defendible (el número
sale de un material que el usuario puede señalar en su sala real, no de
una etiqueta abstracta como "balanceada"). Versión actual: cada muro se
orienta y se declara aparte (frontal/posterior/izquierdo/derecho), con la
opción `vacio` para aberturas — motivado por el mismo criterio de
granularidad: una sala real casi nunca tiene los 4 muros iguales (un
ventanal al frente, una pared compartida al costado, un pasillo abierto
atrás), y el plano isométrico (sección 4) necesita saber qué muro es cuál
para no dibujar una reflexión donde no hay pared.

**Selector de tipo de música (género):** ver sección 2bis — comparte
pantalla de configuración con los materiales de sala, pero informa la
tarjeta de potencia, no ésta.

---

## 5. Lo que el motor todavía NO hace

- Subwoofer, cables.
- Modo "buscar" (llenar un hueco con candidatos) y modo "proponer" (armar cadenas
  desde un presupuesto).
- **Factor de amortiguamiento real:** exige la impedancia de salida del
  amplificador, dato que hoy el catálogo no tiene para ningún amplificador
  (sí para streamers/DACs, ver sección 6). Pendiente de una tanda de
  catálogo que la agregue.
- **Audibilidad del piso de ruido (noise floor):** exige la relación
  señal/ruido (SNR) de streamers/DACs, dato que el catálogo tampoco tiene
  todavía.
- **Ubicación de parlantes: regla de Cardas vs. tercios.** Hoy `sala.ts`
  calcula una disposición de referencia única (triángulo simétrico); las
  fórmulas alternativas de posicionamiento quedan para una sesión aparte.

Estas reglas ya están especificadas en los docs del proyecto anterior; el motor
implementa potencia, carga, geometría, modos de sala, reverberación y
ganancia de cadena (secciones 2, 2bis, 3, 4, 4bis, 4ter, 6).

**Sobre `cables` en `packages/data/src/catalogo.ts`:** tiene datos curados
(fuente y confianza, mismo estándar que el resto), pero **todavía no tiene ni
diseño de regla** (afecta el puente de impedancias por su capacitancia/
resistencia en serie, pero es un efecto de segundo orden que queda para más
adelante). `streamers` y `dacs` (dos categorías separadas del catálogo,
mismo esquema `FuenteCat`) sí tienen su regla implementada — ver sección 6.

---

## 6. Ganancia de cadena / puente de impedancias fuente→amplificador

**Estado: implementada** (`packages/engine/src/ganancia.ts`,
`evaluarPuenteImpedancias` y `evaluarRecorridoVolumen`). Es una regla
**opcional**: sólo corre si el usuario agrega una fuente (streamer o DAC) a
la cadena — en `apps/web`, el selector "Fuente digital" no es obligatorio, y
las dos tarjetas de resultado sólo aparecen si se eligió una. No reemplaza ni
condiciona el veredicto de potencia/carga que ya existe entre parlante y
amplificador — ese sigue funcionando igual con o sin fuente declarada.

La pregunta no es una sino dos, físicamente distintas:

1. ¿La impedancia de salida de la fuente es lo bastante baja frente a la
   impedancia de entrada del ampli como para transferir la señal sin pérdida
   ni interacción con el cable? (puente de impedancias / *voltage bridging*)
2. ¿La tensión que entrega la fuente alcanza para que el ampli llegue a la
   potencia nominal que usa la regla de potencia? Y si alcanza de sobra,
   ¿cuánto recorrido útil le queda al potenciómetro de volumen?

Aplica entre una **fuente** (`salidaV` / `impedanciaSalidaOhm`) y un
**amplificador** (`sensEntradaMv` / `impedanciaEntradaOhm`) — los cuatro
campos ya existen en el esquema (sección 1) y ya están poblados en
`packages/data/src/catalogo.ts` para 3 streamers, 3 DACs y los 8
amplificadores.

### 6.1 Puente de impedancias

**Constante del modelo** (convención de ingeniería de audio, no dato del
equipo — declararla como tal):
- `RATIO_BRIDGING_OK = 10` — convención estándar de *voltage bridging* en
  audio profesional (Rane "Sound System Interconnection"; Bill Whitlock /
  Jensen Transformers): la entrada debe tener al menos 10× la impedancia de
  salida de la fuente para que la pérdida de nivel sea despreciable (<1 dB) y
  la respuesta en frecuencia no dependa de la capacitancia del cable.

```
si impedanciaSalidaOhm (fuente) es null o impedanciaEntradaOhm (amp) es null:
    → sin-datos codigo: 'sin-dato'

si no:
    ratioZ = impedanciaEntradaOhm / impedanciaSalidaOhm

    ratioZ ≥ 10    → ok     codigo: 'puente-correcto'
    1 ≤ ratioZ < 10 → warn  codigo: 'puente-ajustado' — pérdida de nivel/graves
                             medible con cables largos o de alta capacitancia
    ratioZ < 1      → alert codigo: 'puente-insuficiente' — la fuente no puede
                             manejar esa entrada, pérdida de nivel significativa
```

El corte en 10:1 es citable (convención de la industria). El corte en 1:1
entre `warn` y `alert` es la frontera física obvia (por debajo de 1:1 la
fuente ve más carga que su propia impedancia de salida), no una convención
publicada — si preferís otro punto, se mueve fácil.

### 6.2 Suficiencia de tensión y recorrido de volumen

```
margenV = salidaV (fuente) / (sensEntradaMv (amp) / 1000)
```

`sensEntradaMv` es la tensión que el ampli necesita a la entrada para
entregar `potencia8OhmW` — es el mismo dato que ya está en el catálogo, no
uno nuevo.

```
si salidaV (fuente) es null o sensEntradaMv (amp) es null:
    → sin-datos codigo: 'sin-dato'

si no:
    margenV < 1                     → alert codigo: 'insuficiente' — la
                                        fuente no llega a la tensión que el
                                        ampli necesita para su potencia
                                        nominal; el margen calculado por la
                                        regla de potencia deja de ser válido
                                        con esta fuente conectada.
    1 ≤ margenV ≤ UMBRAL_RECORRIDO   → ok    codigo: 'recorrido-sano'
    margenV > UMBRAL_RECORRIDO       → warn  codigo: 'recorrido-corto' — se
                                        usa sólo una fracción baja del
                                        potenciómetro; el sistema funciona
                                        pero con menos resolución de volumen
                                        en el rango de escucha habitual.
```

**`UMBRAL_RECORRIDO = 10`.** A diferencia de `RATIO_BRIDGING_OK`, no existe un
número equivalente y citable para "a partir de cuántas veces de sobra el
recorrido del volumen se siente corto" — con los pares reales del catálogo el
rango va de ~5,7× (Topping E30 II → Cambridge CXA81, vector A abajo) a ~19×
(Schiit Modi+ → Denon PMA-600NE, vector B). Siguiendo la regla del proyecto
("no inventes umbrales, si falta un número se pregunta"), se preguntó y se
fijó en **10×** — mismo orden de magnitud que `RATIO_BRIDGING_OK`, y dentro
del rango que separa el vector A (`ok`) del B y el C (`warn`).

**Confianza:** el veredicto hereda la peor confianza entre `salidaV` /
`impedanciaSalidaOhm` de la fuente y `sensEntradaMv` / `impedanciaEntradaOhm`
del ampli.

### Vectores de prueba

Con datos reales de `packages/data/src/catalogo.ts` salvo donde se indica
"sintético". Reproducidos también contra el catálogo real (buscando por id,
no fixtures copiadas) en `apps/web/src/datos/adaptadores.test.ts`.

```
A · Topping E30 II (2,1 V, 20 Ω) → Cambridge CXA81 (370 mV, 43 kΩ)
    ratioZ = 43000/20 = 2150       → ok "Puente correcto"
    margenV = 2,1/0,370 = 5,68     → ok "Recorrido sano" (bajo cualquier
                                       umbral razonable)

B · Schiit Modi+ (2,0 V, 75 Ω) → Denon PMA-600NE (110 mV, 30 kΩ)
    ratioZ = 30000/75 = 400        → ok "Puente correcto"
    margenV = 2,0/0,110 = 18,18    → warn "Recorrido corto" — el caso más
                                       exigente de la base actual; define el
                                       umbral que falta

C · Bluesound Node (2,2 V, 500 Ω) → Rega Brio (210 mV, 47 kΩ)
    ratioZ = 47000/500 = 94        → ok "Puente correcto" (a pesar de la
                                       impedancia de salida alta del Bluesound)
    margenV = 2,2/0,210 = 10,48    → warn "Recorrido corto"

D · NAD C316BEE V2 (sensEntradaMv=200, impedanciaEntradaOhm=null) + Schiit Modi+
    ratioZ: sin impedanciaEntradaOhm → sin-datos (6.1)
    margenV = 2,0/0,200 = 10       → corre igual (6.2) — dato parcial, no
                                       todo el equipo está en null

E · Cambridge CXN V2 (salidaV=null, impedanciaSalidaOhm=null) + cualquier ampli
    → sin-datos en 6.1 y en 6.2 (la ficha oficial no publica esos valores)

F · Hegel H95 (sensEntradaMv=null, impedanciaEntradaOhm=null) + cualquier fuente
    → sin-datos en 6.1 y en 6.2

G (sintético) · fuente de 50 mV → Denon PMA-600NE (110 mV)
    margenV = 0,050/0,110 = 0,45   → alert "Insuficiente" — ejemplo: una
                                       salida de línea muy débil o un tape
                                       deck antiguo sin preamplificar

H (sintético) · fuente con impedanciaSalidaOhm=15000 Ω → ampli con
  impedanciaEntradaOhm=10000 Ω
    ratioZ = 10000/15000 = 0,67    → alert "Puente insuficiente"

I · WiiM Pro Plus (2,0 V, 10 Ω) → Cambridge CXA81 (370 mV, 43 kΩ)
    ratioZ = 43000/10 = 4300       → ok "Puente correcto"
    margenV = 2,0/0,370 = 5,41     → ok "Recorrido sano"
    Agregado en el Paso 9 de la migración a Vite: la impedancia de salida
    del WiiM Pro Plus no la publica el fabricante, pero Hi-Fi News la midió
    de forma independiente en 10 Ω (hifinews.com/content/wiim-pro-plus-
    lab-report) — antes de esto, este par daba "sin-datos" en 6.1. La
    salida del WiiM es además configurable por el usuario (500 mV/800 mV/
    1 V/2 V); 2,0 V es el máximo, no un valor fijo — ver
    packages/data/src/catalogo.ts para la cita completa.

---

## 7. Puntaje del match (`puntaje.ts`) — CAPA CRITERIO-EDITORIAL

**Estado: implementada.** A diferencia de todo lo anterior (secciones 2-4bis
y 6), esto **no es física**: es un único número 1-10 que combina las
severidades ya calculadas por las reglas de arriba, con pesos que este sitio
declara desde su criterio. Ver CLAUDE.md, "Las dos capas" — se rotula en
pantalla como "Criterio editorial, no física", nunca junto a un veredicto de
capa física.

`puntaje.ts` no decide severidades — sólo las combina. Recibe una lista de
`{ nombre, peso, severidad }` por componente (`severidad: null` si el
componente no aplica a este match, ej. sin streamer ni dac elegido). La
lista tiene entre 4 y 8 elementos según cuántas fuentes se eligieron —
ver "Streamer + DAC simultáneos" más abajo.

### Pesos declarados

| Componente | Peso | Por qué |
|---|---|---|
| Potencia | 24 % | Riesgo real: recorte audible si no alcanza |
| Carga | 20 % | Riesgo real: amplificador forzado en cargas duras |
| Modos de sala | 10 % | De la sala, no de la combinación de equipos — mismo techo de severidad que reverberación |
| Reverberación (RT60) | 10 % | Ídem modos — hallazgo de sala, mismo peso por compartir el mismo techo de severidad |
| Puente de impedancias (por fuente) | 10 % | Ajuste fino de ganancia, no un riesgo de falla — evaluado por separado para streamer y para DAC |
| Recorrido de volumen (por fuente) | 8 % | Ergonómico — el sistema funciona igual, sólo cambia la resolución del volumen — evaluado por separado para streamer y para DAC |

Potencia:carga mantiene la razón 1,2:1 de la tabla original de 5
componentes. Suman 1 (`puntaje.test.ts` lo verifica). **Son un criterio,
no un dato medido** — otro sitio razonable pesaría distinto.

### Puntos por severidad

`ok` = 10 · `warn` = 5 · `alert` = 0. `sin-datos` (o componente no
aplicable) se **excluye**, no puntúa ni penaliza — mismo principio que el
resto del proyecto ("dato faltante nunca es `ok`"). El puntaje final es el
promedio ponderado sólo de los componentes evaluados, re-normalizado sobre
la suma de sus pesos — así un componente sin dato no arrastra el número
hacia abajo simplemente por faltar.

`componentesEvaluados`/`componentesTotales` viaja en el resultado para que,
si faltó algo, el sitio lo declare (aviso explícito: "calculado sobre N de
M componentes"). `componentesTotales` es **variable** (4 sin ninguna fuente
elegida, 6 con una, 8 con streamer y DAC a la vez) — refleja cuántos
componentes son realmente aplicables a este match, no un máximo fijo con
casilleros vacíos.

**Piso de 1,0, nunca 0** (`Math.max(1, Math.round(promedio*10)/10)`): la
escala declarada es 1-10, con **un decimal** (ej. `8,7`) — antes redondeaba
a un entero.

### Color del número (`clasificarPuntaje`)

El número en pantalla lleva color — verde/naranjo/rojo — según umbrales
declarados junto a los pesos (mismo criterio del sitio, no un dato físico):

```
puntaje ≥ UMBRAL_PUNTAJE_VERDE (8)      clase 'ok'     verde  (--ok)
UMBRAL_PUNTAJE_NARANJO (5) ≤ puntaje < 8 clase 'warn'   naranjo (--warn)
puntaje < UMBRAL_PUNTAJE_NARANJO (5)     clase 'alert'  rojo   (--alert)
```

Alineados a los puntos por severidad de arriba: "todo ok" da 10 (verde),
"todo warn" da 5 (justo en el borde naranjo), "todo alert" da 1 (rojo). El
color vive en el número mismo (`<b id="pt-puntaje">`, clases CSS
`puntaje-ok/warn/alert`), **nunca** con el componente `pintarVerdict` que
usan los veredictos de capa física (el mismo pill/badge) — sigue rotulado
"Criterio editorial, no física" y en su propia tarjeta; la distinción de
capas es de layout y rotulado, no de si hay o no color.

### Streamer + DAC simultáneos

Desde que el sitio permite elegir streamer y DAC a la vez (ver CLAUDE.md),
puente y recorrido se puntúan **por separado para cada fuente** —
`puenteStreamer`/`recorridoStreamer`/`puenteDac`/`recorridoDac`, cuatro
componentes en vez de dos, cada uno con su propio peso. Antes se combinaban
con `peorSeveridad()` (si cualquiera de las dos fuentes tenía un problema,
el puntaje entero lo reflejaba); ahora un problema en el puente del
streamer no le baja la nota al puente del DAC — cada fuente vota por sí
misma. `peorSeveridad()` se queda exportada en `puntaje.ts` (documentada,
sin este call site) por si sirve para otra combinación a futuro.

### Vector de prueba

Los 8 componentes en `ok` → 10,0/10. Los 8 en `alert` → 1,0/10 (piso, nunca
0). Sin streamer ni dac, sólo los 4 componentes base — potencia=ok,
carga=`sin-datos`, modos=warn, reverberación=ok → evaluados sobre 3:
`(0,24·10 + 0,10·5 + 0,10·10) / 0,44 = 3,9/0,44 ≈ 8,8636` → 8,9/10. Con
streamer y dac elegidos a la vez, puenteStreamer=alert y puenteDac=ok
simultáneamente en el mismo resultado (0/10 y 10/10 respectivamente, sin
contagiarse) — el vector que prueba exactamente la diferencia con el
`peorSeveridad()` combinado de antes. Vectores completos en
`packages/engine/src/puntaje.test.ts`.
```
