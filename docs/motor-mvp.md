# Motor MVP — fórmulas, esquema y vectores de prueba

Esto es lo que hoy calcula el prototipo (`prototipo-frontend.html`), extraído para
portarlo a TypeScript con tests. Los números de los vectores están calculados a
mano: úsalos como casos esperados **antes** de escribir la implementación.

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

El frontend además guarda `chips[]` y `descripcion` por equipo, pero eso es
presentación, no entra al motor.

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

**Veredicto** (por `margen`, en dB):
```
margen ≥ 3     ok      "Con margen"
0 ≤ margen < 3 warn    "Justo"
margen < 0     alert   "Insuficiente"
```

**Aviso extra:** si `potenciaRecMinW` no es null y `potencia8OhmW < potenciaRecMinW`,
agregar nota: el fabricante recomienda desde X W.

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
    → sin-datos   "Sin dato"     // NUNCA ok. Falta la curva de impedancia.

si no:
    dura   = impedanciaMinOhm ≤ 4
    // "casi dobla" al bajar a 4 Ω = buena entrega de corriente
    reserva = (potencia4OhmW != null) ? (potencia4OhmW / potencia8OhmW ≥ 1.7)
                                      : false
    potente = potencia8OhmW ≥ 60
    resuelta = reserva || potente

    si  dura && !resuelta → warn   "Exige corriente"
    si  dura &&  resuelta → ok     "Cubierto"
    si !dura              → ok     "Carga benigna"
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

## 5. Lo que el MVP todavía NO hace

- Fuente/streamer y ganancia de la cadena (el bloque B de `docs/reglas.md` del
  proyecto anterior): recorrido de volumen, puente de impedancias fuente→amp.
- Subwoofer, cables, modos de sala.
- Modo "buscar" (llenar un hueco con candidatos) y modo "proponer" (armar cadenas
  desde un presupuesto). Requieren la función de score, que es decisión abierta.

Estas reglas ya están especificadas en los docs del proyecto anterior; el MVP
implementa sólo potencia, carga y geometría.

**Sobre `streamers`, `dacs` y `cables` en `equipos-seed.json`:** ya tienen datos
curados (con fuente y confianza, mismo estándar que parlantes/amplificadores),
pero **no son entrada de ninguna regla todavía** — `potencia.ts` y `carga.ts`
sólo miran parlante + amplificador, y así se mantiene mientras no exista una
regla específica. Son catálogo adelantado para cuando se defina la regla de
ganancia de cadena / puente de impedancias fuente→amp de este punto. No bloquean
ni participan del veredicto de compatibilidad actual.
