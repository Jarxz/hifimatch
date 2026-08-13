/**
 * Traduce los resultados del motor a texto de pantalla — PURO: recibe
 * datos del catálogo + el resultado ya calculado por el motor + el idioma
 * activo, devuelve strings (algunos HTML, con <b>) listos para que
 * pintar.ts los asigne al DOM. Nada acá importa `document`; por eso es
 * testeable con `node --test` sin levantar nada, igual que el motor.
 *
 * Paso 6: cada función recibe `idioma` y arma su texto vía
 * `textosDe(idioma)` (idioma/es.ts, idioma/en.ts) — el diccionario nunca
 * formatea números, sólo redacta; los parámetros que le pasamos ya vienen
 * formateados por formato/numeros.ts según ese mismo idioma.
 */
import type { ResultadoPotencia } from '../../../../packages/engine/src/potencia.ts';
import type { ResultadoCarga } from '../../../../packages/engine/src/carga.ts';
import type { ResultadoPuenteImpedancias, ResultadoRecorridoVolumen } from '../../../../packages/engine/src/ganancia.ts';
import { RATIO_BRIDGING_OK, UMBRAL_RECORRIDO } from '../../../../packages/engine/src/ganancia.ts';
import type { ResultadoModos } from '../../../../packages/engine/src/modos.ts';
import { TECHO_AGRUPAMIENTO_HZ, UMBRAL_AGRUPAMIENTO } from '../../../../packages/engine/src/modos.ts';
import type { ParlanteCat, AmplificadorCat, FuenteCat } from '../../../../packages/data/src/tipos-catalogo.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { num, numConSigno } from '../formato/numeros.ts';
import { textosDe } from '../idioma/idioma.ts';

export type ClaseVerdicto = 'ok' | 'warn' | 'alert' | 'dim';

export interface ModeloTarjetaPotencia {
  verdictoClase: ClaseVerdicto;
  verdictoTexto: string;
  margenDb: number;
  textoHtml: string;
  calcHtml: string;
  avisoHtml: string | null;
  fuenteHtml: string;
}

export function modeloPotencia(
  spk: ParlanteCat,
  amp: AmplificadorCat,
  r: ResultadoPotencia,
  distM: number,
  nivelTexto: string,
  picoObjetivoDb: number,
  idioma: Idioma
): ModeloTarjetaPotencia {
  const t = textosDe(idioma);
  const nivelMinuscula = nivelTexto.toLowerCase();
  const margenDb = num(r.margenDb, 1, idioma);
  const distFmt = num(distM, 1, idioma);

  let textoHtml: string;
  if (r.severidad === 'ok') {
    textoHtml = t.motor.potencia.conMargen({ amp: amp.nombre, nivel: nivelMinuscula, margenDb, distM: distFmt });
  } else if (r.severidad === 'warn') {
    textoHtml = t.motor.potencia.justoTexto({ nivel: nivelMinuscula, margenDb });
  } else {
    textoHtml = t.motor.potencia.insuficienteTexto({
      margenAbsDb: num(Math.abs(r.margenDb), 1, idioma),
      nivel: nivelMinuscula,
      distM: distFmt,
    });
  }

  const calcHtml = t.motor.potencia.calc({
    sens: num(spk.sensibilidadDb.valor, 0, idioma),
    distM: distFmt,
    p8: num(amp.potencia8OhmW.valor, 0, idioma),
    splDb: num(r.splDisponibleDb, 1, idioma),
    nivel: nivelMinuscula,
    picoDb: num(picoObjetivoDb, 0, idioma),
    margenSigno: numConSigno(r.margenDb, 1, idioma),
  });

  const avisoHtml =
    r.avisos.length > 0
      ? t.motor.potencia.avisoRecMin({
          recomendadaW: num(r.avisos[0]!.recomendadaW, 0, idioma),
          entregadaW: num(r.avisos[0]!.entregadaW, 0, idioma),
        })
      : null;

  const fuenteHtml = t.motor.potencia.fuente({
    sensFuente: spk.sensibilidadDb.fuente[idioma],
    sensNota: spk.sensibilidadDb.nota ? ` — ${spk.sensibilidadDb.nota[idioma]}` : '',
    sensConf: t.catalogo.confianza[spk.sensibilidadDb.confianza],
    potFuente: amp.potencia8OhmW.fuente[idioma],
    potConf: t.catalogo.confianza[amp.potencia8OhmW.confianza],
  });

  return {
    verdictoClase: r.severidad,
    verdictoTexto: t.motor.potencia.verdicto[r.codigo],
    margenDb: r.margenDb,
    textoHtml,
    calcHtml,
    avisoHtml,
    fuenteHtml,
  };
}

export interface ModeloTarjetaCarga {
  sinDatos: boolean;
  verdictoClase: ClaseVerdicto;
  verdictoTexto: string;
  textoHtml: string;
  avisoHtml: string | null;
  avisoEsSinDatos: boolean;
  fuenteHtml: string;
}

export function modeloCarga(spk: ParlanteCat, amp: AmplificadorCat, r: ResultadoCarga, idioma: Idioma): ModeloTarjetaCarga {
  const t = textosDe(idioma);

  if (r.severidad === 'sin-datos') {
    return {
      sinDatos: true,
      verdictoClase: 'dim',
      verdictoTexto: t.motor.carga.verdicto[r.codigo],
      textoHtml: t.motor.carga.sinDatosTexto,
      avisoHtml: t.motor.carga.sinDatosAviso,
      avisoEsSinDatos: true,
      fuenteHtml: t.motor.carga.sinDatosFuente({ nomZ: num(spk.impedanciaNominalOhm, 0, idioma) }),
    };
  }

  const minZ = spk.impedanciaMinOhm as number; // no null: severidad !== 'sin-datos'
  const minZFmt = num(minZ, 1, idioma);
  let textoHtml: string;
  let avisoHtml: string | null;

  if (r.severidad === 'warn') {
    textoHtml = t.motor.carga.warnTexto({ minZ: minZFmt });
    avisoHtml = t.motor.carga.warnAviso;
  } else if (r.dura && r.reserva) {
    textoHtml = t.motor.carga.duroPrefix({ minZ: minZFmt }) + t.motor.carga.duroClauseConReserva;
    avisoHtml = null;
  } else if (r.dura) {
    const clausula =
      amp.potencia4OhmW !== null
        ? t.motor.carga.duroClauseConDatoP4({ ratio: num(amp.potencia4OhmW.valor / amp.potencia8OhmW.valor, 1, idioma) })
        : t.motor.carga.duroClauseSinDatoP4;
    textoHtml = t.motor.carga.duroPrefix({ minZ: minZFmt }) + clausula;
    avisoHtml = null;
  } else {
    textoHtml = t.motor.carga.benignaTexto;
    avisoHtml = null;
  }

  return {
    sinDatos: false,
    verdictoClase: r.severidad,
    verdictoTexto: t.motor.carga.verdicto[r.codigo],
    textoHtml,
    avisoHtml,
    avisoEsSinDatos: false,
    fuenteHtml: t.motor.carga.fuente({ nomZ: num(spk.impedanciaNominalOhm, 0, idioma), minZ: minZFmt }),
  };
}

export interface ModeloTarjetaPuente {
  sinDatos: boolean;
  verdictoClase: ClaseVerdicto;
  verdictoTexto: string;
  textoHtml: string;
  calcHtml: string;
  avisoHtml: string | null;
  avisoEsSinDatos: boolean;
  fuenteHtml: string;
}

export function modeloPuente(
  fuente: FuenteCat,
  amp: AmplificadorCat,
  r: ResultadoPuenteImpedancias,
  idioma: Idioma
): ModeloTarjetaPuente {
  const t = textosDe(idioma);

  if (r.severidad === 'sin-datos') {
    return {
      sinDatos: true,
      verdictoClase: 'dim',
      verdictoTexto: t.motor.puente.verdicto[r.codigo],
      textoHtml: t.motor.puente.sinDatosTexto({ fuente: fuente.nombre, amp: amp.nombre }),
      calcHtml: '',
      avisoHtml: t.motor.puente.sinDatosAviso,
      avisoEsSinDatos: true,
      fuenteHtml: '',
    };
  }

  const ratioZ = r.ratioZ as number;
  const ratioFmt = num(ratioZ, 1, idioma);
  const calcHtml = t.motor.puente.calc({
    amp: amp.nombre,
    fuente: fuente.nombre,
    inZ: num(amp.impedanciaEntradaOhm ?? 0, 0, idioma),
    outZ: num(fuente.impedanciaSalidaOhm ?? 0, 0, idioma),
    ratio: ratioFmt,
  });

  let textoHtml: string;
  let avisoHtml: string | null;
  if (r.severidad === 'ok') {
    textoHtml = t.motor.puente.okTexto({ ratio: ratioFmt, umbral: RATIO_BRIDGING_OK });
    avisoHtml = null;
  } else if (r.severidad === 'warn') {
    textoHtml = t.motor.puente.warnTexto({ ratio: ratioFmt, umbral: RATIO_BRIDGING_OK });
    avisoHtml = t.motor.puente.warnAviso;
  } else {
    textoHtml = t.motor.puente.alertTexto({ ratio: num(ratioZ, 2, idioma) });
    avisoHtml = t.motor.puente.alertAviso;
  }

  return {
    sinDatos: false,
    verdictoClase: r.severidad,
    verdictoTexto: t.motor.puente.verdicto[r.codigo],
    textoHtml,
    calcHtml,
    avisoHtml,
    avisoEsSinDatos: false,
    fuenteHtml: t.motor.puente.fuente({ umbral: RATIO_BRIDGING_OK, confianza: t.catalogo.confianza[fuente.confianza] }),
  };
}

export interface ModeloTarjetaRecorrido {
  sinDatos: boolean;
  verdictoClase: ClaseVerdicto;
  verdictoTexto: string;
  textoHtml: string;
  calcHtml: string;
  avisoHtml: string | null;
  avisoEsSinDatos: boolean;
  fuenteHtml: string;
}

export function modeloRecorrido(
  fuente: FuenteCat,
  amp: AmplificadorCat,
  r: ResultadoRecorridoVolumen,
  idioma: Idioma
): ModeloTarjetaRecorrido {
  const t = textosDe(idioma);

  if (r.severidad === 'sin-datos') {
    return {
      sinDatos: true,
      verdictoClase: 'dim',
      verdictoTexto: t.motor.recorrido.verdicto[r.codigo],
      textoHtml: t.motor.recorrido.sinDatosTexto({ fuente: fuente.nombre, amp: amp.nombre }),
      calcHtml: '',
      avisoHtml: t.motor.recorrido.sinDatosAviso,
      avisoEsSinDatos: true,
      fuenteHtml: '',
    };
  }

  const margenV = r.margenV as number;
  const sensEntradaV = (amp.sensEntradaMv ?? 0) / 1000;
  const calcHtml = t.motor.recorrido.calc({
    fuente: fuente.nombre,
    amp: amp.nombre,
    salidaV: num(fuente.salidaV ?? 0, 2, idioma),
    sensV: num(sensEntradaV, 2, idioma),
    margen: num(margenV, 1, idioma),
  });

  let textoHtml: string;
  let avisoHtml: string | null;
  if (r.severidad === 'ok') {
    textoHtml = t.motor.recorrido.okTexto({ margen: num(margenV, 1, idioma) });
    avisoHtml = null;
  } else if (r.severidad === 'warn') {
    textoHtml = t.motor.recorrido.warnTexto({ margen: num(margenV, 1, idioma) });
    avisoHtml = null;
  } else {
    textoHtml = t.motor.recorrido.alertTexto({ margen: num(margenV, 2, idioma) });
    avisoHtml = t.motor.recorrido.alertAviso;
  }

  return {
    sinDatos: false,
    verdictoClase: r.severidad,
    verdictoTexto: t.motor.recorrido.verdicto[r.codigo],
    textoHtml,
    calcHtml,
    avisoHtml,
    avisoEsSinDatos: false,
    fuenteHtml: t.motor.recorrido.fuente({ umbral: UMBRAL_RECORRIDO, confianza: t.catalogo.confianza[fuente.confianza] }),
  };
}

export interface ModeloTarjetaModos {
  verdictoClase: ClaseVerdicto; // 'ok' | 'warn' — nunca 'alert'/'dim': ver CLAUDE.md, techo de severidad de sala
  verdictoTexto: string;
  textoHtml: string;
  listaHtml: string;
  avisoHtml: string | null;
  fuenteHtml: string;
}

export function modeloModos(r: ResultadoModos, idioma: Idioma): ModeloTarjetaModos {
  const t = textosDe(idioma);
  const eje = t.motor.modos.eje;

  const techoFmt = String(TECHO_AGRUPAMIENTO_HZ);

  const listaHtml = r.modos
    .map((m) => t.motor.modos.filaModo({ eje: eje[m.eje], orden: String(m.orden), frecuencia: num(m.frecuenciaHz, 1, idioma) }))
    .join('<br>');

  const textoHtml =
    r.severidad === 'ok'
      ? t.motor.modos.textoOk({ techo: techoFmt })
      : t.motor.modos.textoWarn({ n: String(r.agrupados.length), techo: techoFmt });

  const avisoHtml =
    r.agrupados.length > 0
      ? r.agrupados
          .map((a) =>
            t.motor.modos.parAgrupado({
              a: `${eje[a.modoA.eje]} · ${a.modoA.orden}`,
              b: `${eje[a.modoB.eje]} · ${a.modoB.orden}`,
              frecuenciaA: num(a.modoA.frecuenciaHz, 1, idioma),
              frecuenciaB: num(a.modoB.frecuenciaHz, 1, idioma),
            })
          )
          .join('<br>')
      : null;

  return {
    verdictoClase: r.severidad,
    verdictoTexto: t.motor.modos.verdicto[r.codigo],
    textoHtml,
    listaHtml,
    avisoHtml,
    fuenteHtml: t.motor.modos.fuente({ techo: techoFmt, umbral: String(Math.round(UMBRAL_AGRUPAMIENTO * 100)) }),
  };
}
