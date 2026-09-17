import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registrarEquipo, buscarEnRegistro, vaciarRegistro } from './registroEquipos.ts';
import { EQUIPO_WEB_PREFIJO, construirParlanteWeb } from '../../../../packages/buscador/src/buscador.ts';
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';

const TODOS_LOS_EQUIPOS = [...CATALOGO.parlantes, ...CATALOGO.amplificadores, ...CATALOGO.streamers, ...CATALOGO.dacs, ...CATALOGO.cables];

test('invariante: ningún id de CATALOGO empieza con el prefijo reservado de equipos web/manuales', () => {
  for (const eq of TODOS_LOS_EQUIPOS) {
    assert.ok(!eq.id.startsWith(EQUIPO_WEB_PREFIJO), `id de catálogo real colisiona con el prefijo reservado: ${eq.id}`);
  }
  assert.ok(TODOS_LOS_EQUIPOS.length > 0, 'sanity check: el catálogo no está vacío');
});

test('registrarEquipo + buscarEnRegistro: guarda y recupera por id', () => {
  vaciarRegistro();
  const p = construirParlanteWeb('Focal', 'Aria 906', { sensibilidadDb: 89, impedanciaNominalOhm: 8, impedanciaMinOhm: 4.5, potenciaRecMinW: 25, potenciaRecMaxW: 150 }, 'https://focal.com');
  registrarEquipo(p);
  assert.deepEqual(buscarEnRegistro(p.id), p);
});

test('buscarEnRegistro: id no registrado devuelve null, nunca lanza', () => {
  vaciarRegistro();
  assert.equal(buscarEnRegistro('web:parlante:no-existe'), null);
});

test('un id de CATALOGO real nunca aparece en el registro (categorías separadas)', () => {
  vaciarRegistro();
  const idsReales = new Set(CATALOGO.parlantes.map((p) => p.id));
  const primerIdReal = [...idsReales][0]!;
  assert.equal(buscarEnRegistro(primerIdReal), null, 'el registro no debe confundirse con el catálogo real');
});
