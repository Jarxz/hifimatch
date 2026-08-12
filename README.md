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

- **Frontend:** hay un prototipo funcional y navegable en
  `prototipo-frontend.html` (fondo negro, hi-end). Tres pantallas: portada →
  configurar → resultado. Es la especificación visual y de comportamiento.
- **Motor:** la lógica de referencia (potencia, carga, geometría de sala)
  todavía vive **dentro del JavaScript del prototipo** — ya probada contra los
  vectores de `docs/motor-mvp.md` con un harness de Node; se encontró y corrigió
  un bug real en la regla de carga (divergía del umbral documentado). El
  primer paquete de TypeScript ya arrancó: `packages/engine/src/unidades.ts`
  (conversión de sensibilidad, atenuación por distancia, suma de niveles en
  dB), con tests (`node --test src/unidades.test.ts`, 10/10 pasando) tomados
  de la aritmética ya verificada en `docs/motor-mvp.md`. `potencia.ts`,
  `carga.ts`, `sala.ts` y `tipos.ts` todavía no existen como paquete.
- **Base de datos:** semilla de 25 equipos con specs verificados y con fuente,
  en `data/equipos-seed.json` — 8 parlantes, 8 amplificadores, 3 streamers, 3
  DACs y 3 cables (interconexión y parlante, con resistencia/capacitancia/
  inductancia reales de ficha técnica). Es el activo de curaduría y sirve de
  fixtures de test. Streamers, DACs y cables están curados con la misma
  disciplina pero **no participan de ninguna regla implementada todavía**: el
  motor sólo calcula potencia y carga a partir de parlante + amplificador. La
  regla de ganancia de cadena / puente de impedancias fuente-amp (streamer o
  DAC → amplificador) ya está **diseñada** — fórmula, umbrales y vectores de
  prueba en `docs/motor-mvp.md` sección 6 — pero falta portarla a código y
  falta definir un umbral (cuánto recorrido de volumen se considera "corto").
  `packages/engine/src/potencia.ts` ya implementa la regla de potencia real,
  con tests contra pares reales de esta base.
  `cables` todavía no tiene ni diseño de regla.
- **Prueba de realidad de la data:** confirmada. Para equipos populares los specs
  existen (fichas de fabricante + mediciones independientes de Stereophile,
  Erin's Audio Corner, ASR). La advertencia es que el spec de fábrica puede
  engañar —el Klipsch declara 94,5 dB pero la anecoica da ~86— así que la base
  necesita **curaduría, no copiar y pegar**.

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

## Arquitectura propuesta

```
packages/
  engine/          TypeScript puro, CERO dependencias de runtime.
    src/tipos.ts   Esquema de dominio (equipos, veredictos) — reusar el anterior
    src/unidades.ts  Conversiones dB / impedancia / distancia, testeadas aparte
    src/potencia.ts  Regla de margen de potencia (ver docs/motor-mvp.md)
    src/carga.ts     Regla de carga/impedancia
    src/sala.ts      Geometría: disposición + distancia + reflexiones
  data/
    equipos.json   Base curada (arranca desde data/equipos-seed.json)
apps/
  web/             El frontend (portar prototipo-frontend.html a componentes)
```

El motor tiene que correr en un test de milisegundos sin levantar nada. Si en
algún momento necesita `fetch`, algo se hizo mal.

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
4. **Fase 3 — carga y sala** (próximo paso pendiente). Las reglas de
   impedancia y la geometría del plano.
5. **Fase 4 — frontend.** Portar el prototipo a la app, ahora consumiendo el
   motor real en vez de tener la lógica adentro.
6. **Fase 5 — ampliar la base de datos.** Diez o quince equipos populares más,
   con specs verificados y con fuente. Es la curaduría de la que depende todo.

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
  convenciones).
- `docs/motor-mvp.md` — las fórmulas exactas que hoy implementa el prototipo, con
  vectores de prueba. **Lo más importante para portar el motor.**
- `data/equipos-seed.json` — base de datos semilla, con fuentes.
- `prototipo-frontend.html` — el prototipo navegable; referencia visual y de
  comportamiento.

## Decisiones abiertas

- El **nombre** "CADENA" es un placeholder (es el concepto central: un sistema es
  una cadena). Cámbialo si quieres.
- La **función de score 0–100** para ordenar candidatos cuando haya modo búsqueda:
  no sale de la física, hay que definirla.
- Si en algún momento se **monetiza con afiliación**, vuelve el riesgo de empujar
  a comprar. Se puede hacer honesto (links transparentes, decir cuando el
  presupuesto alcanza de sobra), pero hay que diseñarlo, no improvisarlo.
