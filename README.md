# CADENA — resumen y arranque para Claude Code

> Punto de entrada del proyecto. Se lee junto con `CLAUDE.md`.
> Cuando el código avance, actualiza la sección **Dónde estamos hoy**.

## Qué es

Una página web pública que dice si un sistema de audio hi-fi es **compatible** y
qué **prestaciones** entrega en una sala concreta. No es un catálogo con filtros
ni un configurador que suma precios: es un motor que calcula relaciones físicas
entre los equipos —potencia contra la sala, carga que ve el amplificador, rango
de frecuencias que sobrevive a la cadena— y las muestra con su fórmula, su
umbral, su fuente y su nivel de confianza.

La regla que la define: **no opina de gusto.** No dice si algo suena "cálido" o
"musical". Dice si hay o no un impedimento físico, y lo demuestra. Esa honestidad
es todo su valor, porque el usuario hi-fi llega leído y cuestiona.

Este proyecto viene de un pivote. Antes era una herramienta de venta para la
tienda HiFi Route; la tienda no siguió, así que ahora es una herramienta pública
y genérica con base de datos propia de equipos populares. **El motor se diseñó
desde el principio para no saber nada de la tienda**, así que casi todo el diseño
técnico se reutiliza; lo que se cae es la capa de criterio de la tienda, el sync
con su catálogo y el encuadre de venta.

## Dónde estamos hoy

- **Motor:** `packages/engine/src/` completo — `tipos.ts`, `unidades.ts`,
  `potencia.ts`, `carga.ts`, `sala.ts`, `ganancia.ts` (puente de impedancias +
  recorrido de volumen, fuente→ampli). 47/47 tests. Devuelve **códigos, no
  texto** (`codigo: 'con-margen'`, etc.) — el motor no decide en qué idioma
  se lee el sitio.
- **Catálogo:** `packages/data/src/catalogo.ts`, única fuente de datos —
  25 equipos (8 parlantes, 8 amplificadores, 6 fuentes digitales que
  unifican streamers+DACs, 3 cables curados sin regla todavía), **bilingüe
  desde el origen** (`{es, en}` en cada campo de presentación). 11/11 tests.
- **Frontend:** `apps/web/`, Vite + TypeScript modular. Tres pantallas
  (portada → configurar → resultado) más un botón ES/EN. Consume el motor y
  el catálogo como código fuente TypeScript directo — sin bundler artesanal,
  sin build intermedio commiteado. El sitio sigue abriendo por doble clic
  (`file://`), además de servirse por web: `vite-plugin-singlefile` inlinea
  todo en un único `index.html`. 53/53 tests.
- **Prueba de realidad de la data:** confirmada. Para equipos populares los specs
  existen (fichas de fabricante + mediciones independientes de Stereophile,
  Erin's Audio Corner, ASR). La advertencia es que el spec de fábrica puede
  engañar —el Klipsch declara 94,5 dB pero la anecoica da ~86— así que la base
  necesita **curaduría, no copiar y pegar**.

`prototipo-frontend.html` y `data/equipos-seed.json` (las versiones previas,
HTML monolítico + JSON suelto) ya no existen — su contenido se migró
íntegro al catálogo de `packages/data`. Ver `CLAUDE.md` §Estado actual para
el detalle de cada fase.

## Qué se reutiliza del diseño anterior

Están en la carpeta del proyecto anterior (un nivel arriba, junto a este
paquete). Son la especificación de física y valen enteros:

- `docs/reglas.md` — bloques A a E: compatibilidad entre equipos (umbrales y
  fórmulas). El MVP implementa una parte del bloque A y de B.
- `docs/reglas-sala.md` — bloque F: acústica y posicionamiento. El plano del
  prototipo es una primera versión de esto.
- `docs/reglas-escena-banda.md` — bloques G y H.
- `packages/engine/src/tipos.ts` — esquemas de dominio (buen punto de partida
  para el modelo de datos con `fuente` y `confianza` por campo).

Lo que **no** se reutiliza: `modo-propuesta.md` y `caso-real.md` estaban atados
al presupuesto y catálogo de la tienda; `plan.md` tenía fases pensadas para ese
cliente. La disciplina general (una tarea por sesión, tests primero) sí aplica.

## Arquitectura

```
packages/
  engine/          TypeScript puro, CERO dependencias de runtime.
    src/tipos.ts     Esquema de dominio
    src/unidades.ts  Conversiones dB / impedancia / distancia, testeadas aparte
    src/potencia.ts  Regla de margen de potencia (ver docs/motor-mvp.md)
    src/carga.ts     Regla de carga/impedancia
    src/sala.ts      Geometría: disposición + distancia + reflexiones
    src/ganancia.ts  Puente de impedancias + recorrido de volumen (fuente→ampli)
  data/
    src/catalogo.ts        El dato: parlantes, amplificadores, fuentes, cables
    src/tipos-catalogo.ts  DatoCitado<T>, Localizado (bilingüe)
apps/
  web/             Vite + TypeScript modular
    src/main.ts        Arranque, estado, listeners
    src/idioma/         es.ts (define Textos) + en.ts + idioma.ts
    src/formato/        Intl.NumberFormat por idioma
    src/datos/          adaptadores.ts + etiquetas.ts (chips derivados)
    src/vista/          resultado.ts + plano.ts (PUROS) + pintar.ts (DOM) + medidor.ts + selectores.ts
```

El motor tiene que correr en un test de milisegundos sin levantar nada. Si en
algún momento necesita `fetch`, algo se hizo mal. Lo mismo aplica a
`packages/data` y a todo lo puro de `apps/web` — sólo `vista/pintar.ts` y
`vista/medidor.ts` tocan el DOM.

## El primer paso concreto

1. ✅ **Crear el repo** con la estructura de arriba — hecho, sin `tipos.ts`
   todavía (no era necesario para unidades.ts; queda para cuando arranque
   potencia.ts o carga.ts, que sí consumen equipos tipados).
2. ✅ **Fase 1 — unidades.** `packages/engine/src/unidades.ts` con tests
   (`unidades.test.ts`, 10/10 pasando) — conversión de sensibilidad,
   atenuación por distancia (`20·log₁₀`), suma de niveles en dB. Los vectores
   salieron de la aritmética intermedia ya verificada en `docs/motor-mvp.md`.
3. ✅ **Fase 2 — potencia.** `packages/engine/src/potencia.ts` con tests
   (vectores A/B/C de `docs/motor-mvp.md`, más aviso de `potenciaRecMinW` y
   los dos límites exactos de frontera de veredicto — 7 tests, todos pasando).
4. ✅ **Fase 3 — carga y sala.** `packages/engine/src/carga.ts` y `sala.ts`,
   con tests (9 + 5 = 14 tests). `carga.test.ts` lleva como regresión el bug
   real que se encontró y corrigió antes en el prototipo. `sala.test.ts`
   reproduce el vector de `docs/motor-mvp.md` sección 4.
5. ✅ **Fase 4 — frontend (versión HTML único, histórica).** El primer
   frontend fue `prototipo-frontend.html` importando el motor compilado a
   mano (`bundle-navegador.mjs`, para esquivar el bloqueo por CORS de los
   módulos ES sobre `file://`). Superada por la Fase 6: ni el archivo ni el
   bundler existen ya.
6. ✅ **Fase 6 — migración a Vite + bilingüe.** `apps/web/` reemplaza el HTML
   único: TypeScript modular, `packages/engine`/`packages/data` consumidos
   como fuente directa (imports relativos, sin alias — `node --test` no
   entiende los alias de Vite). `vite-plugin-singlefile` mantiene el
   requisito de abrir por doble clic, con un guardia
   (`scripts/verificar-build.mjs`) que hace fallar el build si la regresión
   de CORS vuelve. El motor deja de emitir texto en español (`codigo`, no
   `etiqueta`) para que `apps/web/src/idioma/{es,en}.ts` pueda traducir sin
   duplicar ninguna regla. Catálogo único (`packages/data`) reemplaza la
   duplicación entre el HTML viejo y `data/equipos-seed.json`. 111 tests
   entre los tres paquetes.
7. ⬜ **Fase 7 — deploy.** `npm run build` ya produce un `apps/web/dist/
   index.html` autocontenido, listo para Vercel; falta el `vercel.json`, el
   repo remoto y el primer deploy.
8. ⬜ **Fase 8 — cerrar huecos de streamers/DACs.** WiiM Pro Plus y
   Cambridge CXN V2 siguen con impedancia de salida en `null`.
9. **Fase 5 (cont.) — ampliar la base de datos** (en curso, sin fin natural).
   25 equipos hoy; seguir sumando specs verificados con fuente. La regla de
   `cables` tampoco tiene diseño todavía.

Prompt sugerido para abrir la primera sesión:

> Lee `README.md`, `CLAUDE.md` y `docs/motor-mvp.md`. Empecemos la Fase 1:
> escribamos primero los tests de `packages/engine/src/unidades.ts` con los
> vectores del doc, y después implementa las conversiones hasta que pasen. No
> toques ningún otro archivo.

## Cómo trabajar con Claude Code

- **Una sesión, un objetivo.** "Implementa la regla de potencia con sus tests",
  no "implementa el motor".
- **Tests primero, con los números del doc.** Que no escriba el test y la
  implementación en el mismo paso: el test terminaría confirmando el código en
  vez de la física.
- **Dato faltante nunca es "compatible".** Si falta un spec, el veredicto es
  `sin-datos`, no verde. Un verde falso mata la credibilidad del sitio.
- **Nada de umbrales inventados.** Si una regla necesita un número que no está en
  los docs, se pregunta, no se rellena con un valor "razonable".
- **Cero equipos hardcodeados en el motor.** Todo entra por los datos.
- **Unidades en el nombre del campo:** `sensibilidadDb`, `potenciaW`,
  `impedanciaOhm`. Nunca un número desnudo.

Tu control de calidad no es leer el código —eso lo revisa Claude Code— sino
verificar que cada resultado coincida con el número que ya calculaste. Por eso
cada fase termina en algo comprobable a mano.

## Archivos de este paquete

- `README.md` — este archivo.
- `CLAUDE.md` — contexto del motor para el repo (dos capas, prohibiciones,
  convenciones). Tiene el detalle más al día del estado del proyecto.
- `docs/motor-mvp.md` — las fórmulas exactas que implementa el motor, con
  vectores de prueba. **Lo más importante para tocar cualquier regla.**
- `packages/data/src/catalogo.ts` — el catálogo curado, bilingüe, con fuentes.
- `apps/web/` — el sitio real (Vite); no hay ya un HTML de un solo archivo
  para usar de referencia visual — `npm run dev` o `npm run build` desde la
  raíz.

## Decisiones abiertas

- El **nombre** "CADENA" es un placeholder (es el concepto central: un sistema es
  una cadena). Cámbialo si quieres.
- La **función de score 0–100** para ordenar candidatos cuando haya modo búsqueda:
  no sale de la física, hay que definirla.
- Si en algún momento se **monetiza con afiliación**, vuelve el riesgo de empujar
  a comprar. Se puede hacer honesto (links transparentes, decir cuando el
  presupuesto alcanza de sobra), pero hay que diseñarlo, no improvisarlo.
