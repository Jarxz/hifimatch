// PURO — sin DOM. "Mis sistemas" guarda en localStorage; lo leído se trata como
// no confiable y un equipo fuera del catálogo curado no se guarda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';
import {
  CLAVE_ALMACEN,
  MAX_SISTEMAS,
  LARGO_MAX_NOMBRE,
  sanearNombre,
  validarConfiguracion,
  configDesdeEstado,
  leerSistemas,
  escribirSistemas,
  guardarSistema,
  eliminarSistema,
} from './sistemasGuardados.ts';
import type { AlmacenLike, EstadoGuardable } from './sistemasGuardados.ts';

class Almacen implements AlmacenLike {
  datos = new Map<string, string>();
  fallaAlEscribir = false;
  getItem(k: string): string | null {
    return this.datos.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    if (this.fallaAlEscribir) throw new Error('QuotaExceededError');
    this.datos.set(k, v);
  }
}

const ESTADO: EstadoGuardable = {
  spk: CATALOGO.parlantes.find((p) => !p.id.startsWith('generico'))!.id,
  amp: CATALOGO.amplificadores.find((a) => !a.id.startsWith('generico'))!.id,
  streamer: null,
  dac: null,
  W: 3.6,
  L: 5,
  H: 2.4,
  lvl: 'alto',
  genero: 'jazzvocal',
  muroFrontal: 'yesoCarton',
  muroPosterior: 'yesoCarton',
  muroIzquierdo: 'hormigon',
  muroDerecho: 'yesoCarton',
  piso: 'alfombra',
  techo: 'yesoCarton',
};

function configValida() {
  const r = configDesdeEstado(ESTADO);
  assert.ok(r.ok, 'el estado de prueba debe ser guardable');
  return r.config;
}

test('sanearNombre: espacios compactados, acotado y vacío → null', () => {
  assert.equal(sanearNombre('  Mi   sala \n  principal '), 'Mi sala principal');
  assert.equal(sanearNombre('   '), null);
  assert.equal(sanearNombre('x'.repeat(LARGO_MAX_NOMBRE + 40))!.length, LARGO_MAX_NOMBRE);
});

test('configDesdeEstado: sin parlante o amplificador → sin-equipos', () => {
  assert.deepEqual(configDesdeEstado({ ...ESTADO, spk: null }), { ok: false, codigo: 'sin-equipos' });
  assert.deepEqual(configDesdeEstado({ ...ESTADO, amp: null }), { ok: false, codigo: 'sin-equipos' });
});

test('configDesdeEstado: un equipo hallado en la web o ingresado a mano NO se guarda', () => {
  assert.deepEqual(configDesdeEstado({ ...ESTADO, spk: 'web:parlante:kef:nuevo' }), { ok: false, codigo: 'equipo-fuera-de-catalogo' });
  assert.deepEqual(configDesdeEstado({ ...ESTADO, amp: 'manual:amplificador:x:y' }), { ok: false, codigo: 'equipo-fuera-de-catalogo' });
  assert.deepEqual(configDesdeEstado({ ...ESTADO, streamer: 'web:fuente:a:b' }), { ok: false, codigo: 'equipo-fuera-de-catalogo' });
});

test('validarConfiguracion: acepta la configuración de prueba y sus streamer/dac reales', () => {
  assert.ok(validarConfiguracion({ ...ESTADO }));
  const conFuentes = { ...ESTADO, streamer: CATALOGO.streamers[0]!.id, dac: CATALOGO.dacs[0]!.id };
  const c = validarConfiguracion(conFuentes);
  assert.equal(c?.streamer, CATALOGO.streamers[0]!.id);
  assert.equal(c?.dac, CATALOGO.dacs[0]!.id);
});

test('validarConfiguracion: rechaza cada campo inválido, sin "repararlo" con un valor por defecto', () => {
  const malos: Record<string, unknown>[] = [
    { spk: 'no-existe' },
    { amp: CATALOGO.parlantes[0]!.id }, // id de otra categoría
    { streamer: CATALOGO.dacs[0]!.id }, // un DAC no es un streamer
    { dac: 'no-existe' },
    { W: 10 }, // fuera de los límites de la sala
    { L: Number.NaN },
    { H: '2.4' },
    { lvl: 'fuerte' },
    { genero: 'trap' },
    { muroFrontal: 'marmol' },
    { piso: 'pasto' },
    { techo: 'vidrio' }, // vidrio existe para muros, no para techo
  ];
  for (const parche of malos) assert.equal(validarConfiguracion({ ...ESTADO, ...parche }), null, JSON.stringify(parche));
  assert.equal(validarConfiguracion(null), null);
  assert.equal(validarConfiguracion('texto'), null);
});

test('guardar y volver a leer: ida y vuelta exacta, más reciente primero', () => {
  const alm = new Almacen();
  const config = configValida();
  const a = guardarSistema(alm, [], 'Primero', config, 1000, 'id-a');
  assert.ok(a.ok);
  const b = guardarSistema(alm, a.sistemas, 'Segundo', { ...config, lvl: 'ref' }, 2000, 'id-b');
  assert.ok(b.ok);
  const leidos = leerSistemas(alm);
  assert.deepEqual(leidos.map((s) => s.id), ['id-b', 'id-a']);
  assert.equal(leidos[0]!.config.lvl, 'ref');
  assert.equal(leidos[1]!.nombre, 'Primero');
  assert.equal(leidos[1]!.guardadoEn, 1000);
});

test('guardar: nombre vacío → nombre-vacio y no escribe nada', () => {
  const alm = new Almacen();
  assert.deepEqual(guardarSistema(alm, [], '   ', configValida(), 1, 'x'), { ok: false, codigo: 'nombre-vacio' });
  assert.equal(alm.getItem(CLAVE_ALMACEN), null);
});

test('guardar: el almacenamiento bloqueado o lleno se declara, no se finge que se guardó', () => {
  const alm = new Almacen();
  alm.fallaAlEscribir = true;
  assert.deepEqual(guardarSistema(alm, [], 'Sala', configValida(), 1, 'x'), { ok: false, codigo: 'almacen-bloqueado' });
  assert.deepEqual(guardarSistema(null, [], 'Sala', configValida(), 1, 'x'), { ok: false, codigo: 'almacen-bloqueado' });
});

test(`guardar: pasado el tope de ${MAX_SISTEMAS} pide eliminar uno, nunca borra otro en silencio`, () => {
  const alm = new Almacen();
  const config = configValida();
  let lista = [] as ReturnType<typeof leerSistemas>;
  for (let i = 0; i < MAX_SISTEMAS; i++) {
    const r = guardarSistema(alm, lista, `S${i}`, config, i, `id-${i}`);
    assert.ok(r.ok);
    lista = r.sistemas;
  }
  assert.deepEqual(guardarSistema(alm, lista, 'Uno más', config, 999, 'id-extra'), { ok: false, codigo: 'limite-alcanzado' });
  assert.equal(leerSistemas(alm).length, MAX_SISTEMAS);
});

test('eliminar: quita sólo el id pedido y persiste', () => {
  const alm = new Almacen();
  const config = configValida();
  const a = guardarSistema(alm, [], 'A', config, 1, 'a');
  assert.ok(a.ok);
  const b = guardarSistema(alm, a.sistemas, 'B', config, 2, 'b');
  assert.ok(b.ok);
  const r = eliminarSistema(alm, b.sistemas, 'a');
  assert.ok(r.ok);
  assert.deepEqual(leerSistemas(alm).map((s) => s.id), ['b']);
  alm.fallaAlEscribir = true;
  assert.deepEqual(eliminarSistema(alm, r.sistemas, 'b'), { ok: false, codigo: 'almacen-bloqueado' });
});

test('leerSistemas: contenido corrupto o de otra versión → lista vacía, sin excepción', () => {
  const alm = new Almacen();
  assert.deepEqual(leerSistemas(alm), []);
  alm.datos.set(CLAVE_ALMACEN, '{no es json');
  assert.deepEqual(leerSistemas(alm), []);
  alm.datos.set(CLAVE_ALMACEN, JSON.stringify({ version: 99, sistemas: [] }));
  assert.deepEqual(leerSistemas(alm), []);
  alm.datos.set(CLAVE_ALMACEN, JSON.stringify([1, 2, 3]));
  assert.deepEqual(leerSistemas(alm), []);
  assert.deepEqual(leerSistemas(null), []);
});

test('leerSistemas: descarta entradas inválidas o repetidas y conserva las buenas', () => {
  const alm = new Almacen();
  const config = configValida();
  const buena = { id: 'ok', nombre: 'Buena', guardadoEn: 5, config };
  alm.datos.set(
    CLAVE_ALMACEN,
    JSON.stringify({
      version: 1,
      sistemas: [
        buena,
        { ...buena }, // id repetido
        { id: 'sin-nombre', nombre: '  ', guardadoEn: 1, config },
        { id: 'fecha-mala', nombre: 'X', guardadoEn: 'ayer', config },
        { id: 'equipo-borrado', nombre: 'Y', guardadoEn: 1, config: { ...config, spk: 'ya-no-existe' } },
        null,
        'basura',
      ],
    })
  );
  assert.deepEqual(leerSistemas(alm).map((s) => s.id), ['ok']);
});

test('escribirSistemas devuelve false si el navegador rechaza la escritura', () => {
  const alm = new Almacen();
  alm.fallaAlEscribir = true;
  assert.equal(escribirSistemas(alm, []), false);
});
