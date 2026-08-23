/**
 * Traduce el catálogo (packages/data, bilingüe, con DatoCitado<T>) al tipo
 * que espera el motor (packages/engine/src/tipos.ts, un solo idioma por
 * llamada). Única capa de traducción — no duplica ningún cálculo, sólo
 * reempaqueta datos y elige el idioma activo para los campos `fuente`.
 *
 * Corrige un bug real que tenía prototipo-frontend.html: ahí,
 * potencia8OhmW.fuente quedaba poblado con `amp.spec` (un resumen de specs,
 * ej. "80 W / 8 Ω · 120 W / 4 Ω"), no con una cita de fuente. Acá sale de
 * DatoCitado.fuente, que sí es una cita ("Cambridge Audio (ficha oficial)").
 */
import type { Parlante, Amplificador, Fuente } from '../../../../packages/engine/src/tipos.ts';
import type { ParlanteCat, AmplificadorCat, FuenteCat } from '../../../../packages/data/src/tipos-catalogo.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';

export function parlanteDelCatalogo(p: ParlanteCat, idioma: Idioma): Parlante {
  return {
    id: p.id,
    nombre: p.nombre,
    tipo: p.tipo[idioma],
    sensibilidadDb: {
      valor: p.sensibilidadDb.valor,
      fuente: p.sensibilidadDb.fuente[idioma],
      confianza: p.sensibilidadDb.confianza,
    },
    sensibilidadConvencion: p.sensibilidadConvencion,
    impedanciaNominalOhm: p.impedanciaNominalOhm,
    impedanciaMinOhm: p.impedanciaMinOhm,
    impedanciaMaxOhm: p.impedanciaMaxOhm,
    anguloFaseGrados: p.anguloFaseGrados,
    potenciaRecMinW: p.potenciaRecMinW,
    potenciaRecMaxW: p.potenciaRecMaxW,
  };
}

export function amplificadorDelCatalogo(a: AmplificadorCat, idioma: Idioma): Amplificador {
  return {
    id: a.id,
    nombre: a.nombre,
    tipo: a.tipo[idioma],
    potencia8OhmW: {
      valor: a.potencia8OhmW.valor,
      fuente: a.potencia8OhmW.fuente[idioma],
      confianza: a.potencia8OhmW.confianza,
    },
    potencia4OhmW: a.potencia4OhmW
      ? {
          valor: a.potencia4OhmW.valor,
          fuente: a.potencia4OhmW.fuente[idioma],
          confianza: a.potencia4OhmW.confianza,
        }
      : null,
    cargaMinOhm: a.cargaMinOhm,
    sensEntradaMv: a.sensEntradaMv,
    impedanciaEntradaOhm: a.impedanciaEntradaOhm,
    factorAmortiguamiento: a.factorAmortiguamiento,
  };
}

export function fuenteDelCatalogo(f: FuenteCat, idioma: Idioma): Fuente {
  return {
    id: f.id,
    nombre: f.nombre,
    tipo: f.tipo[idioma],
    salidaV: f.salidaV,
    impedanciaSalidaOhm: f.impedanciaSalidaOhm,
    fuente: f.fuente[idioma],
    confianza: f.confianza,
  };
}
