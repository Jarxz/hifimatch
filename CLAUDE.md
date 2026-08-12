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
packages/data/     Base de datos curada de equipos (con fuente y confianza)
apps/web/          Frontend (portar prototipo-frontend.html)
```

El motor debe correr en un test de milisegundos sin levantar nada. Si necesita
`fetch`, algo se hizo mal.

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

## Estado actual

**Fases 1 a 4 hechas**, más la regla de ganancia de cadena (sección 6 de
motor-mvp.md). El motor completo vive en `packages/engine/src/` (`tipos.ts`,
`unidades.ts`, `potencia.ts`, `carga.ts`, `sala.ts`, `ganancia.ts`), 47/47
tests pasando (`npm test` en `packages/engine/`). Se compila a JS de
navegador con `npm run build` (usa `rewriteRelativeImportExtensions` de
TS 5.7+ para que los imports con extensión `.ts` del código fuente —
necesarios para que `node --test` corra sin transpilar — se conviertan en
`.js` en el output). El resultado vive en `packages/engine/dist/` y **sí
se commitea** (excepción a `dist/` en `.gitignore`): no hay build step en
el despliegue, así que el archivo compilado tiene que estar en el repo.

`prototipo-frontend.html` ya **consume el motor real**. Primer intento
usó `<script type="module">` importando `dist/*.js` directo — **no
funciona**: los navegadores basados en Chromium bloquean por CORS los
módulos ES cuando la página se abre como archivo local (`file://`), que es
como este sitio está pensado para abrirse (doble clic, sin servidor). No
lo detecté hasta que se probó en un navegador real. Se corrigió con
`packages/engine/scripts/bundle-navegador.mjs`: concatena los `.js`
compilados en un único script clásico sin `import`/`export`
(`dist/cadena-engine.browser.js`, generado por `npm run build`), cargado
con `<script src="...">` normal — sin la restricción de CORS de los
módulos. El script principal (`<script defer>`, sin `type="module"`, sin
`defer` en el bundle) llama a
`window.CadenaEngine.evaluarPotencia/evaluarCarga/calcularDisposicion/
evaluarPuenteImpedancias/evaluarRecorridoVolumen` en vez de recalcular las
fórmulas inline; las constantes `RATIO_BRIDGING_OK`/`UMBRAL_RECORRIDO`
también se exponen en `window.CadenaEngine`, así el HTML nunca hardcodea
esos números en el texto. Los objetos `SPK`/`AMP`/`FUENTE` siguen siendo
datos de presentación (chips, desc), traducidos al tipo del motor por tres
funciones adaptadoras (`parlanteDelMotor`, `amplificadorDelMotor`,
`fuenteDelMotor`) — la única capa de traducción, no de duplicación de
lógica. Verificado con un harness de Node que carga el bundle como script
clásico (sin ESM, igual que un navegador) y extrae los datos/adaptadores
del HTML real: los 8 vectores documentados en motor-mvp.md sección 6.3
coinciden exactamente.

La regla de ganancia es **opcional**: el selector "Fuente digital" en la
pantalla de configuración no es requerido, y sus dos tarjetas de resultado
(puente de impedancias, recorrido de volumen) sólo aparecen si el usuario
eligió una fuente — no condicionan ni reemplazan los veredictos de
potencia/carga. `UMBRAL_RECORRIDO` no tenía número citable (a diferencia
de `RATIO_BRIDGING_OK=10`, convención de la industria) — motor-mvp.md lo
marcaba explícito como "sin definir... se pregunta antes de fijarlo, no se
inventa"; se preguntó y quedó en **10×** (mismo orden que el umbral de
puente).

Falta: Fase 5 (seguir ampliando la base — ya tiene 25 equipos en 5
categorías más 6 fuentes digitales, es trabajo sin fin natural).
