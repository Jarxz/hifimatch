/**
 * Smoke test del Paso 3: sólo prueba que Vite resuelve los imports .ts de
 * packages/engine y packages/data a través del alias, que el build genera
 * un index.html autocontenido, y que ese archivo abre por doble clic. La
 * UI real (Paso 4) reemplaza esto entero — no es la app, es la prueba de
 * que el cableado funciona antes de portar 800 líneas sobre él.
 */
import { evaluarPotencia } from '@engine/potencia.ts';
import type { Parlante, Amplificador } from '@engine/tipos.ts';
import { CATALOGO } from '@data/catalogo.ts';

const kef = CATALOGO.parlantes.find((p) => p.id === 'kef-ls50-meta');
const cxa81 = CATALOGO.amplificadores.find((a) => a.id === 'cambridge-cxa81');
if (!kef || !cxa81) throw new Error('smoke test: no se encontró el equipo esperado en el catálogo');

const parlante: Parlante = {
  id: kef.id,
  nombre: kef.nombre,
  tipo: kef.tipo.es,
  sensibilidadDb: {
    valor: kef.sensibilidadDb.valor,
    fuente: kef.sensibilidadDb.fuente.es,
    confianza: kef.sensibilidadDb.confianza,
  },
  impedanciaNominalOhm: kef.impedanciaNominalOhm,
  impedanciaMinOhm: kef.impedanciaMinOhm,
  potenciaRecMinW: kef.potenciaRecMinW,
  potenciaRecMaxW: kef.potenciaRecMaxW,
};

const amplificador: Amplificador = {
  id: cxa81.id,
  nombre: cxa81.nombre,
  tipo: cxa81.tipo.es,
  potencia8OhmW: {
    valor: cxa81.potencia8OhmW.valor,
    fuente: cxa81.potencia8OhmW.fuente.es,
    confianza: cxa81.potencia8OhmW.confianza,
  },
  potencia4OhmW: cxa81.potencia4OhmW
    ? {
        valor: cxa81.potencia4OhmW.valor,
        fuente: cxa81.potencia4OhmW.fuente.es,
        confianza: cxa81.potencia4OhmW.confianza,
      }
    : null,
  cargaMinOhm: cxa81.cargaMinOhm,
  sensEntradaMv: cxa81.sensEntradaMv,
  impedanciaEntradaOhm: cxa81.impedanciaEntradaOhm,
};

const resultado = evaluarPotencia(parlante, amplificador, 2.5, 'alto');

const app = document.getElementById('app');
if (app) {
  app.textContent =
    `${parlante.nombre} + ${amplificador.nombre} a 2,5 m, nivel alto: ` +
    `margen ${resultado.margenDb.toFixed(2)} dB — ${resultado.etiqueta}`;
}
