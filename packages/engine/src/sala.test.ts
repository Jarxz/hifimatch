import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularDisposicion, ALTURA_ESCUCHA_M } from './sala.ts';

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
