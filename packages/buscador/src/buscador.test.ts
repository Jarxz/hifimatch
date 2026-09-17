import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validarParlante,
  validarAmplificador,
  validarFuente,
  construirParlanteWeb,
  construirAmplificadorWeb,
  construirFuenteWeb,
  claveCache,
  manejarBusqueda,
  EQUIPO_WEB_PREFIJO,
  SENSIBILIDAD_MIN_DB,
  SENSIBILIDAD_MAX_DB,
  IMPEDANCIA_NOMINAL_MAX_OHM,
  POTENCIA_8OHM_MAX_W,
} from './buscador.ts';
import type { SpecsCrudasParlante, SpecsCrudasAmplificador, SpecsCrudasFuente, EquipoWeb, ResultadoProveedor, SolicitudBusqueda } from './buscador.ts';

function parlanteOk(overrides: Partial<SpecsCrudasParlante> = {}): SpecsCrudasParlante {
  return { sensibilidadDb: 88, impedanciaNominalOhm: 8, impedanciaMinOhm: 6, potenciaRecMinW: 20, potenciaRecMaxW: 120, ...overrides };
}
function ampOk(overrides: Partial<SpecsCrudasAmplificador> = {}): SpecsCrudasAmplificador {
  return { potencia8OhmW: 80, potencia4OhmW: 120, cargaMinOhm: 4, sensEntradaMv: 200, impedanciaEntradaOhm: 47000, ...overrides };
}

// ── Validación de parlante ──────────────────────────────────────────────
test('validarParlante: ok con specs completas dentro de rango', () => {
  assert.equal(validarParlante(parlanteOk()), 'ok');
});
test('validarParlante: sensibilidad faltante', () => {
  assert.equal(validarParlante(parlanteOk({ sensibilidadDb: null })), 'sensibilidad-faltante');
});
test('validarParlante: sensibilidad justo en el borde inferior/superior es válida', () => {
  assert.equal(validarParlante(parlanteOk({ sensibilidadDb: SENSIBILIDAD_MIN_DB })), 'ok');
  assert.equal(validarParlante(parlanteOk({ sensibilidadDb: SENSIBILIDAD_MAX_DB })), 'ok');
});
test('validarParlante: sensibilidad fuera de rango (200 dB, la "prueba de veneno")', () => {
  assert.equal(validarParlante(parlanteOk({ sensibilidadDb: 200 })), 'sensibilidad-fuera-de-rango');
});
test('validarParlante: impedancia nominal faltante', () => {
  assert.equal(validarParlante(parlanteOk({ impedanciaNominalOhm: null })), 'impedancia-nominal-faltante');
});
test('validarParlante: impedancia nominal fuera de rango', () => {
  assert.equal(validarParlante(parlanteOk({ impedanciaNominalOhm: IMPEDANCIA_NOMINAL_MAX_OHM + 1 })), 'impedancia-nominal-fuera-de-rango');
});
test('validarParlante: impedancia mínima null es aceptable (campo opcional)', () => {
  assert.equal(validarParlante(parlanteOk({ impedanciaMinOhm: null })), 'ok');
});
test('validarParlante: impedancia mínima presente pero fuera de rango', () => {
  assert.equal(validarParlante(parlanteOk({ impedanciaMinOhm: 50 })), 'impedancia-minima-fuera-de-rango');
});
test('validarParlante: potencia recomendada fuera de rango', () => {
  assert.equal(validarParlante(parlanteOk({ potenciaRecMaxW: 9999 })), 'potencia-recomendada-fuera-de-rango');
});

// ── Validación de amplificador ──────────────────────────────────────────
test('validarAmplificador: ok con specs completas', () => {
  assert.equal(validarAmplificador(ampOk()), 'ok');
});
test('validarAmplificador: potencia 8 ohm faltante', () => {
  assert.equal(validarAmplificador(ampOk({ potencia8OhmW: null })), 'potencia-8ohm-faltante');
});
test('validarAmplificador: potencia 8 ohm en el borde superior es válida', () => {
  assert.equal(validarAmplificador(ampOk({ potencia8OhmW: POTENCIA_8OHM_MAX_W })), 'ok');
});
test('validarAmplificador: potencia 8 ohm fuera de rango', () => {
  assert.equal(validarAmplificador(ampOk({ potencia8OhmW: 5000 })), 'potencia-8ohm-fuera-de-rango');
});
test('validarAmplificador: sólo potencia8OhmW es obligatoria — el resto null es válido', () => {
  assert.equal(validarAmplificador({ potencia8OhmW: 80, potencia4OhmW: null, cargaMinOhm: null, sensEntradaMv: null, impedanciaEntradaOhm: null }), 'ok');
});
test('validarAmplificador: impedancia de entrada fuera de rango', () => {
  assert.equal(validarAmplificador(ampOk({ impedanciaEntradaOhm: 1_000_000 })), 'impedancia-entrada-fuera-de-rango');
});

// ── Validación de fuente ─────────────────────────────────────────────────
test('validarFuente: ambos null es válido (el motor oculta la tarjeta sola)', () => {
  assert.equal(validarFuente({ salidaV: null, impedanciaSalidaOhm: null }), 'ok');
});
test('validarFuente: salida fuera de rango', () => {
  assert.equal(validarFuente({ salidaV: 999, impedanciaSalidaOhm: null }), 'salida-fuera-de-rango');
});
test('validarFuente: impedancia de salida fuera de rango', () => {
  assert.equal(validarFuente({ salidaV: 2, impedanciaSalidaOhm: 0 }), 'impedancia-salida-fuera-de-rango');
});

// ── Clave de caché — normalización ──────────────────────────────────────
test('claveCache: estable ante mayúsculas, acentos y espacios de más', () => {
  const a = claveCache('parlante', 'Wharfedale', 'Linton Heritage');
  const b = claveCache('parlante', '  wharfedale  ', 'linton   heritage');
  assert.equal(a, b);
});
test('claveCache: "Wharfdale" (error de tipeo, sin acento) es una clave DISTINTA de "Wharfedale" — la normalización no corrige errores de tipeo, sólo may/min/acentos/espacios', () => {
  const a = claveCache('parlante', 'Wharfedale', 'Linton');
  const b = claveCache('parlante', 'Wharfdale', 'Linton');
  assert.notEqual(a, b);
});
test('claveCache: distinta categoría, misma marca/modelo, no colisiona', () => {
  const a = claveCache('parlante', 'KEF', 'LS50');
  const b = claveCache('amplificador', 'KEF', 'LS50');
  assert.notEqual(a, b);
});

// ── Construcción de fichas ───────────────────────────────────────────────
test('construirParlanteWeb: id con prefijo reservado, confianza baja, nombre empieza con marca', () => {
  const p = construirParlanteWeb('Focal', 'Aria 906', parlanteOk(), 'https://focal.com/aria-906');
  assert.ok(p.id.startsWith(EQUIPO_WEB_PREFIJO), p.id);
  assert.equal(p.marca, 'Focal');
  assert.ok(p.nombre.startsWith('Focal'), p.nombre);
  assert.equal(p.sensibilidadDb.confianza, 'baja');
  assert.equal(p.sensibilidadConvencion, null, 'nunca se asume una convención que el proveedor no declaró');
  assert.deepEqual(p.fuentes, ['https://focal.com/aria-906']);
  assert.equal(p.tipo.es.includes('no curado'), true);
  assert.equal(p.tipo.en.includes('uncurated'), true);
});
test('construirParlanteWeb: lanza si se llama sin haber validado antes (contrato interno)', () => {
  assert.throws(() => construirParlanteWeb('X', 'Y', { sensibilidadDb: null, impedanciaNominalOhm: 8, impedanciaMinOhm: null, potenciaRecMinW: null, potenciaRecMaxW: null }, 'url'));
});
test('construirAmplificadorWeb: potencia4OhmW null cuando el proveedor no lo trajo', () => {
  const a = construirAmplificadorWeb('NAD', 'C 316BEE', ampOk({ potencia4OhmW: null }), 'https://example.com');
  assert.equal(a.potencia4OhmW, null);
  assert.equal(a.potencia8OhmW.confianza, 'baja');
});
test('construirFuenteWeb: streamer y dac usan textos distintos por categoría', () => {
  const streamer = construirFuenteWeb('streamer', 'WiiM', 'Pro Plus', { salidaV: 2, impedanciaSalidaOhm: 100 }, 'https://example.com');
  const dac = construirFuenteWeb('dac', 'Topping', 'D90', { salidaV: 2, impedanciaSalidaOhm: 50 }, 'https://example.com');
  assert.notEqual(streamer.tipo.es, dac.tipo.es);
  assert.equal(streamer.confianza, 'baja');
});

// ── Ficha manual: fuenteUrl=null, mismas funciones, cita distinta ───────
test('construirParlanteWeb con fuenteUrl=null (ficha manual): fuentes queda vacío y la cita declara "ingresado manualmente"', () => {
  const p = construirParlanteWeb('MiMarca', 'MiModelo', parlanteOk(), null);
  assert.deepEqual(p.fuentes, []);
  assert.ok(p.sensibilidadDb.fuente.es.includes('manualmente'), p.sensibilidadDb.fuente.es);
  assert.ok(p.sensibilidadDb.fuente.en.includes('Manually'), p.sensibilidadDb.fuente.en);
  assert.equal(p.sensibilidadDb.confianza, 'baja', 'una ficha manual sigue siendo confianza baja, igual que la web');
});
test('construirAmplificadorWeb con fuenteUrl=null: misma cita manual en potencia8OhmW', () => {
  const a = construirAmplificadorWeb('MiMarca', 'MiAmpli', ampOk(), null);
  assert.deepEqual(a.fuentes, []);
  assert.ok(a.potencia8OhmW.fuente.es.includes('manualmente'));
});
test('construirParlanteWeb: sanea caracteres de ruptura de HTML en marca/modelo (self-XSS reflejado vía el campo de búsqueda)', () => {
  const p = construirParlanteWeb('<img src=x onerror=alert(1)>', 'Modelo"</div>', parlanteOk(), null);
  assert.ok(!p.marca.includes('<'), p.marca);
  assert.ok(!p.marca.includes('>'), p.marca);
  assert.ok(!p.nombre.includes('"'), p.nombre);
  assert.ok(!p.descripcion.es.includes('<img'), p.descripcion.es);
});
test('construirParlanteWeb: con descripcionEs/En extraída, la usa en vez del texto genérico', () => {
  const p = construirParlanteWeb('KEF', 'Q150', parlanteOk(), 'https://kef.com');
  // sin descripción extraída (undefined): cae al texto genérico
  assert.ok(p.descripcion.es.includes('Datos obtenidos automáticamente'), p.descripcion.es);

  const specsConDescripcion = { ...parlanteOk(), descripcionEs: 'Monitor de 2 vías con tweeter de domo.', descripcionEn: '2-way monitor with a dome tweeter.' };
  const p2 = construirParlanteWeb('KEF', 'Q150', specsConDescripcion, 'https://kef.com');
  assert.ok(p2.descripcion.es.startsWith('Monitor de 2 vías con tweeter de domo.'), p2.descripcion.es);
  assert.ok(p2.descripcion.es.includes('No forma parte del catálogo curado'), p2.descripcion.es);
  assert.ok(p2.descripcion.en.startsWith('2-way monitor with a dome tweeter.'), p2.descripcion.en);
});
test('construirParlanteWeb: sanea caracteres de ruptura de HTML en la descripción extraída (mismo riesgo que marca/modelo, esta vez viene del proveedor, no del usuario)', () => {
  const specs = { ...parlanteOk(), descripcionEs: 'Texto <script>alert(1)</script> normal.', descripcionEn: null };
  const p = construirParlanteWeb('X', 'Y', specs, 'https://x.com');
  assert.ok(!p.descripcion.es.includes('<script>'), p.descripcion.es);
});
test('construirParlanteWeb: la cita cambia según haya o no URL, pero el resto de la ficha es idéntico', () => {
  const specs = parlanteOk();
  const conUrl = construirParlanteWeb('X', 'Y', specs, 'https://x.com');
  const sinUrl = construirParlanteWeb('X', 'Y', specs, null);
  assert.notEqual(conUrl.sensibilidadDb.fuente.es, sinUrl.sensibilidadDb.fuente.es);
  assert.equal(conUrl.sensibilidadDb.valor, sinUrl.sensibilidadDb.valor);
  assert.equal(conUrl.id, sinUrl.id, 'el id depende de marca/modelo, no del origen');
});

// ── Orquestación: manejarBusqueda con caché + proveedor inyectados ──────
function cacheFake() {
  const almacen = new Map<string, EquipoWeb>();
  return {
    cache: {
      get: async (clave: string) => almacen.get(clave) ?? null,
      set: async (clave: string, equipo: EquipoWeb) => {
        almacen.set(clave, equipo);
      },
    },
    almacen,
  };
}

test('manejarBusqueda: caso feliz — proveedor da specs válidas, se cachea, cacheado:false la primera vez', async () => {
  const { cache, almacen } = cacheFake();
  let llamadasProveedor = 0;
  const buscarEnProveedor = async (): Promise<ResultadoProveedor> => {
    llamadasProveedor++;
    return { ok: true, specs: parlanteOk(), fuenteUrl: 'https://focal.com/aria-906' };
  };
  const solicitud: SolicitudBusqueda = { categoria: 'parlante', marca: 'Focal', modelo: 'Aria 906' };
  const r = await manejarBusqueda(solicitud, { cache, buscarEnProveedor });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.cacheado, false);
    assert.ok(r.equipo.id.startsWith(EQUIPO_WEB_PREFIJO));
  }
  assert.equal(llamadasProveedor, 1);
  assert.equal(almacen.size, 1);
});

test('manejarBusqueda: segunda consulta idéntica pega en caché, el proveedor NO se llama de nuevo', async () => {
  const { cache } = cacheFake();
  let llamadasProveedor = 0;
  const buscarEnProveedor = async (): Promise<ResultadoProveedor> => {
    llamadasProveedor++;
    return { ok: true, specs: parlanteOk(), fuenteUrl: 'https://focal.com/aria-906' };
  };
  const solicitud: SolicitudBusqueda = { categoria: 'parlante', marca: 'Focal', modelo: 'Aria 906' };
  await manejarBusqueda(solicitud, { cache, buscarEnProveedor });
  const r2 = await manejarBusqueda(solicitud, { cache, buscarEnProveedor });
  assert.equal(r2.ok, true);
  if (r2.ok) assert.equal(r2.cacheado, true);
  assert.equal(llamadasProveedor, 1, 'la segunda consulta no debería tocar al proveedor');
});

test('manejarBusqueda: el proveedor falla → codigo:"proveedor-error", nada se cachea', async () => {
  const { cache, almacen } = cacheFake();
  const buscarEnProveedor = async (): Promise<ResultadoProveedor> => ({ ok: false, codigo: 'proveedor-error' });
  const r = await manejarBusqueda({ categoria: 'parlante', marca: 'X', modelo: 'Y' }, { cache, buscarEnProveedor });
  assert.deepEqual(r, { ok: false, codigo: 'proveedor-error' });
  assert.equal(almacen.size, 0);
});

test('manejarBusqueda: el proveedor no encuentra nada → codigo:"sin-resultado"', async () => {
  const { cache } = cacheFake();
  const buscarEnProveedor = async (): Promise<ResultadoProveedor> => ({ ok: false, codigo: 'sin-resultado' });
  const r = await manejarBusqueda({ categoria: 'parlante', marca: 'X', modelo: 'Y' }, { cache, buscarEnProveedor });
  assert.deepEqual(r, { ok: false, codigo: 'sin-resultado' });
});

test('manejarBusqueda: el cupo (IP o global, decidido por el adaptador) está agotado → codigo:"cupo-agotado" pasa tal cual, sin cachear nada', async () => {
  const { cache, almacen } = cacheFake();
  const buscarEnProveedor = async (): Promise<ResultadoProveedor> => ({ ok: false, codigo: 'cupo-agotado' });
  const r = await manejarBusqueda({ categoria: 'parlante', marca: 'X', modelo: 'Y' }, { cache, buscarEnProveedor });
  assert.deepEqual(r, { ok: false, codigo: 'cupo-agotado' });
  assert.equal(almacen.size, 0);
});

test('manejarBusqueda: specs fuera de rango ("prueba de veneno" end-to-end) → codigo:"datos-insuficientes", NUNCA se cachea ni se construye la ficha', async () => {
  const { cache, almacen } = cacheFake();
  const buscarEnProveedor = async (): Promise<ResultadoProveedor> => ({
    ok: true,
    specs: parlanteOk({ sensibilidadDb: 200 }), // el veneno: imposible físicamente
    fuenteUrl: 'https://example.com',
  });
  const r = await manejarBusqueda({ categoria: 'parlante', marca: 'X', modelo: 'Y' }, { cache, buscarEnProveedor });
  assert.deepEqual(r, { ok: false, codigo: 'datos-insuficientes' });
  assert.equal(almacen.size, 0, 'un dato fuera de rango nunca debe llegar a la caché');
});

test('manejarBusqueda: amplificador sin el dato obligatorio (potencia8OhmW null) → datos-insuficientes', async () => {
  const { cache } = cacheFake();
  const buscarEnProveedor = async (): Promise<ResultadoProveedor> => ({
    ok: true,
    specs: ampOk({ potencia8OhmW: null }),
    fuenteUrl: 'https://example.com',
  });
  const r = await manejarBusqueda({ categoria: 'amplificador', marca: 'X', modelo: 'Y' }, { cache, buscarEnProveedor });
  assert.deepEqual(r, { ok: false, codigo: 'datos-insuficientes' });
});

test('manejarBusqueda: fuente (streamer) con ambos campos null es válida — el motor la oculta sola', async () => {
  const { cache } = cacheFake();
  const buscarEnProveedor = async (): Promise<ResultadoProveedor> => ({
    ok: true,
    specs: { salidaV: null, impedanciaSalidaOhm: null } as SpecsCrudasFuente,
    fuenteUrl: 'https://example.com',
  });
  const r = await manejarBusqueda({ categoria: 'streamer', marca: 'Sonos', modelo: 'Port' }, { cache, buscarEnProveedor });
  assert.equal(r.ok, true);
});

test('manejarBusqueda: marca/modelo con espacios de más se recortan antes de construir la ficha', async () => {
  const { cache } = cacheFake();
  const buscarEnProveedor = async (): Promise<ResultadoProveedor> => ({ ok: true, specs: parlanteOk(), fuenteUrl: 'https://example.com' });
  const r = await manejarBusqueda({ categoria: 'parlante', marca: '  Focal  ', modelo: '  Aria 906  ' }, { cache, buscarEnProveedor });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.equipo.nombre, 'Focal Aria 906');
});
