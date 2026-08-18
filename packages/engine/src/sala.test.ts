import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularDisposicion,
  calcularDisposicionManual,
  puntoDulceDesdeParlantes,
  clampPosicionParlante,
  MARGEN_MURO_MIN_M,
  ALTURA_ESCUCHA_M,
} from './sala.ts';

const EPS = 0.005; // más fino que la tolerancia de dB: acá son metros

test('vector de motor-mvp.md sección 4 — W=3.6, L=5.0', () => {
  const d = calcularDisposicion({ anchoM: 3.6, largoM: 5.0, altoM: 2.4 });

  assert.ok(Math.abs(d.centroXM - 1.8) < EPS);
  assert.ok(Math.abs(d.separacionM - 1.98) < EPS);
  assert.ok(Math.abs(d.offsetFrenteM - 0.75) < EPS);
  assert.ok(Math.abs(d.filaEscuchaM - 3.126) < EPS);
  assert.ok(Math.abs(d.parlanteIzq.x - 0.81) < EPS);
  assert.ok(Math.abs(d.parlanteDer.x - 2.79) < EPS);
  assert.ok(Math.abs(d.distanciaEscuchaM - 2.574) < EPS);
  assert.ok(Math.abs(d.reflexionIzq.y - 1.487) < EPS);
  assert.ok(Math.abs(d.reflexionIzq.x - 0) < EPS);
  assert.ok(Math.abs(d.reflexionDer.x - 3.6) < EPS);
  assert.ok(Math.abs(d.reflexionDer.y - 1.487) < EPS);
  assert.ok(Math.abs(d.puntoDulce.x - 1.8) < EPS);
  assert.ok(Math.abs(d.puntoDulce.y - 3.126) < EPS);
});

test('distanciaEscuchaM alimenta directamente a la regla de potencia (mismo dato, no se recalcula)', () => {
  const d = calcularDisposicion({ anchoM: 3.6, largoM: 5.0, altoM: 2.4 });
  assert.equal(typeof d.distanciaEscuchaM, 'number');
  assert.ok(d.distanciaEscuchaM > 0);
});

test('separación de parlantes respeta el piso de 1,5 m en salas muy angostas', () => {
  // W=2.5 (el mínimo del slider del prototipo): 0.55*2.5=1.375 < 1.5 → clamp al piso
  const d = calcularDisposicion({ anchoM: 2.5, largoM: 5.0, altoM: 2.4 });
  assert.ok(Math.abs(d.separacionM - 1.5) < EPS);
});

test('separación de parlantes respeta el techo de 3,0 m en salas muy anchas', () => {
  // W=7 (el máximo del slider): 0.55*7=3.85, min(3.0, 7-1)=3.0 → clamp al techo
  const d = calcularDisposicion({ anchoM: 7, largoM: 9, altoM: 2.4 });
  assert.ok(Math.abs(d.separacionM - 3.0) < EPS);
});

test('volumen = ancho × largo × alto', () => {
  const d = calcularDisposicion({ anchoM: 3.6, largoM: 5.0, altoM: 2.4 });
  assert.ok(Math.abs(d.volumenM3 - 43.2) < EPS);
});

// ---- reflexión trasera, techo, piso (vectores a mano, misma sala 3,6×5,0×2,4) ----

test('reflexión trasera: método de imagen especular reflejando el punto de escucha a través de y=largoM', () => {
  const d = calcularDisposicion({ anchoM: 3.6, largoM: 5.0, altoM: 2.4 });
  // espejo de escucha (1.8, 3.126) a través de y=5.0 → (1.8, 6.874)
  // t = (5.0-0.75)/(6.874-0.75) = 4.25/6.124 = 0.693991
  // x = 0.81 + t*(1.8-0.81) = 0.81 + t*0.99 ≈ 1.4971 (izq); 2.79 - t*0.99 ≈ 2.1029 (der)
  assert.ok(Math.abs(d.reflexionTraseraIzq.y - 5.0) < EPS, `y=${d.reflexionTraseraIzq.y}`);
  assert.ok(Math.abs(d.reflexionTraseraIzq.x - 1.4971) < EPS, `x=${d.reflexionTraseraIzq.x}`);
  assert.ok(Math.abs(d.reflexionTraseraDer.y - 5.0) < EPS);
  assert.ok(Math.abs(d.reflexionTraseraDer.x - 2.1029) < EPS, `x=${d.reflexionTraseraDer.x}`);
  // distancia total del camino reflejado = distancia parlante→espejo
  assert.ok(Math.abs(d.distanciaTraseraIzqM - 6.2035) < EPS, `dist=${d.distanciaTraseraIzqM}`);
  assert.ok(Math.abs(d.distanciaTraseraDerM - 6.2035) < EPS, `dist=${d.distanciaTraseraDerM}`);
});

test('reflexión de techo y piso: con parlante y oído a la misma altura, el punto cae en el punto medio horizontal entre parlante y punto dulce', () => {
  const d = calcularDisposicion({ anchoM: 3.6, largoM: 5.0, altoM: 2.4 });
  // punto medio (parlanteIzq, puntoDulce) = ((0.81+1.8)/2, (0.75+3.126)/2) = (1.305, 1.938)
  assert.ok(Math.abs(d.reflexionPisoIzq.x - 1.305) < EPS);
  assert.ok(Math.abs(d.reflexionPisoIzq.y - 1.938) < EPS);
  assert.ok(Math.abs(d.reflexionTechoIzq.x - 1.305) < EPS);
  assert.ok(Math.abs(d.reflexionTechoIzq.y - 1.938) < EPS);
  // punto medio derecho: ((2.79+1.8)/2, 1.938) = (2.295, 1.938)
  assert.ok(Math.abs(d.reflexionPisoDer.x - 2.295) < EPS);
  assert.ok(Math.abs(d.reflexionTechoDer.x - 2.295) < EPS);
  // distancia piso: sqrt(0.99² + 2.376² + 2·alturaM²) con alturaM=1.0 → sqrt(0.9801+5.645376+4.0)=3.2597
  assert.ok(Math.abs(d.distanciaPisoIzqM - 3.2597) < EPS, `dist=${d.distanciaPisoIzqM}`);
  assert.ok(Math.abs(d.distanciaPisoDerM - 3.2597) < EPS);
  // distancia techo: sqrt(0.99² + 2.376² + (2·(altoM-alturaM))²) = sqrt(0.9801+5.645376+2.8²)=3.8034
  assert.ok(Math.abs(d.distanciaTechoIzqM - 3.8034) < EPS, `dist=${d.distanciaTechoIzqM}`);
  assert.ok(Math.abs(d.distanciaTechoDerM - 3.8034) < EPS);
});

test('distancia lateral (nueva, vía imagen especular 3D) coincide con la geometría 2D ya testeada de reflexionIzq/reflexionDer', () => {
  const d = calcularDisposicion({ anchoM: 3.6, largoM: 5.0, altoM: 2.4 });
  // dist(parlanteIzq, espejo de escucha a través de x=0) = sqrt(2.61² + 2.376²) = 3.5295
  assert.ok(Math.abs(d.distanciaLateralIzqM - 3.5295) < EPS, `dist=${d.distanciaLateralIzqM}`);
  assert.ok(Math.abs(d.distanciaLateralDerM - 3.5295) < EPS);
});

test('ALTURA_ESCUCHA_M es un supuesto positivo y menor que la altura típica de sala, expuesto en alturaM', () => {
  const d = calcularDisposicion({ anchoM: 3.6, largoM: 5.0, altoM: 2.4 });
  assert.equal(d.alturaM, ALTURA_ESCUCHA_M);
  assert.ok(ALTURA_ESCUCHA_M > 0 && ALTURA_ESCUCHA_M < 2.4);
});

test('simetría izquierda/derecha: todas las distancias reflejadas nuevas son iguales entre canales (sala simétrica)', () => {
  const d = calcularDisposicion({ anchoM: 4.2, largoM: 6.0, altoM: 2.6 });
  assert.ok(Math.abs(d.distanciaLateralIzqM - d.distanciaLateralDerM) < EPS);
  assert.ok(Math.abs(d.distanciaTraseraIzqM - d.distanciaTraseraDerM) < EPS);
  assert.ok(Math.abs(d.distanciaPisoIzqM - d.distanciaPisoDerM) < EPS);
  assert.ok(Math.abs(d.distanciaTechoIzqM - d.distanciaTechoDerM) < EPS);
});

// ---- calcularDisposicionManual / puntoDulceDesdeParlantes / clampPosicionParlante ----

test('calcularDisposicionManual con los mismos parlantes que calcularDisposicion reproduce el resultado exacto (reducción algebraica, no coincidencia)', () => {
  const sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 };
  const auto = calcularDisposicion(sala);
  const manual = calcularDisposicionManual(sala, auto.parlanteIzq, auto.parlanteDer);

  assert.ok(Math.abs(manual.centroXM - auto.centroXM) < EPS);
  assert.ok(Math.abs(manual.separacionM - auto.separacionM) < EPS);
  assert.ok(Math.abs(manual.offsetFrenteM - auto.offsetFrenteM) < EPS);
  assert.ok(Math.abs(manual.filaEscuchaM - auto.filaEscuchaM) < EPS);
  assert.ok(Math.abs(manual.puntoDulce.x - auto.puntoDulce.x) < EPS);
  assert.ok(Math.abs(manual.puntoDulce.y - auto.puntoDulce.y) < EPS);
  assert.ok(Math.abs(manual.distanciaEscuchaM - auto.distanciaEscuchaM) < EPS);
  assert.ok(Math.abs(manual.reflexionIzq.x - auto.reflexionIzq.x) < EPS);
  assert.ok(Math.abs(manual.reflexionIzq.y - auto.reflexionIzq.y) < EPS);
  assert.ok(Math.abs(manual.reflexionDer.x - auto.reflexionDer.x) < EPS);
  assert.ok(Math.abs(manual.reflexionDer.y - auto.reflexionDer.y) < EPS);
  assert.ok(Math.abs(manual.distanciaTraseraIzqM - auto.distanciaTraseraIzqM) < EPS);
  assert.ok(Math.abs(manual.distanciaTechoIzqM - auto.distanciaTechoIzqM) < EPS);
  assert.ok(Math.abs(manual.distanciaPisoIzqM - auto.distanciaPisoIzqM) < EPS);
});

test('parlantes en diagonal, no alineados a ningún eje: el punto dulce queda equidistante de ambos por construcción (mediatriz)', () => {
  const sala = { anchoM: 4.5, largoM: 6.0, altoM: 2.6 };
  const izq = { x: 0.8, y: 0.6 };
  const der = { x: 3.5, y: 1.4 };
  const d = calcularDisposicionManual(sala, izq, der);
  const h = ALTURA_ESCUCHA_M;
  const distIzq = Math.hypot(d.parlanteIzq.x - d.puntoDulce.x, d.parlanteIzq.y - d.puntoDulce.y, h - h);
  const distDer = Math.hypot(d.parlanteDer.x - d.puntoDulce.x, d.parlanteDer.y - d.puntoDulce.y, h - h);
  assert.ok(Math.abs(distIzq - distDer) < EPS, `izq=${distIzq} der=${distDer}`);
  assert.ok(Math.abs(distIzq - d.distanciaEscuchaM) < EPS);
});

test('identidad de camino reflejado (caso asimétrico): distancia parlante→reflexión + reflexión→escucha = distancia total declarada, en las 8 reflexiones', () => {
  const sala = { anchoM: 4.5, largoM: 6.0, altoM: 2.6 };
  const izq = { x: 0.8, y: 0.6 };
  const der = { x: 3.5, y: 1.4 };
  const d = calcularDisposicionManual(sala, izq, der);
  const h = ALTURA_ESCUCHA_M;

  function caminoTotal(
    parlante: { x: number; y: number },
    zParlante: number,
    reflexion: { x: number; y: number },
    zReflexion: number
  ): number {
    const aReflexion = Math.hypot(parlante.x - reflexion.x, parlante.y - reflexion.y, zParlante - zReflexion);
    const aEscucha = Math.hypot(reflexion.x - d.puntoDulce.x, reflexion.y - d.puntoDulce.y, zReflexion - h);
    return aReflexion + aEscucha;
  }

  assert.ok(Math.abs(caminoTotal(d.parlanteIzq, h, d.reflexionIzq, h) - d.distanciaLateralIzqM) < EPS);
  assert.ok(Math.abs(caminoTotal(d.parlanteDer, h, d.reflexionDer, h) - d.distanciaLateralDerM) < EPS);
  assert.ok(Math.abs(caminoTotal(d.parlanteIzq, h, d.reflexionTraseraIzq, h) - d.distanciaTraseraIzqM) < EPS);
  assert.ok(Math.abs(caminoTotal(d.parlanteDer, h, d.reflexionTraseraDer, h) - d.distanciaTraseraDerM) < EPS);
  assert.ok(Math.abs(caminoTotal(d.parlanteIzq, h, d.reflexionPisoIzq, 0) - d.distanciaPisoIzqM) < EPS);
  assert.ok(Math.abs(caminoTotal(d.parlanteDer, h, d.reflexionPisoDer, 0) - d.distanciaPisoDerM) < EPS);
  assert.ok(Math.abs(caminoTotal(d.parlanteIzq, h, d.reflexionTechoIzq, sala.altoM) - d.distanciaTechoIzqM) < EPS);
  assert.ok(Math.abs(caminoTotal(d.parlanteDer, h, d.reflexionTechoDer, sala.altoM) - d.distanciaTechoDerM) < EPS);
});

test('puntoDulceDesdeParlantes con los dos parlantes en el mismo punto no produce NaN — usa el fallback declarado (derecho hacia atrás)', () => {
  const sala = { anchoM: 4.0, largoM: 5.0, altoM: 2.4 };
  const p = { x: 2.0, y: 1.0 };
  const pd = puntoDulceDesdeParlantes(p, p, sala);
  assert.ok(Number.isFinite(pd.x) && Number.isFinite(pd.y));
  assert.ok(pd.y > p.y, 'se mueve hacia el fondo de la sala, no se queda pegado');
  assert.ok(Math.abs(pd.x - p.x) < EPS, 'sin desvío lateral cuando la separación es ~0');
});

test('con los parlantes invertidos en diagonal (derecho más adelante que izquierdo), el punto dulce igual queda hacia el fondo de la sala', () => {
  const sala = { anchoM: 4.0, largoM: 6.0, altoM: 2.4 };
  const izq = { x: 1.0, y: 2.0 };
  const der = { x: 3.0, y: 0.8 }; // der más cerca del frente que izq
  const pd = puntoDulceDesdeParlantes(izq, der, sala);
  const medioY = (izq.y + der.y) / 2;
  assert.ok(pd.y > medioY, `puntoDulce debería quedar detrás del punto medio: y=${pd.y} medioY=${medioY}`);
});

test('clampPosicionParlante recorta en los 4 bordes y no modifica un punto ya adentro', () => {
  const sala = { anchoM: 4.0, largoM: 5.0, altoM: 2.4 };
  const centro = clampPosicionParlante({ x: 2.0, y: 2.5 }, sala);
  assert.ok(Math.abs(centro.x - 2.0) < EPS);
  assert.ok(Math.abs(centro.y - 2.5) < EPS);

  const fueraIzq = clampPosicionParlante({ x: -1, y: 2.5 }, sala);
  assert.ok(Math.abs(fueraIzq.x - MARGEN_MURO_MIN_M) < EPS);

  const fueraDer = clampPosicionParlante({ x: 10, y: 2.5 }, sala);
  assert.ok(Math.abs(fueraDer.x - (sala.anchoM - MARGEN_MURO_MIN_M)) < EPS);

  const fueraFrente = clampPosicionParlante({ x: 2.0, y: -1 }, sala);
  assert.ok(Math.abs(fueraFrente.y - MARGEN_MURO_MIN_M) < EPS);

  const fueraFondo = clampPosicionParlante({ x: 2.0, y: 10 }, sala);
  assert.ok(Math.abs(fueraFondo.y - (sala.largoM - MARGEN_MURO_MIN_M)) < EPS);
});

test('el punto dulce derivado también respeta el margen de muro cuando la sala es muy chica', () => {
  const sala = { anchoM: 2.0, largoM: 2.2, altoM: 2.4 };
  const izq = { x: 0.5, y: 0.5 };
  const der = { x: 1.5, y: 0.5 };
  const pd = puntoDulceDesdeParlantes(izq, der, sala);
  assert.ok(pd.y <= sala.largoM - MARGEN_MURO_MIN_M + EPS);
  assert.ok(pd.y >= MARGEN_MURO_MIN_M - EPS);
});
