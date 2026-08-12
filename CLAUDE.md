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

**Fases 1 a 4 hechas.** El motor completo vive en `packages/engine/src/`
(`tipos.ts`, `unidades.ts`, `potencia.ts`, `carga.ts`, `sala.ts`), 36/36
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
`packages/engine/scripts/bundle-navegador.mjs`: concatena los 5 `.js`
compilados en un único script clásico sin `import`/`export`
(`dist/cadena-engine.browser.js`, generado por `npm run build`), cargado
con `<script src="...">` normal — sin la restricción de CORS de los
módulos. El script principal (`<script defer>`, sin `type="module"`, sin
`defer` en el bundle) llama a
`window.CadenaEngine.evaluarPotencia/evaluarCarga/calcularDisposicion` en
vez de recalcular las fórmulas inline. Los objetos `SPK`/`AMP` siguen
siendo datos de presentación (chips, desc), traducidos al tipo del motor
por dos funciones adaptadoras (`parlanteDelMotor`, `amplificadorDelMotor`)
— la única capa de traducción, no de duplicación de lógica. Verificado con
un harness de Node que carga el bundle como script clásico (sin ESM,
igual que un navegador) y extrae el adaptador del HTML real: los 3
vectores documentados coinciden exactamente.

Falta: Fase 5 (seguir ampliando la base — ya tiene 25 equipos en 5
categorías, es trabajo sin fin natural) y la regla de ganancia de cadena
(sección 6 de motor-mvp.md), que sigue sólo diseñada, no implementada.
