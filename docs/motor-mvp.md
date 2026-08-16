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

// primer punto de reflexión en muros laterales (método de la imagen espejo)
t   = xL / (xL + cx)
rpy = spOff + t·(ly − spOff)
reflexionIzq = (0, rpy)
reflexionDer = (W, rpy)

puntoDulce = (cx, ly)
```

**Disciplina:** esto predice desde una sala rectangular rígida y se equivoca fácil.
El veredicto de sala nunca es `error`; es disposición **de referencia**, que se
afina midiendo. El frontend ya lo rotula así.

### Vector de prueba (W=3.6, L=5.0)
```
cx=1,80  sep=1,98  spOff=0,75  ly=3,126  xL=0,81  xR=2,79
distanciaEscucha ≈ 2,574 m
t≈0,3103   rpy≈1,487
reflexionIzq=(0, 1,487)   reflexionDer=(3,6, 1,487)   puntoDulce=(1,8, 3,126)
```

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

---

## 5. Lo que el motor todavía NO hace

- Subwoofer, cables.
- Modo "buscar" (llenar un hueco con candidatos) y modo "proponer" (armar cadenas
  desde un presupuesto).

Estas reglas ya están especificadas en los docs del proyecto anterior; el motor
implementa potencia, carga, geometría y ganancia de cadena (sección 6).

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
componente no aplica a este match, ej. sin streamer ni dac elegido).

### Pesos declarados

| Componente | Peso | Por qué |
|---|---|---|
| Potencia | 30 % | Riesgo real: recorte audible si no alcanza |
| Carga | 25 % | Riesgo real: amplificador forzado en cargas duras |
| Puente de impedancias | 17 % | Ajuste fino de ganancia, no un riesgo de falla |
| Recorrido de volumen | 13 % | Ergonómico — el sistema funciona igual, sólo cambia la resolución del volumen |
| Modos de sala | 15 % | De la sala, no de la combinación de equipos — el sitio eligió incluirlo igual |

Suman 1 (`puntaje.test.ts` lo verifica). **Son un criterio, no un dato
medido** — otro sitio razonable pesaría distinto.

### Puntos por severidad

`ok` = 10 · `warn` = 5 · `alert` = 0. `sin-datos` (o componente no
aplicable) se **excluye**, no puntúa ni penaliza — mismo principio que el
resto del proyecto ("dato faltante nunca es `ok`"). El puntaje final es el
promedio ponderado sólo de los componentes evaluados, re-normalizado sobre
la suma de sus pesos — así un componente sin dato no arrastra el número
hacia abajo simplemente por faltar.

`componentesEvaluados`/`componentesTotales` viaja en el resultado para que,
si faltó algo, el sitio lo declare (aviso explícito: "calculado sobre N de
M componentes").

**Piso de 1, nunca 0** (`Math.max(1, Math.round(promedio))`): la escala
declarada es 1-10.

### Streamer + DAC simultáneos

Desde que el sitio permite elegir streamer y DAC a la vez (ver CLAUDE.md),
puente/recorrido pueden tener hasta dos resultados por match. Se combinan
con `peorSeveridad()` (mismo idioma que `peorConfianza()` en tipos.ts): si
cualquiera de las dos fuentes elegidas tiene un problema, el puntaje lo
refleja. Si ambas están en `sin-datos`, el componente completo queda
`sin-datos` (excluido); si al menos una tiene severidad real, se usa la
peor de las reales.

### Vector de prueba

Los 5 en `ok` → 10/10. Los 5 en `alert` (menos modos, que nunca es `alert`)
→ 1/10. Sin streamer ni dac (puente=null, recorrido=null), potencia=ok,
carga=warn, modos=ok → evaluados sobre 3 componentes:
`(0,30·10 + 0,25·5 + 0,15·10) / 0,70 = 5,75/0,70 ≈ 8,21` → 8/10. Vectores
completos en `packages/engine/src/puntaje.test.ts`.
```
