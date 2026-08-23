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

**Corregida tras una auditoría externa** que encontró 7,25 dB de error
acumulado en el SPL disponible: tres defectos que se cancelaban
parcialmente entre sí, por eso ningún test los detectaba en la versión
anterior de este documento. Los tres:

1. **Convención de sensibilidad sin normalizar.** `sensibilidadDb` está
   citada en dB/2,83V·m, pero eso sólo equivale a dB/1W·m cuando la
   impedancia nominal es 8 Ω — a 4 Ω, 2,83V entrega el doble de potencia
   real, y la cifra citada sobreestima el SPL en ~3 dB. `Parlante` suma
   `sensibilidadConvencion: '2.83V' | '1W' | null`: `'2.83V'` normaliza
   con `sensibilidadA1WDb()` (`unidades.ts`); `'1W'` usa el valor tal
   cual. Cuando es `null` (la fuente no declara cuál usó), el tratamiento
   depende de la impedancia — ver "Convención desconocida: rango, no un
   sello de confianza" más abajo, una segunda vuelta sobre este mismo
   punto tras feedback directo sobre la primera versión.
2. **Potencia a 8 Ω usada siempre**, aunque el parlante fuera de 4 Ω y el
   catálogo tuviera `potencia4OhmW`. Ahora: si `impedanciaNominalOhm ≤ 4`
   y el amplificador publica `potencia4OhmW`, se usa ese valor; si no lo
   publica, se usa `potencia8OhmW` como aproximación y se marca
   `potenciaDeCargaEstimada: true`.
3. **Las dos constantes del modelo estaban infladas.**

**Constantes del modelo** (declararlas como tales, son supuestos):
- `SUMA_PAR_DB = 3` dB (antes 6) — +6 dB sólo vale para contenido
  correlacionado (graves prácticamente mono); el contenido estéreo
  descorrelacionado, que es casi toda la música en medios y agudos, suma
  +3 dB (dominio de potencia, fuentes incoherentes).
- `GANANCIA_SALA_DB = 3` dB — **ya no se suma al SPL de banda ancha**
  (antes sí, sin condición de frecuencia): ese refuerzo aparece
  físicamente bajo la frecuencia del modo axial de la dimensión mayor de
  la sala, no en todo el rango. Se expone como información en
  `ResultadoPotencia` (`gananciaSalaDb`/`frecuenciaGananciaSalaHz`,
  `f = 343 / (2·dimensionMayorSalaM)`) para que la tarjeta lo declare sin
  regalarlo en el cómputo general — `evaluarPotencia()` recibe
  `dimensionMayorSalaM` como parámetro explícito.

**Nivel de escucha → SPL de pico objetivo** (dB en el punto de escucha):
```
moderado    90
alto       100
referencia 105
```

**Fórmula:**
```
sensibilidadRangoAplica = sensibilidadConvencion===null && impedanciaNominalOhm<8

sensibilidadEfectivaDb = sensibilidadConvencion==='2.83V'
                            ? sensibilidadA1WDb(sensibilidadDb, impedanciaNominalOhm)
                            : sensibilidadRangoAplica
                              ? sensibilidadA1WDb(sensibilidadDb, impedanciaNominalOhm)  // extremo PESIMISTA
                              : sensibilidadDb   // '1W', o null a ≥8Ω donde no hay ambigüedad real

potenciaUsadaW = (impedanciaNominalOhm≤4 && potencia4OhmW) ? potencia4OhmW
               : potencia8OhmW   // si ≤4Ω sin dato a 4Ω: potenciaDeCargaEstimada=true

SPL_disponible = sensibilidadEfectivaDb
               − 20·log₁₀(distanciaM)      // atenuación por distancia
               + 10·log₁₀(potenciaUsadaW)  // ganancia por potencia
               + SUMA_PAR_DB

margen = SPL_disponible − pico_objetivo
```
`splDisponibleDb`/`margenDb` son siempre el extremo pesimista cuando
`sensibilidadRangoAplica`; el extremo optimista (`sensibilidadDb` tal
cual, sin corregir) se expone aparte en `sensibilidadEfectivaRangoDb`/
`splDisponibleRangoDb`/`margenRangoDb` — ver más abajo.

**Veredicto** (por `margen`, en dB — umbrales sin cambios). El motor
devuelve `codigo` — no texto; la traducción a pantalla vive en
`apps/web/src/idioma/{es,en}.ts`:
```
margen ≥ 3     ok      codigo: 'con-margen'
0 ≤ margen < 3 warn    codigo: 'justo'
margen < 0     alert   codigo: 'insuficiente'
```

**Aviso extra:** si `potenciaRecMinW` no es null y `potencia8OhmW < potenciaRecMinW`,
el motor agrega a `avisos[]` un `{ codigo: 'bajo-potencia-recomendada',
recomendadaW, entregadaW }` — números en crudo, sin redactar la frase (eso
también es tarea del diccionario, no del motor). Sin cambios: sigue
comparando siempre contra `potencia8OhmW`, no contra `potenciaUsadaW` —
es una pregunta distinta (¿hay potencia bruta mínima recomendada?), no
la de qué carga ve el amplificador.

**Confianza:** el veredicto hereda la peor confianza entre `sensibilidadDb`
y la potencia REALMENTE usada (4 Ω u 8 Ω) — y se degrada a `'baja'` sólo
cuando `sensibilidadRangoAplica` (convención `null` Y `impedanciaNominalOhm
< 8`). A 8 Ω o más NO degrada, aunque la convención sea `null`: ver el
punto siguiente.

### Convención desconocida: rango, no un sello de confianza

**Primera versión de este cambio (revertida tras feedback):** degradaba
la confianza a `'baja'` para *cualquier* `sensibilidadConvencion===null`,
sin mirar la impedancia. El problema: a 8 Ω, 2,83V y 1W difieren <0,01 dB
— no hay ambigüedad real que declarar, así que degradar ahí es un sello
genérico sobre un dato que en la práctica no la tiene, y diluye la señal
justo donde sí importa (4 Ω, donde la diferencia puede ser >3 dB).

**Corregido:** `sensibilidadRangoAplica = sensibilidadConvencion===null &&
impedanciaNominalOhm<8`. Cuando es `true`:
- La confianza SÍ degrada a `'baja'` — acá la ambigüedad es real.
- `sensibilidadEfectivaDb` (y por lo tanto `splDisponibleDb`/`margenDb`,
  y el `codigo`/`severidad` que de ahí salen) usan el extremo
  **pesimista** — `sensibilidadA1WDb(sensibilidadDb, impedanciaNominalOhm)`,
  como si la fuente hubiera citado a 2,83V — conservador, coherente con
  el resto del motor ("un dato faltante nunca es `ok`").
- El extremo **optimista** (`sensibilidadDb` tal cual, como si ya
  estuviera a 1W) se expone en `sensibilidadEfectivaRangoDb`/
  `splDisponibleRangoDb`/`margenRangoDb` (todos `[pesimista, optimista]`)
  — no como un número más impreciso, sino como información: "si tu
  parlante ya reporta a 1W, el margen real es X en vez del Y de arriba".

Cuando `sensibilidadConvencion===null` pero `impedanciaNominalOhm≥8`,
nada de esto aplica: `sensibilidadEfectivaDb` usa el valor citado tal
cual (como si fuera `'1W'`), la confianza no degrada, y los tres campos
de rango quedan en `null` — la ambigüedad se declara igual
(`sensibilidadSinConvencion` sigue `true`) pero sin consecuencia
numérica ni de confianza, porque no la tiene.

**Límite declarado, no corregido: el corte en 8 Ω es sobre impedancia
NOMINAL, no la impedancia real en la banda donde se mide sensibilidad.**
Un parlante "de 8 Ω nominales" suele caer en 6-6,5 Ω reales en esa banda
— a 6 Ω, 2,83V son 1,33 W, una diferencia de ~1,25 dB (no los <0,01 dB
del caso idealizado a exactamente 8 Ω). Es decir: para varios parlantes
de 8 Ω nominales del catálogo, la ambigüedad real de convención puede
rondar el orden de 1 dB, no cero — el motor no lo ve porque no tiene la
impedancia media medida por equipo (sólo `impedanciaNominalOhm`, un
número redondo de ficha), y asumir una impedancia real inventaría un
dato que el catálogo no tiene. Deliberadamente **no se corrige** — exigiría
un dato que no existe en ningún equipo del catálogo — pero queda escrito
acá para que quien audite el modelo lo encuentre declarado, no
descubierto.

### Rango que cruza un umbral de severidad: el veredicto mismo es incierto

Cuando `sensibilidadRangoAplica`, el extremo pesimista y el optimista de
`margenRangoDb` pueden caer en `codigo` distintos — no sólo "el margen
cambia unos dB", sino "insuficiente" en un extremo y "con margen" (o
"justo") en el otro. `ResultadoPotencia` expone esto explícitamente:

- `codigoRangoOptimista: CodigoPotencia | null` — el `codigo` que
  resultaría con el extremo optimista de `margenRangoDb`, calculado con
  la misma función de clasificación que el `codigo` headline (extraída a
  `clasificarMargen()` para no duplicar los tres umbrales en dos
  lugares).
- `margenCruzaUmbral: boolean` — `true` cuando `codigoRangoOptimista`
  difiere de `codigo`.

Cuando `margenCruzaUmbral`, la vista (`modeloPotencia`, `apps/web`)
**reemplaza** el `simpleHtml` normal (el que declara % de capacidad
usada) por un texto que nombra los dos códigos posibles y declara que
falta el dato de convención para decidir cuál aplica — es la pieza más
accionable de toda esta corrección: convierte un hueco de datos de
catálogo en información explícita ("esto va de insuficiente a con
margen"), no en un número pesimista mostrado como si fuera el único
resultado posible. El `calcHtml` también usa una variante propia
(`sensibilidadRangoCruzaUmbralHtml`, distinta de `sensibilidadRangoHtml`)
que nombra los dos códigos en vez de sólo los números.

Vector de prueba (sintético, `packages/engine/src/potencia.test.ts`):
parlante de 1 Ω (fuera del rango real de un parlante, a propósito, para
separar los extremos lo bastante) con `sensibilidadDb=92`, convención
`null`; amplificador de 40 W sin `potencia4OhmW`; distancia 2,0 m, nivel
alto. Pesimista: sensibilidad≈82,96 dB → margen≈−4,04 dB → `"insuficiente"`.
Optimista: sensibilidad=92 dB → margen=5,0 dB → `"con-margen"`. Los dos
extremos caen en `codigo` distintos → `margenCruzaUmbral=true`.

### Vectores de prueba (recalculados)

Klipsch RP-600M II y KEF LS50 Meta son ambos de 8 Ω nominales y ninguno
declara `sensibilidadConvencion` en su fuente citada — los cambios 1 y 2
no les mueven el número (2,83V sobre 8Ω ≈ 1W), y `sensibilidadRangoAplica`
es `false` para los dos (≥8Ω), así que su confianza **no** degrada: A
sigue en `'media'`, B y C en `'alta'`, igual que antes de esta ronda.
Todo el movimiento de SPL en A/B/C es el cambio 3: una baja neta de
exactamente 6 dB (SUMA_PAR_DB −3, GANANCIA_SALA_DB −3 ya no sumado).

```
A · sens=86 (convención null), p8=80, dist=2.5, nivel=alto(100)
   SPL = 86 − 7,959 + 19,031 + 3 = 100,07  → margen +0,07  → "Justo" (antes "Con margen")

B · sens=85 (convención null), p8=50, dist=3.0, nivel=alto(100)
   SPL = 85 − 9,542 + 16,990 + 3 = 95,45  → margen −4,55  → "Insuficiente" (antes "Justo")

C · sens=85 (convención null), p8=50, dist=3.0, nivel=referencia(105)
   SPL = 95,45  → margen −9,55  → "Insuficiente" (ya lo era, con más margen negativo)

D (nuevo) · sintético 88 dB @2,83V, 4 Ω, amp 80W/120W, dist=3.0, nivel=alto(100)
   Único vector que ejercita los 3 cambios a la vez, convención CONOCIDA:
   sensibilidadEfectivaDb = sensibilidadA1WDb(88, 4) = 88 − 10·log₁₀(2,83²/4) ≈ 84,98
   potenciaUsadaW = 120 (4Ω, el ampli sí publica ese dato)
   SPL = 84,98 − 9,542 + 20,792 + 3 = 99,23  → margen −0,77  → "Insuficiente"
   (sin corregir: SPL=106,49, margen +6,49, "Con margen" — la diferencia es el error que encontró la auditoría)

E (nuevo) · mismo parlante/ampli que D pero sensibilidadConvencion=null (no 2,83V)
   sensibilidadRangoAplica = true (4Ω<8)
   sensibilidadEfectivaRangoDb = [84,99 pesimista, 88 optimista]  (idéntico pesimista a D: incluso sin
   saber la convención, el extremo conservador coincide con "asumir 2,83V")
   margenDb = −0,76 (pesimista, mismo que D) → "Insuficiente"; confianza='baja'
   margenRangoDb = [−0,76, +2,25]  → el extremo optimista SERÍA "Con margen" si la fuente
   ya reportara a 1W — la tarjeta declara los dos, no sólo el conservador.
```

### Catálogo: `sensibilidadConvencion`

Poblado únicamente donde la fuente ya citada lo declara de forma
explícita — nunca inferido. De 38 parlantes (35 reales + 3 arquetipos
genéricos), sólo **2** tienen una convención declarada:

- `diatone-ds251-mk2`: `'1W'` — la nota cita el estándar japonés "New
  JIS" de la época, declarado en 1 W.
- `wharfedale-linton-heritage`: `'2.83V'` — la nota declara que el valor
  usado (Stereophile) "ya está en la referencia estándar del proyecto"
  (dB/2,83V·m, la unidad que `tipos.ts` documenta para `sensibilidadDb`).

Los otros 36 (incluidos KEF LS50 Meta y Klipsch RP-600M II, ver vectores
arriba) quedan en `null` — no porque falte investigar, sino porque la
fuente citada, revisada, no lo dice. Es el mismo criterio que el resto
del catálogo aplica a cualquier campo sin dato: `null` declarado, nunca
una convención asumida en silencio. De estos 36, los que además sean de
impedancia nominal <8 Ω activan `sensibilidadRangoAplica` (rango +
confianza `'baja'`, ver arriba); los de 8 Ω o más (como KEF y Klipsch) lo
declaran igual (`sensibilidadSinConvencion=true`) pero sin consecuencia
numérica ni de confianza.

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
ubicación en vivo) — no toca potencia, veredicto ni "En resumen" hasta que
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

Se listan los modos de cada eje (ancho, largo, alto) hasta un **techo de
listado** — `TECHO_MODOS_HZ = 300` por defecto, techo estándar de la región
de modos de sala en acústica doméstica (por encima, la densidad modal es
alta y deja de comportarse como resonancias individuales), pero
`evaluarModos(sala, techoModosHz?)` acepta reemplazarlo — ver "Techo de
listado dinámico (`techoModosDesdeSchroeder`)" más abajo, agregado en la
misma ronda que recalibró el umbral de agrupamiento.

**Agrupamiento — recalibrado.** Un barrido externo de 17.784 salas
plausibles (2,5–7 m de ancho, 3–9 m de largo, 2,2–3,0 m de alto) mostró que
el umbral original (`UMBRAL_AGRUPAMIENTO = 0,05`, 5 %) marcaba `warn` en el
**86 %** de las salas del barrido — un semáforo que casi siempre dice lo
mismo no discrimina nada. Regla nueva, con dos condiciones — `warn` si se
cumple **cualquiera** de las dos:

```
existe al menos un par con Δ relativo < UMBRAL_AGRUPAMIENTO_EXACTO (0,01 → 1%)
  o
existen MIN_PARES_AGRUPADOS (2) o más pares con Δ relativo < UMBRAL_AGRUPAMIENTO (0,02 → 2%)
```

Un solo umbral más bajo no bastaba: la sala por defecto del sitio tiene
**una única** coincidencia, pero es **exacta** (0,00 % de diferencia,
ancho orden 3 = alto orden 2) — el peor caso posible, y una regla de "2 o
más pares" la habría dejado pasar como sala "buena". Los tres umbrales
(`UMBRAL_AGRUPAMIENTO=0,02`, `UMBRAL_AGRUPAMIENTO_EXACTO=0,01`,
`MIN_PARES_AGRUPADOS=2`) son **criterio del sitio, no una convención
publicada**. `TECHO_AGRUPAMIENTO_HZ = 150` (el techo bajo el cual se
evalúa el agrupamiento, distinto del techo de LISTADO de arriba) no
cambió. Sobre el mismo barrido, la regla recalibrada marca `warn` en el
**≈35-37 %** de las salas — verificado con un barrido propio (ver
`Correr barrido...` en el historial de esta ronda): 25.254 salas con paso
de 0,1 m en los mismos tres rangos dieron 35,3 %, en la misma banda que el
37 % reportado por la auditoría externa (la diferencia es de grilla de
muestreo, no de umbral).

**Severidad: techo `warn`, nunca `error`** (regla de sala, CLAUDE.md). `ok`
si ninguna de las dos condiciones se cumple, `warn` si alguna sí.

### Techo de listado dinámico (`techoModosDesdeSchroeder`)

Con el techo fijo de 300 Hz, la región donde "Modos de sala" afirmaba
cubrir todo el comportamiento resonante podía terminar por debajo de donde
"Reverberación" empezaba a ser válida (frecuencia de Schroeder) — un hueco
de frecuencias que ninguna de las dos reglas gobernaba. `modos.ts` expone
`techoModosDesdeSchroeder(frecuenciaSchroederHz)`, que aplica un clamp
declarado `[CLAMP_TECHO_MODOS_MIN_HZ=150, CLAMP_TECHO_MODOS_MAX_HZ=400]` a
la fs real de la sala; `apps/web/src/main.ts` calcula `resReverb` primero
y le pasa esa fs (ya clampeada) como segundo argumento de `evaluarModos()`.
Con esto, la región de "Modos de sala" (0 a fs) y la región donde
"Reverberación" declara que un tiempo de reverberación único tiene sentido
(por encima de fs) quedan contiguas por construcción — sin solapamiento ni
hueco, mientras la fs calculada caiga dentro del clamp (si no, el clamp
prioriza no producir un techo absurdo por sobre la continuidad exacta,
ver `docs/motor-mvp.md` sección 4ter). El techo de LISTADO no afecta la
detección de agrupamiento (siempre bajo `TECHO_AGRUPAMIENTO_HZ=150`,
fijo) — salvo que baje por debajo de esos 150 Hz, cosa que el clamp
mínimo evita siempre en la práctica.

### Vector de prueba (W=3.6, L=5.0, H=2.4 — la sala por defecto del sitio)

3,6 y 2,4 están en razón exacta 3:2 → el modo de orden 3 del ancho
(142,9167 Hz) coincide exactamente (diferencia 0 Hz) con el de orden 2 del
alto. Bajo el umbral recalibrado, esta sala da **un único** par por debajo
de `UMBRAL_AGRUPAMIENTO` (2 %) — los otros tres pares que sí entraban bajo
el umbral viejo de 5 % (`{largo orden 2, alto orden 1}` 68,60/71,46 Hz,
`{largo orden 4, ancho orden 3}` y `{largo orden 4, alto orden 2}`
137,20/142,92 Hz, todos ≈4,08 % de diferencia) quedan afuera. Resultado:
`warn`, exclusivamente por la condición de "al menos un par exacto"
(`UMBRAL_AGRUPAMIENTO_EXACTO`), no por cantidad de pares.

Vector de control sin agrupamiento: W=2.5, L=3.0, H=2.2 (sin razones
simples entre ejes) → `ok`. Vector con `MIN_PARES_AGRUPADOS`: W=4, L=4,
H=2.5 (ancho=largo) → 3 pares exactos (Δ=0 % en los órdenes 1, 2 y 3) →
`warn` por la condición de "2 o más pares", no por el par exacto (que acá
también se cumple, pero la sala ya está marcada por la otra vía).

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
varios pares (con el umbral recalibrado, la sala por defecto del sitio ya
sólo tiene 1 — el vector `W=4, L=4, H=2,5` de la sección anterior, con 3,
es el que sigue sirviendo para probar el recorte en los tests de
`curvamodal.test.ts`). La tarjeta ya no lista todos los modos individuales
(hasta el techo de listado) — sólo el veredicto, la frase simple, el aviso
de agrupamiento y estas curvas curadas.

`TOP_N_AGRUPADOS` y la función que ordena+corta (`paresMasImportantes`)
viven en `packages/engine/src/modos.ts`, exportadas — antes era lógica
privada duplicada dos veces (`curvamodal.ts` y, a mano, dentro de su propio
test). Se promovió a una sola función compartida porque un segundo
consumidor la necesitaba (el mapa de zonas modales, sección siguiente —
probado y retirado después, pero la promoción quedó, sigue evitando la
duplicación original).

**Aviso de filtro de modo activo:** cuando hay agrupamiento, la sugerencia
de la tarjeta (`sugerenciaHtml`) menciona, además de reposicionar
parlantes/punto de escucha, que un filtro paramétrico (EQ activo) centrado
en la frecuencia agrupada también puede atenuar el refuerzo — con la misma
salvedad de siempre: ajustarlo exige medir la sala real, este modelo no
tiene la amplitud ni la fase medidas como para proponer un Q o una
atenuación en dB.

### Mapa de zonas modales — probado y retirado

Se construyó y se probó, en dos rondas de diseño distintas (capa dentro
del plano isométrico; después diagrama propio de la tarjeta "Modos" con
desenfoque gaussiano), un mapa 2D de coincidencia geométrica entre nodos
y antinodos de los pares de modos ya curados por `paresMasImportantes` —
combinando dos modos de un mismo par con `min` (no promedio: el refuerzo
exige que los dos coincidan en su antinodo a la vez, la cancelación es
real si cualquiera tiene un nodo ahí) y hasta 2 pares curados con "el
valor más extremo gana" (no promedio: evita que un par bien ahí mismo
tape un problema real del otro). Ninguna de las dos versiones reflejó lo
que el usuario buscaba — pidió eliminarla directamente después de ver la
segunda ronda. `apps/web/src/vista/mapamodal.ts` y su test se borraron
por completo; el plano isométrico de reflexiones (`plano.ts`) nunca
mostró esta capa (se sacó de ahí en la ronda de reubicación, antes de
eliminarse del todo) y queda intacto. Sobrevive únicamente
`paresMasImportantes`/`TOP_N_AGRUPADOS` en `modos.ts` — la extracción de
esa lógica desde `curvamodal.ts` sigue siendo válida, las curvas 1D
(sección anterior) la siguen usando tal cual.

---

## 4ter. Reverberación estimada — RT60 (`reverberacion.ts`)

**Estado: implementada — el RT60 ya no emite veredicto, es un rango.**
Igual que `modos.ts`, depende sólo de la geometría de la sala (más los
materiales declarados por el usuario) — nunca de los equipos elegidos.
`severidad` es siempre `'sin-datos'`: no es que falte investigar algo del
catálogo, es que este modelo genuinamente no puede sostener un
ok/con-reparos con los datos que tiene — ver "Por qué se retiró el
veredicto" más abajo. `veredicto.ts` ya sabe excluir `'sin-datos'` de un
grupo sin arrastrarlo (mismo mecanismo que usa para el resto del motor),
así que "Sala" queda gobernado sólo por `modos.ts`.

**Fórmula — Sabine/Eyring por tercio de octava, sumada superficie por
superficie** (no un coeficiente único para toda la sala, ni siquiera un
único valor de "muro": cada muro se orienta y se declara aparte — ver
"Historia de la regla" más abajo). Tres bandas — 125/500/2000 Hz — cada
una con su propia absorción total y su propia elección de fórmula:

```
A_banda = Σ α_banda,i · S_i   (por las 6 superficies: 4 muros + piso + techo)
ᾱ_banda = A_banda / S_total

ᾱ_banda ≤ 0,20 → Sabine:  RT60 = 0,161 · V / A_banda
ᾱ_banda > 0,20 → Eyring:  RT60 = 0,161 · V / (−S_total · ln(1 − ᾱ_banda))
```

0,20 es el umbral de literatura de acústica arquitectónica donde Sabine
empieza a sobreestimar significativamente (no un criterio del sitio). El
RT60 que se muestra es el promedio de las bandas 500 Hz y 2000 Hz. El
usuario elige un **material por cada muro orientado** (frontal,
posterior, izquierdo, derecho) más piso y techo — 6 selectores
independientes — cada uno con un triple de coeficientes `[125, 500, 2000]
Hz` declarado como criterio del sitio (valores típicos de literatura, no
una medición real; la tabla completa vive en
`ABSORCION_MURO_BANDAS`/`ABSORCION_PISO_BANDAS`/`ABSORCION_TECHO_BANDAS`,
`packages/engine/src/reverberacion.ts`). `vacio` (sólo muros) usa α=1,0
en las 3 bandas — coeficiente de referencia histórico de Sabine para una
abertura, no una estimación del sitio — y hace que el plano isométrico
(sección 4) tampoco dibuje la reflexión de ese muro.

### Por qué se retiró el veredicto — dos escenarios, no un punto

Una auditoría externa corrió el motor sobre 17.784 salas plausibles con
materiales típicos (yeso cartón + piso laminado) y encontró `rt60-largo`
(el código de la primera versión de este modelo, ver "Historia de la
regla") en el **100 %** de las salas — un semáforo que siempre dice lo
mismo no informa nada. La causa: el modelo sólo tenía las seis superficies
desnudas, y en una sala doméstica real el sofá, las cortinas y la
biblioteca son la mayor parte de la absorción en medios/agudos.

**Agregar mueble no arregla la regla, le da vuelta el signo.** Con un
término de contenido calibrado, el veredicto pasa a `rt60-ok` en el
**100 %** de las salas — y como el volumen y la absorción del contenido
crecen los dos con la superficie de piso, se cancelan: el RT60 estimado
termina dependiendo casi sólo de la altura del techo (una sala de 8 m² y
una de 63 m² con la misma altura daban 0,43 s y 0,46 s). El resultado lo
decidía un control que el usuario tiene que adivinar, no la sala.

**Conclusión: el RT60 estimado no da para veredicto, sí da para
estimación declarada.** `evaluarReverberacion()` calcula **dos
escenarios** — `vacio` (sólo las seis superficies) y `amoblado`
(superficies + `CONTENIDO_SABINES_M2_PISO`, un término de sabines por m²
de PISO, criterio del sitio, no una tabla publicada):

```
CONTENIDO_SABINES_M2_PISO = {
  vacio:    [0,    0,    0   ],   // [125, 500, 2000] Hz — literalmente sin contenido
  amoblado: [0,18, 0,45, 0,60],
}
```

`rt60RangoS: [amoblado, vacio]` — el amoblado es el extremo menor (más
absorción → RT60 más corto); `rt60S` (el campo que consumía el resto del
motor) sigue existiendo, apuntando al extremo amoblado, el realista. La
tarjeta muestra el rango completo, con la nota explícita de que ninguno
de los dos extremos es una medición de la sala real. **El RT60 es lo
único de todo el análisis que el usuario puede medir él mismo, en cinco
minutos con una app del teléfono** — la tarjeta cierra invitando a eso.

### Límite de dominio — por encima de ᾱ≈0,8, ningún número (no un clamp)

La primera versión de este cambio clampeaba numéricamente el argumento
del logaritmo de Eyring (`Math.min(alphaBar, 0,9999)`) para evitar `NaN`
cuando ᾱ superaba 1 — matemáticamente correcto (Eyring exige ᾱ<1
estricto), pero insuficiente: **Sabine y Eyring asumen los dos un campo
sonoro difuso** (energía rebotando muchas veces antes de absorberse, lo
bastante como para que "promediar" tenga sentido), y ese supuesto deja de
sostenerse mucho antes de que ᾱ llegue a 1 — con una sala tan absorbente
o tan abierta, la energía se absorbe en uno o dos rebotes, no en muchos.
Un clamp cerca de 1 evitaba la excepción pero seguía devolviendo un
número de un modelo que, físicamente, ya no regía — el mismo argumento
que ya había justificado retirar el veredicto del RT60 (arriba),
aplicado ahora al número en sí, no sólo a su semáforo.

`ALPHA_CAMPO_DIFUSO_MAX = 0,8` (criterio del sitio, en el rango que
informa la literatura de acústica arquitectónica para la pérdida de
validez del campo difuso — no una cifra única publicada, mismo tipo de
declaración que `UMBRAL_EYRING_ALPHA` pero sin una fuente tan puntual):
por encima de ese ᾱ, la banda no reporta RT60 (`rt60S: null`, `metodo:
'fuera-de-dominio'`) en vez de un número técnicamente finito pero ya sin
significado físico. Como el contenido sólo agrega absorción sobre la
estructura, ᾱ del escenario `amoblado` es siempre ≥ que el de `vacio` en
la misma banda — si `vacio` ya está fuera de dominio, `amoblado` también
lo está (nunca al revés). `rt60Final()` no promedia a medias: si
cualquiera de las bandas 500/2000 Hz que arman el RT60 final es `null`,
el resultado completo es `null` — fabricar una cifra con sólo la mitad
de los datos sería peor que no dar ninguna. Cuando `rt60S` es `null`, el
`codigo` pasa a `'rt60-fuera-de-dominio'` (en vez de `'rt60-estimado'`)
y `frecuenciaSchroederHz` también es `null` (depende de la banda de 500
Hz amoblada) — `techoModosDesdeSchroeder(null)` cae al techo por defecto
(`TECHO_MODOS_HZ=300`) en vez de inventar un número.

La tarjeta, en ese caso, no muestra ningún rango: un párrafo propio
(`textoFueraDeDominio`) explica que el modelo no tiene nada que ofrecer
ahí — ni siquiera una estimación conservadora — y refuerza más todavía
la invitación a medir, porque acá el modelo genuinamente no tiene
alternativa. Vector real que dispara el caso (SALA_VECTOR por defecto,
materiales `panelAcustico` en los 4 muros + techo, `alfombra` en piso):
2000 Hz da ᾱ≈0,97 en el escenario amoblado — muy por encima de 0,8.

### Frecuencia de Schroeder — desde la banda de 500 Hz amoblada, no el promedio

```
fs = 2000 · √(RT60_500Hz / V)
```

Antes se calculaba desde el RT60 final ya promediado (500+2000 Hz), que
la banda de agudos infla: para la sala por defecto, bajo el modelo
`vacio` de una sola banda, eso daba 371,6 Hz — **por encima** del techo
fijo de modos (`TECHO_MODOS_HZ=300`), dejando una banda de 300 a 372 Hz
que ninguna de las dos reglas gobernaba. Ahora `fs` sale de la banda de
500 Hz sola, del escenario `amoblado` — para la sala por defecto: 299,3
Hz con sólo ese cambio (banda 500 Hz, todavía `vacio`), 205,2 Hz con el
escenario amoblado también aplicado. Ver sección 4bis,
`techoModosDesdeSchroeder`, para cómo esta frecuencia (clampeada a
[150,400] Hz) pasa a ser el techo de listado de modos — cerrando el hueco
sin inventar un tercer número.

### Vectores de prueba (sala por defecto, 3,6×5,0×2,4 m, materiales típicos: yesoCarton×4 + techo, piso maderaLaminado)
```
V = 43,2 m³; S_total = 77,28 m²

Escenario amoblado (el que gobierna rt60S/fs):
  125 Hz: ᾱ=0,2737 (Eyring) → RT60=0,2814 s
  500 Hz: ᾱ=0,1978 (Sabine) → RT60=0,4549 s   ← fs = 2000·√(0,4549/43,2) ≈ 205,2 Hz
 2000 Hz: ᾱ=0,1844 (Sabine) → RT60=0,4880 s
  RT60 amoblado = (0,4549+0,4880)/2 ≈ 0,4715 s

Escenario vacío (sin contenido, sólo estructura):
  125 Hz: ᾱ=0,2318 (Eyring) → RT60=0,3413 s
  500 Hz: ᾱ=0,0930 (Sabine) → RT60=0,9676 s
 2000 Hz: ᾱ=0,0447 (Sabine) → RT60=2,0153 s
  RT60 vacío = (0,9676+2,0153)/2 ≈ 1,4915 s

rt60RangoS = [0,4715, 1,4915] s → tarjeta muestra "≈0,5 s a ≈1,5 s"
severidad = 'sin-datos' (siempre); codigo = 'rt60-estimado' salvo que
alguna banda 500/2000 Hz cruce ALPHA_CAMPO_DIFUSO_MAX, caso en que pasa
a 'rt60-fuera-de-dominio' (ver esa sección más arriba) y rt60S/
rt60RangoS/frecuenciaSchroederHz son null

Vector de fuera de dominio (mismos 3,6×5,0×2,4 m; panelAcustico en los
4 muros + techo, alfombra en piso):
 2000 Hz: ᾱ≈0,9699 (amoblado) → fuera de dominio → codigo =
  'rt60-fuera-de-dominio', rt60S = null
```

### Historia de la regla

Primera versión (Fase 6): un solo selector "tipo de sala"
(moderna/balanceada/tratada) con un coeficiente promedio único para toda
la sala. Segunda versión: un solo selector "muro" para toda la superficie
de muros, más piso/techo separados. Tercera versión: cada muro se orienta
y se declara aparte (frontal/posterior/izquierdo/derecho), con `vacio`
para aberturas — una sala real casi nunca tiene los 4 muros iguales, y el
plano isométrico necesita saber qué muro es cuál. Cuarta versión: modelo
multibanda (125/500/2000 Hz, Sabine/Eyring por banda) en vez de un único
coeficiente de banda media — ver el comentario de cabecera de
`reverberacion.ts` para el detalle completo de esa ronda. **Quinta
versión, esta ronda:** el veredicto ok/con-reparos se retira por completo
(auditoría externa, ver arriba) — `RT60_MIN_OK_S`/`RT60_MAX_OK_S` y los
códigos `rt60-corto`/`rt60-ok`/`rt60-largo` se eliminan, junto con sus
tests; `severidad` pasa a ser siempre `'sin-datos'`, `codigo` siempre
`'rt60-estimado'`, y el número único se reemplaza por el rango
`[amoblado, vacio]` de arriba. **Sexta versión, la ronda inmediata
siguiente:** el clamp numérico (`ALPHA_EYRING_MAX=0,9999`) que evitaba
`NaN` cuando ᾱ superaba 1 se reemplaza por un límite de dominio físico
(`ALPHA_CAMPO_DIFUSO_MAX=0,8`) — no basta con no explotar, un número
dentro de rango matemático pero fuera del régimen de campo difuso sigue
siendo un número que no describe la sala (ver "Límite de dominio"
arriba); `codigo` gana el valor `'rt60-fuera-de-dominio'` para esos
casos, con `rt60S`/`rt60RangoS`/`frecuenciaSchroederHz` en `null` en vez
de una cifra que ya no aplica.

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

## 7. Veredicto general (`veredicto.ts`) — CAPA CRITERIO-EDITORIAL

**Estado: implementada — única evaluación de conjunto del sitio.** Esta
sección documentaba antes un puntaje 1-10 (`puntaje.ts`); esa pieza fue
retirada por completo y reemplazada por este módulo, que agrupa las
mismas severidades ya calculadas por las reglas de arriba (secciones
2-4bis y 6) en **3 estados** en vez de un número compuesto. A diferencia
de todo lo anterior, esto **no es física**: cómo se agrupa y qué gana es
un criterio que este sitio declara. Ver CLAUDE.md, "Las dos capas" — se
rotula en pantalla como "Criterio editorial, no física", nunca junto a
un veredicto de capa física.

`veredicto.ts` no decide severidades — sólo las agrupa. Recibe una
`EntradaVeredicto` con la severidad ya calculada de cada regla (`null`
para puente/recorrido si esa fuente no está elegida) y produce 3
estados:

| Estado | Componentes que agrupa | Método |
|---|---|---|
| Potencia | potencia (siempre tiene valor) | directo, sin agrupar |
| Acople eléctrico | carga, amortiguamiento, puente y recorrido de streamer y/o DAC | peor de los aplicables (`sin-datos` si ninguno aplica) |
| Sala | modos, reverberación | peor de los dos que sí tienen dato (nunca `alert` — mismo techo de severidad de sala que ya declaraban las secciones 4bis/4ter). Reverberación es siempre `'sin-datos'` desde que el RT60 estimado dejó de emitir veredicto (sección 4ter) — se excluye igual que cualquier otro componente sin dato, así que en la práctica "Sala" refleja sólo `modos`. Modos siempre tiene valor, así que el grupo nunca es `sin-datos` |

### Peor-eslabón, no promedio

Cada estado toma la **peor** severidad entre sus componentes
(`peorSeveridad()`, ahora en `tipos.ts` junto a `peorConfianza()`), nunca
un promedio: un amplificador que se queda corto en los picos no debe
promediar "aceptable" sólo porque la carga es fácil. `sin-datos` se
excluye del cálculo del grupo, igual que en el resto del motor — nunca
cuenta como reparo. Si el grupo entero queda sin ningún componente con
dato (ej. "Acople eléctrico" sin carga citada y sin streamer ni dac
elegidos), el grupo mismo es `sin-datos` (gris en pantalla, nunca un
color inventado) y no participa del veredicto general.

`general` es el peor de los 3 estados que sí tienen valor — Potencia y
Sala siempre lo tienen (ninguno de los dos puede ser `sin-datos`), así
que `general` nunca es `sin-datos`: siempre hay al menos un piso físico
real sobre el que apoyar el veredicto.

### Redacción del titular (`modeloVeredicto`, `apps/web`)

El motor sólo entrega códigos (`'ok'|'warn'|'alert'` por estado, más
`general`); `apps/web/src/vista/resultado.ts` redacta el titular desde
una matriz fija:

```
algún estado 'alert'                 → "Configuración no recomendada"      (rojo)
ningún 'alert', algún estado 'warn'  → "Configuración soportada, con límites" (naranjo)
los 3 estados 'ok'                   → "Configuración totalmente compatible" (verde)
```

El subtexto nombra qué estado(s) motivaron el veredicto (`listaY()`,
`Intl.ListFormat` por locale). El texto de cada estado reusa el
`verdictoTexto` ya calculado del componente más grave de ese grupo —
nunca inventa una evaluación nueva.

### Streamer + DAC simultáneos

Puente y recorrido entran al bucket "Acople eléctrico" **por separado
para cada fuente** — `puenteStreamer`/`recorridoStreamer`/`puenteDac`/
`recorridoDac`, hasta 6 componentes aplicables junto a carga y
amortiguamiento. Un problema en el puente del streamer puede hacer que
"Acople eléctrico" sea `alert` aunque el DAC esté perfecto — el peor
componente del grupo manda, no un promedio ni una combinación previa por
fuente.

### Vectores de prueba

`packages/engine/src/veredicto.test.ts` cubre: el peor componente de
"Acople eléctrico" ganando sobre los demás; el grupo completo en
`sin-datos` cuando no hay carga citada ni streamer/dac elegidos;
"Sala" nunca en `alert` aunque modos y reverberación estén ambos en
`warn`; `general` en `warn` con Potencia y Acople "ok" con sólo Sala en
`warn`; y `general` nunca `sin-datos` incluso con Acople eléctrico sin
dato.
