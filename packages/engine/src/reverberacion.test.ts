import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluarReverberacion,
  ABSORCION_MURO_BANDAS,
  ABSORCION_PISO_BANDAS,
  ABSORCION_TECHO_BANDAS,
  CONTENIDO_SABINES_M2_PISO,
  BANDAS_HZ,
  UMBRAL_EYRING_ALPHA,
  ALPHA_CAMPO_DIFUSO_MAX,
} from './reverberacion.ts';
import type { Sala } from './sala.ts';
import type { Materiales } from './reverberacion.ts';

const EPS = 0.0005;
const SALA_VECTOR: Sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 }; // misma sala por defecto que sala.ts/modos.ts

const TIPICOS: Materiales = {
  muroFrontal: 'yesoCarton',
  muroPosterior: 'yesoCarton',
  muroIzquierdo: 'yesoCarton',
  muroDerecho: 'yesoCarton',
  piso: 'maderaLaminado',
  techo: 'yesoCarton',
};

test('vector de sala por defecto, escenario amoblado: las 3 bandas quedan en Sabine/Eyring (ninguna cruza el límite de dominio)', () => {
  // Superficies: S_frontal=S_posterior=3,6×2,4=8,64 m²; S_izq=S_der=5,0×2,4=12,00 m²;
  // S_piso=S_techo=18,00 m²; S_total=77,28 m²; V=43,2 m³.
  // Estructura (sin contenido) a 500 Hz: 7,188 sabines (ᾱ=0,093012, vector ya conocido
  // del modelo anterior). Contenido amoblado a 500 Hz: 0,45 sabines/m² × 18,00 m² =
  // 8,10 sabines. Vectores exactos (computados con node, no a mano):
  //   125 Hz: ᾱ=0,2736957 (Eyring) → RT60=0,2814381 s
  //   500 Hz: ᾱ=0,1978261 (Sabine) → RT60=0,4549451 s
  //  2000 Hz: ᾱ=0,1844099 (Sabine) → RT60=0,4880431 s
  // RT60 amoblado = (0,4549451+0,4880431)/2 = 0,4714941 s
  const r = evaluarReverberacion(SALA_VECTOR, TIPICOS);
  assert.ok(Math.abs(r.volumenM3 - 43.2) < EPS);
  assert.ok(Math.abs(r.superficieFrontalM2 - 8.64) < EPS);
  assert.ok(Math.abs(r.superficieIzquierdaM2 - 12) < EPS);
  assert.ok(Math.abs(r.superficieTotalM2 - 77.28) < EPS);
  assert.equal(r.bandas.length, 3);
  assert.deepEqual(r.bandas.map((b) => b.hz), [...BANDAS_HZ]);

  const b125 = r.bandas[0]!;
  assert.ok(Math.abs(b125.alphaBar - 0.2736957) < EPS, `alphaBar125=${b125.alphaBar}`);
  assert.equal(b125.metodo, 'eyring');
  assert.ok(b125.rt60S !== null && Math.abs(b125.rt60S - 0.2814381) < EPS, `rt60_125=${b125.rt60S}`);

  const b500 = r.bandas[1]!;
  assert.ok(Math.abs(b500.alphaBar - 0.1978261) < EPS, `alphaBar500=${b500.alphaBar}`);
  assert.equal(b500.metodo, 'sabine');
  assert.ok(b500.rt60S !== null && Math.abs(b500.rt60S - 0.4549451) < EPS, `rt60_500=${b500.rt60S}`);

  const b2000 = r.bandas[2]!;
  assert.ok(Math.abs(b2000.alphaBar - 0.1844099) < EPS, `alphaBar2000=${b2000.alphaBar}`);
  assert.equal(b2000.metodo, 'sabine');
  assert.ok(b2000.rt60S !== null && Math.abs(b2000.rt60S - 0.4880431) < EPS, `rt60_2000=${b2000.rt60S}`);

  assert.ok(r.rt60S !== null && Math.abs(r.rt60S - 0.4714941) < EPS, `rt60S=${r.rt60S}`);
  assert.equal(r.severidad, 'sin-datos');
  assert.equal(r.codigo, 'rt60-estimado');

  // Frecuencia de Schroeder: desde la banda de 500 Hz del escenario amoblado —
  // fs = 2000·√(0,4549451/43,2) = 205,2426 Hz (no desde el promedio final).
  assert.ok(r.frecuenciaSchroederHz !== null && Math.abs(r.frecuenciaSchroederHz - 205.2426) < 0.005, `fs=${r.frecuenciaSchroederHz}`);
});

test('límite de dominio: combinación extrema (4 muros "vacío" + piso/techo muy absorbentes) empuja 500/2000 Hz fuera del régimen de campo difuso — null, no un número', () => {
  // Los 4 muros abiertos ya dan ᾱ_estructura alto en 500/2000 Hz; sumar el
  // término de contenido lo empuja por encima de ALPHA_CAMPO_DIFUSO_MAX
  // (0,8) en esas dos bandas — ninguna de las dos fórmulas describe ya una
  // sala así (energía absorbida en 1-2 rebotes, no hay campo difuso que
  // promediar). 125 Hz, en cambio, queda justo debajo del límite y sigue
  // dando un número (Eyring). Vectores exactos (node): 125 Hz ᾱ=0,7034
  // (Eyring, rt60=0,0558 s); 500 Hz ᾱ=0,8929 (fuera de dominio); 2000 Hz
  // ᾱ=1,0191 (fuera de dominio, ni siquiera acotado a <1 — ya no hace
  // falta ningún clamp numérico porque el chequeo de dominio corta antes
  // de llegar a evaluar el logaritmo de Eyring).
  const sala: Sala = { anchoM: 2.5, largoM: 3.0, altoM: 2.2 };
  const materiales: Materiales = {
    muroFrontal: 'vacio',
    muroPosterior: 'vacio',
    muroIzquierdo: 'vacio',
    muroDerecho: 'vacio',
    piso: 'alfombra',
    techo: 'panelAcustico',
  };
  const r = evaluarReverberacion(sala, materiales);

  const b125 = r.bandas[0]!;
  assert.ok(b125.alphaBar <= ALPHA_CAMPO_DIFUSO_MAX);
  assert.equal(b125.metodo, 'eyring');
  assert.ok(b125.rt60S !== null && b125.rt60S > 0);

  const b500 = r.bandas[1]!;
  const b2000 = r.bandas[2]!;
  assert.ok(b500.alphaBar > ALPHA_CAMPO_DIFUSO_MAX, `este vector necesita ᾱ>0,8 en 500 Hz, dio ${b500.alphaBar}`);
  assert.ok(b2000.alphaBar > ALPHA_CAMPO_DIFUSO_MAX, `este vector necesita ᾱ>0,8 en 2000 Hz, dio ${b2000.alphaBar}`);
  assert.equal(b500.metodo, 'fuera-de-dominio');
  assert.equal(b2000.metodo, 'fuera-de-dominio');
  assert.equal(b500.rt60S, null);
  assert.equal(b2000.rt60S, null);

  // Como 500 y/o 2000 Hz son null, el RT60 final no se promedia a medias —
  // el resultado completo (amoblado) queda sin número, y el código lo declara.
  assert.equal(r.rt60S, null);
  assert.equal(r.codigo, 'rt60-fuera-de-dominio');
  assert.equal(r.severidad, 'sin-datos'); // sigue siendo sin-datos, no un tercer valor

  // Por monotonía (el contenido sólo agrega absorción), si el amoblado está
  // fuera de dominio en una banda, el escenario vacío (menos absorción) en
  // esa misma sala también puede estarlo — acá lo está: fs depende de la
  // banda de 500 Hz amoblada, así que también es null.
  assert.equal(r.frecuenciaSchroederHz, null);
});

test('rt60RangoS = [amoblado, vacío], el amoblado es el extremo menor (más absorción → RT60 más corto)', () => {
  const r = evaluarReverberacion(SALA_VECTOR, TIPICOS);
  const [amoblado, vacio] = r.rt60RangoS;
  assert.ok(amoblado !== null && vacio !== null);
  assert.equal(amoblado, r.rt60S);
  assert.ok(amoblado! < vacio!, `amoblado=${amoblado} debería ser menor que vacio=${vacio}`);
  // El extremo vacío coincide con el vector del modelo anterior a esta ronda
  // (sólo estructura, sin contenido): RT60 final ≈ 1,491456 s.
  assert.ok(Math.abs(vacio! - 1.491456) < EPS, `vacio=${vacio}`);
});

test('el RT60 final (banda 500+2000 Hz) coincide con el promedio simple reportado, en ambos escenarios', () => {
  const r = evaluarReverberacion(SALA_VECTOR, TIPICOS);
  const b500 = r.bandas[1]!.rt60S;
  const b2000 = r.bandas[2]!.rt60S;
  assert.ok(b500 !== null && b2000 !== null);
  const promedioAmoblado = (b500! + b2000!) / 2;
  assert.ok(r.rt60S !== null && Math.abs(r.rt60S - promedioAmoblado) < 1e-9);

  const bv500 = r.bandasVacio[1]!.rt60S;
  const bv2000 = r.bandasVacio[2]!.rt60S;
  assert.ok(bv500 !== null && bv2000 !== null);
  const promedioVacio = (bv500! + bv2000!) / 2;
  assert.ok(r.rt60RangoS[1] !== null && Math.abs(r.rt60RangoS[1]! - promedioVacio) < 1e-9);
});

test('severidad siempre "sin-datos"; código refleja si el modelo pudo dar un número o no', () => {
  const salas: Sala[] = [
    { anchoM: 2.5, largoM: 3.0, altoM: 2.2 },
    { anchoM: 3.6, largoM: 5.0, altoM: 2.4 },
    { anchoM: 7, largoM: 9, altoM: 3.5 },
  ];
  const combos: Materiales[] = [
    TIPICOS,
    { ...TIPICOS, muroFrontal: 'vacio', muroPosterior: 'vacio' },
    { muroFrontal: 'vacio', muroPosterior: 'vacio', muroIzquierdo: 'vacio', muroDerecho: 'vacio', piso: 'alfombra', techo: 'panelAcustico' },
    { muroFrontal: 'panelAcustico', muroPosterior: 'panelAcustico', muroIzquierdo: 'panelAcustico', muroDerecho: 'panelAcustico', piso: 'alfombra', techo: 'panelAcustico' },
  ];
  for (const sala of salas) {
    for (const materiales of combos) {
      const r = evaluarReverberacion(sala, materiales);
      assert.equal(r.severidad, 'sin-datos');
      assert.ok(r.codigo === 'rt60-estimado' || r.codigo === 'rt60-fuera-de-dominio');
      assert.equal(r.codigo === 'rt60-fuera-de-dominio', r.rt60S === null);
      for (const b of [...r.bandas, ...r.bandasVacio]) {
        if (b.rt60S === null) {
          assert.equal(b.metodo, 'fuera-de-dominio');
          assert.ok(b.alphaBar > ALPHA_CAMPO_DIFUSO_MAX);
        } else {
          assert.ok(Number.isFinite(b.rt60S) && b.rt60S > 0, `rt60S de banda ${b.hz} Hz no es finito/positivo: ${b.rt60S}`);
          assert.ok(b.metodo === 'sabine' || b.metodo === 'eyring');
        }
      }
    }
  }
});

test('muro frontal "vacío" (abertura/pasillo): α=1,0 en las 3 bandas, baja el RT60 en los dos escenarios', () => {
  assert.deepEqual(ABSORCION_MURO_BANDAS.vacio, [1.0, 1.0, 1.0]);
  const materiales: Materiales = { ...TIPICOS, muroFrontal: 'vacio' };
  const base = evaluarReverberacion(SALA_VECTOR, TIPICOS);
  const conAbertura = evaluarReverberacion(SALA_VECTOR, materiales);
  assert.ok(base.rt60S !== null && conAbertura.rt60S !== null);
  assert.ok(conAbertura.rt60S! < base.rt60S!, 'RT60 amoblado debería bajar con un muro abierto');
  assert.ok(base.rt60RangoS[1] !== null && conAbertura.rt60RangoS[1] !== null);
  assert.ok(conAbertura.rt60RangoS[1]! < base.rt60RangoS[1]!, 'RT60 vacío debería bajar con un muro abierto');
});

test('los 4 muros son independientes: cambiar sólo uno cambia el resultado, los otros tres no fuerzan el mismo material', () => {
  const base = evaluarReverberacion(SALA_VECTOR, TIPICOS);
  const conVidrioFrontal = evaluarReverberacion(SALA_VECTOR, { ...TIPICOS, muroFrontal: 'vidrio' });
  assert.notEqual(base.absorcionTotalSabines, conVidrioFrontal.absorcionTotalSabines);
  assert.ok(Math.abs(conVidrioFrontal.absorcionPosteriorSabines - base.absorcionPosteriorSabines) < EPS);
  assert.ok(Math.abs(conVidrioFrontal.absorcionIzquierdaSabines - base.absorcionIzquierdaSabines) < EPS);
  assert.ok(Math.abs(conVidrioFrontal.absorcionDerechaSabines - base.absorcionDerechaSabines) < EPS);
});

test('absorción a 500 Hz (banda de referencia del desglose) es SÓLO estructura — la suma de las 6 superficies, sin el término de contenido', () => {
  const materiales: Materiales = {
    muroFrontal: 'vidrio',
    muroPosterior: 'hormigon',
    muroIzquierdo: 'madera',
    muroDerecho: 'yesoCarton',
    piso: 'porcelanato',
    techo: 'hormigon',
  };
  const r = evaluarReverberacion(SALA_VECTOR, materiales);
  const idx500 = 1;
  const esperado =
    ABSORCION_MURO_BANDAS.vidrio[idx500] * r.superficieFrontalM2 +
    ABSORCION_MURO_BANDAS.hormigon[idx500] * r.superficiePosteriorM2 +
    ABSORCION_MURO_BANDAS.madera[idx500] * r.superficieIzquierdaM2 +
    ABSORCION_MURO_BANDAS.yesoCarton[idx500] * r.superficieDerechaM2 +
    ABSORCION_PISO_BANDAS.porcelanato[idx500] * r.superficiePisoM2 +
    ABSORCION_TECHO_BANDAS.hormigon[idx500] * r.superficieTechoM2;
  assert.ok(Math.abs(r.absorcionTotalSabines - esperado) < 1e-9);

  // El total de la banda amoblada (bandas[1]) SÍ incluye el contenido, así
  // que ya no coincide con absorcionTotalSabines (estructura sola).
  const contenidoEsperado = CONTENIDO_SABINES_M2_PISO.amoblado[idx500] * r.superficiePisoM2;
  assert.ok(Math.abs(r.absorcionContenidoSabines - contenidoEsperado) < 1e-9);
  assert.ok(Math.abs(r.bandas[1]!.alphaBar * r.superficieTotalM2 - (esperado + contenidoEsperado)) < 1e-9);
  // El escenario vacío, en cambio, sí coincide exactamente con la estructura sola.
  assert.ok(Math.abs(r.bandasVacio[1]!.alphaBar * r.superficieTotalM2 - esperado) < 1e-9);
});

test('CONTENIDO_SABINES_M2_PISO.vacio es [0,0,0] — el escenario vacío es literalmente sin contenido', () => {
  assert.deepEqual(CONTENIDO_SABINES_M2_PISO.vacio, [0, 0, 0]);
});

test('ᾱ entre UMBRAL_EYRING_ALPHA y ALPHA_CAMPO_DIFUSO_MAX: Eyring predice un RT60 menor que el que Sabine hubiera dado para la misma ᾱ (Sabine sobreestima en alta absorción)', () => {
  const materiales: Materiales = {
    muroFrontal: 'panelAcustico',
    muroPosterior: 'panelAcustico',
    muroIzquierdo: 'panelAcustico',
    muroDerecho: 'panelAcustico',
    piso: 'maderaLaminado',
    techo: 'yesoCarton',
  };
  const r = evaluarReverberacion(SALA_VECTOR, materiales);
  for (const b of [r.bandas[1]!, r.bandas[2]!]) {
    assert.ok(b.alphaBar > UMBRAL_EYRING_ALPHA && b.alphaBar <= ALPHA_CAMPO_DIFUSO_MAX, `alphaBar=${b.alphaBar} debería estar entre los dos umbrales`);
    assert.equal(b.metodo, 'eyring');
    assert.ok(b.rt60S !== null);
    const rt60SabineIngenuo = (0.161 * r.volumenM3) / (r.superficieTotalM2 * b.alphaBar);
    assert.ok(b.rt60S! < rt60SabineIngenuo, `Eyring (${b.rt60S}) debería ser menor que Sabine ingenuo (${rt60SabineIngenuo})`);
    assert.ok(b.rt60S! > 0);
  }
});

test('UMBRAL_EYRING_ALPHA es 0,20 (criterio de literatura de acústica arquitectónica, no inventado)', () => {
  assert.equal(UMBRAL_EYRING_ALPHA, 0.2);
});

test('ALPHA_CAMPO_DIFUSO_MAX es 0,8 y es mayor que UMBRAL_EYRING_ALPHA — Eyring tiene una banda de validez real, no vacía, entre los dos', () => {
  assert.equal(ALPHA_CAMPO_DIFUSO_MAX, 0.8);
  assert.ok(ALPHA_CAMPO_DIFUSO_MAX > UMBRAL_EYRING_ALPHA);
});

test('techo (4 materiales) reusa exactamente los coeficientes de muro — misma superficie física, misma absorción sin importar orientación', () => {
  assert.deepEqual(ABSORCION_TECHO_BANDAS.hormigon, ABSORCION_MURO_BANDAS.hormigon);
  assert.deepEqual(ABSORCION_TECHO_BANDAS.madera, ABSORCION_MURO_BANDAS.madera);
  assert.deepEqual(ABSORCION_TECHO_BANDAS.yesoCarton, ABSORCION_MURO_BANDAS.yesoCarton);
  assert.deepEqual(ABSORCION_TECHO_BANDAS.panelAcustico, ABSORCION_MURO_BANDAS.panelAcustico);
});
