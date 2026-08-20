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
import type { Genero } from '../../../../packages/engine/src/genero.ts';
import { nivelPromedioEstimadoDb, CREST_FACTOR_DB } from '../../../../packages/engine/src/genero.ts';
import type { ResultadoCarga } from '../../../../packages/engine/src/carga.ts';
import type { ResultadoPuenteImpedancias, ResultadoRecorridoVolumen } from '../../../../packages/engine/src/ganancia.ts';
import { RATIO_BRIDGING_OK, UMBRAL_RECORRIDO } from '../../../../packages/engine/src/ganancia.ts';
import type { ResultadoModos, ModoAgrupado, ResultadoNuloEscucha } from '../../../../packages/engine/src/modos.ts';
import { TECHO_AGRUPAMIENTO_HZ, UMBRAL_AGRUPAMIENTO, VENTANA_NULO_MODAL } from '../../../../packages/engine/src/modos.ts';
import type { ResultadoReverberacion, Materiales, MaterialMuro, MaterialPiso, MaterialTecho } from '../../../../packages/engine/src/reverberacion.ts';
import { ABSORCION_MURO_BANDAS, ABSORCION_PISO_BANDAS, ABSORCION_TECHO_BANDAS, RT60_MIN_OK_S, RT60_MAX_OK_S } from '../../../../packages/engine/src/reverberacion.ts';
import type { ResultadoPuntaje, ClasePuntaje } from '../../../../packages/engine/src/puntaje.ts';
import type { ResultadoVeredicto } from '../../../../packages/engine/src/veredicto.ts';
import type { DisposicionSala, Sala } from '../../../../packages/engine/src/sala.ts';
import type { ParlanteCat, AmplificadorCat, FuenteCat } from '../../../../packages/data/src/tipos-catalogo.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { num, numConSigno, listaY } from '../formato/numeros.ts';
import { textosDe } from '../idioma/idioma.ts';
import { especParlante, especAmplificador, especFuente } from '../datos/etiquetas.ts';
import type { MurosVista } from './plano.ts';
import { construirPlanoSvg } from './plano.ts';
import { construirCurvasModalesSvg } from './curvamodal.ts';

export type ClaseVerdicto = 'ok' | 'warn' | 'alert' | 'dim';

export interface ModeloTarjetaPotencia {
  verdictoClase: ClaseVerdicto;
  verdictoTexto: string;
  simpleHtml: string;
  margenDb: number;
  textoHtml: string;
  calcHtml: string;
  avisoHtml: string | null;
  fuenteHtml: string;
  crestFactorHtml: string;
}

const GENERO_LABEL: Record<Genero, (t: ReturnType<typeof textosDe>) => string> = {
  rockpop: (t) => t.config.generoRockPop,
  jazzvocal: (t) => t.config.generoJazzVocal,
  clasica: (t) => t.config.generoClasica,
};

export function modeloPotencia(
  spk: ParlanteCat,
  amp: AmplificadorCat,
  r: ResultadoPotencia,
  distM: number,
  nivelTexto: string,
  picoObjetivoDb: number,
  genero: Genero,
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

  const crestFactorHtml = t.motor.potencia.crestFactor({
    genero: GENERO_LABEL[genero](t),
    crestFactorDb: String(CREST_FACTOR_DB[genero]),
    nivelPromedio: num(nivelPromedioEstimadoDb(picoObjetivoDb, genero), 0, idioma),
  });

  // % de la capacidad del amplificador que exige este pico — reexpresa
  // margenDb (ya calculado por potencia.ts) como porcentaje en vez de dB,
  // más intuitivo para quien no piensa en logaritmos: margenDb es una
  // relación de potencia (dB = 10·log₁₀(ratio)), así que ratio=10^(margen/10)
  // y "% de capacidad usada" = 100/ratio. Puede superar 100% cuando falta
  // potencia (ratio<1) — el propio texto lo declara como "más de lo que tiene".
  const porcentajeCapacidad = num(100 * Math.pow(10, -r.margenDb / 10), 0, idioma);

  return {
    verdictoClase: r.severidad,
    verdictoTexto: t.motor.potencia.verdicto[r.codigo],
    simpleHtml: t.motor.potencia.simple[r.codigo]({ porcentaje: porcentajeCapacidad }),
    margenDb: r.margenDb,
    textoHtml,
    calcHtml,
    avisoHtml,
    fuenteHtml,
    crestFactorHtml,
  };
}

export interface ModeloTarjetaCarga {
  sinDatos: boolean;
  verdictoClase: ClaseVerdicto;
  verdictoTexto: string;
  simpleHtml: string;
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
      simpleHtml: t.motor.carga.simple[r.codigo],
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
    simpleHtml: t.motor.carga.simple[r.codigo],
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
  simpleHtml: string;
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
      simpleHtml: t.motor.puente.simple[r.codigo],
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
    simpleHtml: t.motor.puente.simple[r.codigo],
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
  simpleHtml: string;
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
      simpleHtml: t.motor.recorrido.simple[r.codigo],
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
    simpleHtml: t.motor.recorrido.simple[r.codigo],
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
  simpleHtml: string;
  textoHtml: string;
  avisoHtml: string | null; // lista de pares agrupados — dato, no consejo
  sugerenciaHtml: string | null; // consejo accionable (para la tarjeta y para el resumen final)
  fuenteHtml: string;
}

/**
 * `resNulo` es el cruce geometría↔modo (¿el punto de escucha calculado cae
 * en el nulo del primer modo axial de largo?) — a diferencia del resto de
 * `r` (que sólo depende de las dimensiones), `resNulo` depende de la
 * disposición de parlantes, así que quien llama tiene que recalcularlo en
 * cada "Analizar"/arrastre+Recalcular (ver `evaluarNuloEscucha` en
 * modos.ts). La severidad final es el peor de los dos — ni el agrupamiento
 * ni el nulo se pisan entre sí, cualquiera de los dos alcanza para "warn".
 */
export function modeloModos(r: ResultadoModos, resNulo: ResultadoNuloEscucha, idioma: Idioma): ModeloTarjetaModos {
  const t = textosDe(idioma);
  const eje = t.motor.modos.eje;

  const techoFmt = String(TECHO_AGRUPAMIENTO_HZ);
  const hayAgrupados = r.agrupados.length > 0;
  const hayNulo = resNulo.codigo === 'nulo-cerca';

  const textoHtml =
    r.severidad === 'ok'
      ? t.motor.modos.textoOk({ techo: techoFmt })
      : t.motor.modos.textoWarn({ n: String(r.agrupados.length), techo: techoFmt });

  const verdictoClase: ClaseVerdicto = hayNulo || r.severidad === 'warn' ? 'warn' : 'ok';
  const verdictoTexto = hayNulo
    ? hayAgrupados
      ? t.motor.modos.verdictoAmbos
      : t.motor.modos.verdictoNulo
    : t.motor.modos.verdicto[r.codigo];
  const simpleHtml = hayNulo ? (hayAgrupados ? t.motor.modos.simpleAmbos : t.motor.modos.simpleNulo) : t.motor.modos.simple[r.codigo];

  const partesAviso: string[] = [];
  if (hayAgrupados) {
    partesAviso.push(
      r.agrupados
        .map((a) =>
          t.motor.modos.parAgrupado({
            a: `${eje[a.modoA.eje]} · ${a.modoA.orden}`,
            b: `${eje[a.modoB.eje]} · ${a.modoB.orden}`,
            frecuenciaA: num(a.modoA.frecuenciaHz, 1, idioma),
            frecuenciaB: num(a.modoB.frecuenciaHz, 1, idioma),
          })
        )
        .join('<br>')
    );
  }
  if (hayNulo) {
    partesAviso.push(t.motor.modos.nuloEscucha({ frecuencia: num(resNulo.frecuenciaHz, 1, idioma) }));
  }
  const avisoHtml = partesAviso.length > 0 ? partesAviso.join('<br><br>') : null;

  const partesSugerencia: string[] = [];
  if (hayAgrupados) partesSugerencia.push(t.motor.modos.sugerencia);
  if (hayNulo) partesSugerencia.push(t.motor.modos.sugerenciaNulo);
  const sugerenciaHtml = partesSugerencia.length > 0 ? partesSugerencia.join(' ') : null;

  return {
    verdictoClase,
    verdictoTexto,
    simpleHtml,
    textoHtml,
    avisoHtml,
    sugerenciaHtml,
    fuenteHtml:
      t.motor.modos.fuente({ techo: techoFmt, umbral: String(Math.round(UMBRAL_AGRUPAMIENTO * 100)) }) +
      ' ' +
      t.motor.modos.fuenteNulo({ ventana: String(Math.round(VENTANA_NULO_MODAL * 100)) }),
  };
}

export interface ModeloTarjetaReverberacion {
  verdictoClase: ClaseVerdicto; // 'ok' | 'warn' — nunca 'alert'/'dim': techo de severidad de sala, ver CLAUDE.md
  verdictoTexto: string;
  simpleHtml: string;
  textoHtml: string;
  calcHtml: string;
  fuenteHtml: string;
}

type MaterialCualquiera = MaterialMuro | MaterialPiso | MaterialTecho;

function materialLabel(material: MaterialCualquiera, t: ReturnType<typeof textosDe>): string {
  return t.config.materiales[material];
}

export function modeloReverberacion(r: ResultadoReverberacion, materiales: Materiales, idioma: Idioma): ModeloTarjetaReverberacion {
  const t = textosDe(idioma);

  // 1 decimal, no 2: la ecuación de Sabine/Eyring (sin ajuste) pierde
  // precisión justo en salas domésticas chicas con mucha absorción —
  // mostrar 2 decimales es más precisión de la que el modelo puede
  // sostener. RT60 final = promedio de las bandas 500 Hz y 2000 Hz.
  const textoHtml = t.motor.reverberacion.texto({
    rt60: num(r.rt60S, 1, idioma),
    min: num(RT60_MIN_OK_S, 1, idioma),
    max: num(RT60_MAX_OK_S, 1, idioma),
    fs: num(r.frecuenciaSchroederHz, 0, idioma),
  });

  const s = t.motor.reverberacion.superficies;
  const idx500Hz = 1;
  const fila = (nombre: string, superficieM2: number, alpha: number, absorcion: number) => ({
    nombre,
    superficie: num(superficieM2, 2, idioma),
    alpha: num(alpha, 2, idioma),
    absorcion: num(absorcion, 2, idioma),
  });
  const bandaFila = (b: ResultadoReverberacion['bandas'][number]) => ({
    hz: String(b.hz),
    alphaBar: num(b.alphaBar, 2, idioma),
    rt60: num(b.rt60S, 2, idioma),
    metodo: b.metodo === 'sabine' ? 'Sabine' : 'Eyring',
  });
  const calcHtml = t.motor.reverberacion.calc({
    filas: [
      fila(
        `${s.frontal} (${materialLabel(materiales.muroFrontal, t)})`,
        r.superficieFrontalM2,
        ABSORCION_MURO_BANDAS[materiales.muroFrontal][idx500Hz],
        r.absorcionFrontalSabines
      ),
      fila(
        `${s.posterior} (${materialLabel(materiales.muroPosterior, t)})`,
        r.superficiePosteriorM2,
        ABSORCION_MURO_BANDAS[materiales.muroPosterior][idx500Hz],
        r.absorcionPosteriorSabines
      ),
      fila(
        `${s.izquierdo} (${materialLabel(materiales.muroIzquierdo, t)})`,
        r.superficieIzquierdaM2,
        ABSORCION_MURO_BANDAS[materiales.muroIzquierdo][idx500Hz],
        r.absorcionIzquierdaSabines
      ),
      fila(
        `${s.derecho} (${materialLabel(materiales.muroDerecho, t)})`,
        r.superficieDerechaM2,
        ABSORCION_MURO_BANDAS[materiales.muroDerecho][idx500Hz],
        r.absorcionDerechaSabines
      ),
      fila(`${s.piso} (${materialLabel(materiales.piso, t)})`, r.superficiePisoM2, ABSORCION_PISO_BANDAS[materiales.piso][idx500Hz], r.absorcionPisoSabines),
      fila(
        `${s.techo} (${materialLabel(materiales.techo, t)})`,
        r.superficieTechoM2,
        ABSORCION_TECHO_BANDAS[materiales.techo][idx500Hz],
        r.absorcionTechoSabines
      ),
    ],
    absorcionTotal: num(r.absorcionTotalSabines, 2, idioma),
    volumen: num(r.volumenM3, 1, idioma),
    rt60: num(r.rt60S, 2, idioma),
    bandas: r.bandas.map(bandaFila),
    schroeder: num(r.frecuenciaSchroederHz, 0, idioma),
  });

  return {
    verdictoClase: r.severidad,
    verdictoTexto: t.motor.reverberacion.verdicto[r.codigo],
    simpleHtml: t.motor.reverberacion.simple[r.codigo],
    textoHtml,
    calcHtml,
    fuenteHtml: t.motor.reverberacion.fuente,
  };
}

/** Narra la disposición de referencia que sala.ts ya calculó (no evalúa
 * nada nuevo): distancia de CADA parlante a la pared frontal y a su
 * propia pared lateral (izquierdo contra x=0, derecho contra
 * `anchoM − parlanteDer.x`), más la separación entre ambos. Reporta los
 * dos parlantes por separado porque, con arrastre manual, ya no son
 * necesariamente simétricos — en la disposición automática (sin
 * arrastrar nada) los pares de valores coinciden, así que el texto se
 * lee igual que antes de que existiera el arrastre. Es la misma
 * geometría que alimenta potencia.ts (`distanciaEscuchaM`) y el plano
 * isométrico; esto sólo la pone en palabras. */
export function modeloUbicacionParlantes(sala: Sala, disp: DisposicionSala, idioma: Idioma): string {
  const t = textosDe(idioma).resultado.plano;
  return t.ubicacion({
    frontalIzq: num(disp.parlanteIzq.y, 2, idioma),
    lateralIzq: num(disp.parlanteIzq.x, 2, idioma),
    frontalDer: num(disp.parlanteDer.y, 2, idioma),
    lateralDer: num(sala.anchoM - disp.parlanteDer.x, 2, idioma),
    separacion: num(disp.separacionM, 2, idioma),
  });
}

export interface ModeloPuntaje {
  puntaje: number;
  puntajeTexto: string;
  /** 'ok'/'warn'/'alert' según los umbrales declarados en puntaje.ts
   * (clasificarPuntaje) — colorea el número, pero nunca como un pill de
   * veredicto (pintarVerdict): sigue siendo capa criterio-editorial, no
   * física, y se mantiene rotulado como tal en pantalla. */
  clase: ClasePuntaje;
  detalleHtml: string;
  avisoHtml: string | null;
  criterioHtml: string;
}

/** CAPA CRITERIO-EDITORIAL — ver puntaje.ts. El número lleva color (ok/warn/
 * alert) para que se lea de un vistazo, pero nunca se pinta con el mismo
 * componente de pill que un veredicto de capa física (pintarVerdict) — la
 * distinción sigue siendo de layout/rotulado, no de si hay o no color. */
export function modeloPuntaje(r: ResultadoPuntaje, idioma: Idioma): ModeloPuntaje {
  const t = textosDe(idioma);
  const nombreLabel = t.motor.puntaje.componente;

  const detalleHtml = r.detalle
    .map((d) =>
      d.incluido
        ? t.motor.puntaje.filaIncluida({ nombre: nombreLabel[d.nombre], puntos: String(d.puntos) })
        : t.motor.puntaje.filaExcluida({ nombre: nombreLabel[d.nombre] })
    )
    .join('<br>');

  const avisoHtml =
    r.componentesEvaluados < r.componentesTotales
      ? t.motor.puntaje.aviso({ evaluados: String(r.componentesEvaluados), total: String(r.componentesTotales) })
      : null;

  return {
    puntaje: r.puntaje,
    puntajeTexto: `${num(r.puntaje, 1, idioma)}/10`,
    clase: r.clase,
    detalleHtml,
    avisoHtml,
    criterioHtml: t.motor.puntaje.criterio,
  };
}

/** Un componente ya evaluado (potencia, carga, puente de una fuente,
 * recorrido de una fuente, o modos), con su nombre ya traducido y listo
 * para mostrar en el resumen — reusa exactamente lo que ya calculó su
 * modeloX correspondiente, no inventa una evaluación nueva. `detalle` es
 * una anotación numérica corta opcional (ej. "+4,8 dB", "ratioZ 4300×"),
 * ya formateada por formato/numeros.ts según el idioma activo. */
export interface ComponenteResumen {
  nombre: string;
  verdictoClase: ClaseVerdicto;
  verdictoTexto: string;
  detalle?: string;
  avisoHtml: string | null;
}

export interface ModeloResumenFinal {
  comportamientoHtml: string;
  resumenHtml: string;
  fortalezasHtml: string;
  debilidadesHtml: string;
  /** '' cuando no hay ningún componente "dim" — la sección entera se oculta
   * en pintar.ts en vez de mostrar un "todos tenían dato" que nadie pidió
   * leer. Sólo se menciona cuando hay algo real que declarar. */
  sinDatosHtml: string;
  recomendacionesHtml: string;
}

/**
 * Recapitulación en lenguaje simple de lo que ya mostraron las tarjetas de
 * arriba — no evalúa nada nuevo, sólo reorganiza y detalla. "dim"
 * (sin-datos) no cuenta ni como fortaleza ni como debilidad: un dato
 * faltante no es ni bueno ni malo, es desconocido (misma doctrina que el
 * resto del proyecto) — pero tampoco desaparece: el componente ya no se
 * publica como tarjeta propia en el análisis principal (ver
 * pintarCarga/pintarGanancia), así que esta es la única mención visible de
 * que ese componente no se pudo evaluar, y sólo aparece cuando hay al menos
 * uno — nunca como confirmación vacía de que "todo estaba bien". Cada
 * recomendación reusa el `avisoHtml` que la regla correspondiente ya
 * redactó — una por cada debilidad encontrada, no sólo la peor, para que
 * el detalle físico quede completo. `comportamientoHtml` es la sola
 * oración que resume "cómo se comporta el match completo" — reusa el
 * puntaje 1-10 ya calculado (capa criterio-editorial, ver puntaje.ts), no
 * inventa una evaluación nueva.
 */
export function modeloResumenFinal(
  componentes: ComponenteResumen[],
  puntaje: { valor: number; clase: ClasePuntaje },
  idioma: Idioma
): ModeloResumenFinal {
  const t = textosDe(idioma).motor.resumen;

  const fortalezas = componentes.filter((c) => c.verdictoClase === 'ok');
  const debilidades = componentes.filter((c) => c.verdictoClase === 'warn' || c.verdictoClase === 'alert');
  const sinDatos = componentes.filter((c) => c.verdictoClase === 'dim');

  const comportamientoHtml = t.comportamiento[puntaje.clase]({ puntaje: String(puntaje.valor) });

  const resumenHtml = t.resumenConteo({
    evaluados: String(componentes.length - sinDatos.length),
    fortalezas: String(fortalezas.length),
    debilidades: String(debilidades.length),
  });

  const itemHtml = (c: ComponenteResumen): string =>
    c.detalle
      ? `<li>${t.itemConDetalle({ nombre: c.nombre, verdicto: c.verdictoTexto, detalle: c.detalle })}</li>`
      : `<li>${t.itemFortaleza({ nombre: c.nombre, verdicto: c.verdictoTexto })}</li>`;

  const fortalezasHtml = fortalezas.length > 0 ? fortalezas.map(itemHtml).join('') : `<li>${t.sinFortalezas}</li>`;
  const debilidadesHtml = debilidades.length > 0 ? debilidades.map(itemHtml).join('') : `<li>${t.sinDebilidades}</li>`;
  const sinDatosHtml = sinDatos.length > 0 ? sinDatos.map((c) => `<li>${t.itemSinDatos({ nombre: c.nombre })}</li>`).join('') : '';

  const conAviso = debilidades.filter((c): c is ComponenteResumen & { avisoHtml: string } => c.avisoHtml !== null);
  const recomendacionesHtml =
    conAviso.length > 0
      ? conAviso.map((c) => `<li>${t.recomendacionConAviso({ nombre: c.nombre, aviso: c.avisoHtml })}</li>`).join('')
      : `<li>${t.recomendacionTodoOk}</li>`;

  return { comportamientoHtml, resumenHtml, fortalezasHtml, debilidadesHtml, sinDatosHtml, recomendacionesHtml };
}

/** Máximo 3, las de mayor severidad primero — "qué conviene hacer" antes
 * que nada más en la pantalla, no una lista larga. Mismas plantillas que
 * ya usa `modeloResumenFinal` (`recomendacionConAviso`/`recomendacionTodoOk`)
 * — no redacta de nuevo, sólo prioriza y recorta. */
export function modeloRecomendacionesTop(componentes: ComponenteResumen[], idioma: Idioma, maximo = 3): string {
  const t = textosDe(idioma).motor.resumen;
  const orden: Record<ClaseVerdicto, number> = { alert: 0, warn: 1, ok: 2, dim: 3 };
  const conAviso = componentes
    .filter((c): c is ComponenteResumen & { avisoHtml: string } => c.avisoHtml !== null && (c.verdictoClase === 'warn' || c.verdictoClase === 'alert'))
    .sort((a, b) => orden[a.verdictoClase] - orden[b.verdictoClase])
    .slice(0, maximo);
  return conAviso.length > 0
    ? conAviso.map((c) => `<li>${t.recomendacionConAviso({ nombre: c.nombre, aviso: c.avisoHtml })}</li>`).join('')
    : `<li>${t.recomendacionTodoOk}</li>`;
}

export interface ModeloEstadoGrupo {
  nombre: string;
  clase: ClaseVerdicto;
  estadoTexto: string;
  detalleTexto: string;
}

export interface ModeloVeredicto {
  tituloHtml: string;
  subtextoHtml: string;
  clase: 'ok' | 'warn' | 'alert';
  potencia: ModeloEstadoGrupo;
  acopleElectrico: ModeloEstadoGrupo;
  sala: ModeloEstadoGrupo;
}

interface EntradasEstadoGrupo {
  mPot: ModeloTarjetaPotencia;
  mCarga: ModeloTarjetaCarga;
  mPuenteStreamer: ModeloTarjetaPuente | null;
  mRecorridoStreamer: ModeloTarjetaRecorrido | null;
  mPuenteDac: ModeloTarjetaPuente | null;
  mRecorridoDac: ModeloTarjetaRecorrido | null;
  mModos: ModeloTarjetaModos;
  mReverb: ModeloTarjetaReverberacion;
}

/** El peor de los items dados, por clase de veredicto (dim < ok < warn <
 * alert) — mismo orden que `peorSeveridad()` del motor, aplicado acá
 * sobre los objetos de pantalla (que ya traen su propio texto) en vez de
 * sobre el código crudo, para no tener que volver a cruzar contra el
 * nombre localizado de cada componente. */
function peorEntre<T extends { verdictoClase: ClaseVerdicto }>(items: Array<T | null>): T | null {
  const orden: Record<ClaseVerdicto, number> = { dim: -1, ok: 0, warn: 1, alert: 2 };
  const aplicables = items.filter((i): i is T => i !== null && i.verdictoClase !== 'dim');
  if (aplicables.length === 0) return null;
  return aplicables.reduce((peor, actual) => (orden[actual.verdictoClase] > orden[peor.verdictoClase] ? actual : peor));
}

/**
 * "Veredicto" (frase única) + "Tres estados" (Potencia / Acople eléctrico
 * / Sala) — CAPA CRITERIO-EDITORIAL, reemplaza al puntaje 1-10 como
 * encabezado del resultado (`puntaje.ts` se queda intacto, sigue vivo
 * para un futuro comparador entre análisis). `v` ya trae el código de
 * cada grupo calculado por `calcularVeredicto()` (motor, peor-eslabón-
 * gana, no promedio); acá sólo se redacta: el titular sale de una matriz
 * fija (algún grupo "alert" → no recomendada; si no, algún "warn" →
 * soportada con límites; si no, compatible), y el texto de cada estado
 * reusa el `verdictoTexto` del componente más grave de ese grupo — nunca
 * inventa una evaluación nueva.
 */
export function modeloVeredicto(v: ResultadoVeredicto, e: EntradasEstadoGrupo, idioma: Idioma): ModeloVeredicto {
  const t = textosDe(idioma).motor.veredicto;

  const nombreGrupo: Record<'potencia' | 'acopleElectrico' | 'sala', string> = {
    potencia: t.nombrePotencia,
    acopleElectrico: t.nombreAcople,
    sala: t.nombreSala,
  };

  const enFalta = (['potencia', 'acopleElectrico', 'sala'] as const).filter((k) => v[k] === v.general).map((k) => nombreGrupo[k]);
  const gruposTexto = listaY(enFalta, idioma);

  const tituloHtml = v.general === 'alert' ? t.tituloAlert : v.general === 'warn' ? t.tituloWarn : t.tituloOk;
  const subtextoHtml =
    v.general === 'alert' ? t.subtextoAlert({ grupos: gruposTexto }) : v.general === 'warn' ? t.subtextoWarn({ grupos: gruposTexto }) : t.subtextoOk;

  const peorPotencia = e.mPot; // potencia siempre tiene un único componente, es directo
  const peorAcople = peorEntre([e.mCarga, e.mPuenteStreamer, e.mRecorridoStreamer, e.mPuenteDac, e.mRecorridoDac]);
  const peorSala = peorEntre([e.mModos, e.mReverb]);

  const estadoAcopleTexto = v.acopleElectrico === 'sin-datos' ? t.estadoAcopleSinDatos : t.estadoAcople[v.acopleElectrico];

  return {
    tituloHtml,
    subtextoHtml,
    clase: v.general,
    potencia: {
      nombre: t.nombrePotencia,
      clase: v.potencia,
      estadoTexto: t.estadoPotencia[v.potencia],
      detalleTexto: peorPotencia.verdictoTexto,
    },
    acopleElectrico: {
      nombre: t.nombreAcople,
      clase: v.acopleElectrico === 'sin-datos' ? 'dim' : v.acopleElectrico,
      estadoTexto: estadoAcopleTexto,
      detalleTexto: peorAcople ? peorAcople.verdictoTexto : t.sinDatosDetalle,
    },
    sala: {
      nombre: t.nombreSala,
      clase: v.sala,
      estadoTexto: t.estadoSala[v.sala],
      detalleTexto: peorSala ? peorSala.verdictoTexto : t.sinDatosDetalle,
    },
  };
}

export interface ModeloDocumento {
  fechaTexto: string;
  equiposHtml: string;
  anchoLargoTexto: string;
  altoTexto: string;
  distanciaTexto: string;
  nivelTexto: string;
  picoTexto: string;
  planoHtml: string;
  puntajeTexto: string;
  puntajeClase: ClasePuntaje;
  seccionesHtml: string;
  resumenHtml: string;
}

/**
 * Todo lo que `modeloDocumento` necesita más allá de equipo/sala/puntaje —
 * son los mismos modelos de tarjeta que ya calculó `construirSnapshot()`
 * en `main.ts` (cero recálculo del motor), agrupados en un solo objeto
 * porque son demasiados campos para pasarlos sueltos.
 */
export interface DatosSeccionesDocumento {
  mPot: ModeloTarjetaPotencia;
  mCarga: ModeloTarjetaCarga;
  mPuenteStreamer: ModeloTarjetaPuente | null;
  mRecorridoStreamer: ModeloTarjetaRecorrido | null;
  mPuenteDac: ModeloTarjetaPuente | null;
  mRecorridoDac: ModeloTarjetaRecorrido | null;
  mModos: ModeloTarjetaModos;
  agrupadosModos: ModoAgrupado[];
  mReverb: ModeloTarjetaReverberacion;
  disposicion: DisposicionSala;
  murosVista: MurosVista;
  resumenFinal: ModeloResumenFinal;
}

interface SeccionInput {
  capa: string;
  verdictoClase: ClaseVerdicto;
  verdictoTexto: string;
  titulo: string;
  simpleHtml: string;
  textoHtml: string;
  calcHtml?: string;
  avisoHtml?: string | null;
  extraHtml?: string;
  fuenteHtml: string;
  graficoHtml?: string;
}

/** Una tarjeta de evaluación reformateada como sección del informe: mismo
 * contenido que ya pinta pintar.ts en la pantalla de resultado (simple +
 * técnico + cálculo + aviso + fuente), siempre visible — un informe no
 * tiene "Ver detalle técnico" para desplegar, todo se muestra de una. El
 * gráfico (medidor/curvas), cuando existe, va envuelto en un panel oscuro
 * — ver `panelOscuro`. */
function seccionDocumento(s: SeccionInput): string {
  return (
    `<div class="doc-seccion">` +
    `<div class="doc-seccion-ct"><span class="doc-badge">${s.capa}</span><span class="doc-verdict doc-verdict-${s.verdictoClase}">${s.verdictoTexto}</span></div>` +
    `<h3 class="doc-seccion-titulo">${s.titulo}</h3>` +
    `<p class="doc-simple-seccion">${s.simpleHtml}</p>` +
    `<div class="doc-cuerpo">${s.textoHtml}</div>` +
    (s.calcHtml ? `<div class="doc-calc">${s.calcHtml}</div>` : '') +
    (s.avisoHtml ? `<div class="doc-flag">${s.avisoHtml}</div>` : '') +
    (s.extraHtml ?? '') +
    (s.graficoHtml ?? '') +
    `<div class="doc-fuente">${s.fuenteHtml}</div>` +
    `</div>`
  );
}

/** Envuelve un gráfico (SVG del motor, o el medidor de potencia) en un
 * panel de fondo oscuro dentro de la hoja blanca — el resto del sitio ya
 * dibuja estos gráficos con colores pensados para fondo oscuro
 * (`plano.ts`/`curvamodal.ts` usan hex fijos, no custom properties), así
 * que en vez de mantener una segunda paleta clara para cada uno, el panel
 * les da el mismo fondo oscuro donde ya se ven bien — sin tocar esos
 * archivos ni sus tests. */
function panelOscuro(contenidoHtml: string): string {
  return `<div class="doc-dark-panel">${contenidoHtml}</div>`;
}

/**
 * Reformatea los datos ya calculados de un análisis como un informe — sin
 * recalcular nada del motor, mismo principio que `modeloResumenFinal`.
 * Vista previa interna de "Documento" (pantalla, ver CLAUDE.md): reusa
 * las mismas etiquetas de categoría y las mismas tarjetas de modelo que
 * ya arma `construirSnapshot()` en `main.ts` para la pantalla de
 * resultado, para no inventar redacción ni gráficos nuevos. `fechaTexto`
 * no es un dato del motor — lo arma `main.ts` con `Date`, se pasa ya
 * formateado.
 */
export function modeloDocumento(
  spk: ParlanteCat,
  amp: AmplificadorCat,
  streamer: FuenteCat | null,
  dac: FuenteCat | null,
  sala: Sala,
  distanciaEscuchaM: number,
  nivelTexto: string,
  picoObjetivoDb: number,
  puntaje: { valor: number; clase: ClasePuntaje },
  datos: DatosSeccionesDocumento,
  fechaTexto: string,
  idioma: Idioma
): ModeloDocumento {
  const t = textosDe(idioma).resultado;
  const tm = textosDe(idioma).motor;
  const td = textosDe(idioma).documento;

  const equipoFila = (categoria: string, nombre: string, espec: string): string =>
    `<div class="doc-equipo"><div class="doc-equipo-cat">${categoria}</div><div class="doc-equipo-nombre">${nombre}</div><div class="doc-equipo-espec">${espec}</div></div>`;

  let equiposHtml = equipoFila(t.itemParlantes, spk.nombre, especParlante(spk, idioma));
  equiposHtml += equipoFila(t.itemAmplificador, amp.nombre, especAmplificador(amp, idioma));
  if (streamer) equiposHtml += equipoFila(t.itemStreamer, streamer.nombre, especFuente(streamer, idioma));
  if (dac) equiposHtml += equipoFila(t.itemDac, dac.nombre, especFuente(dac, idioma));

  // Vista Superior fija en el informe (no la que esté activa en la
  // pantalla de resultado): la más compacta/legible para un reporte —
  // todo el layout de reflexiones de un vistazo, sin la altura extra
  // que pide la proyección isométrica.
  const planoSvg = construirPlanoSvg(sala, datos.disposicion, datos.murosVista, 'superior', idioma, false);
  const planoHtml =
    `<h2 class="doc-h2">${td.planoTitulo}</h2>` +
    `<p class="doc-cuerpo">${t.plano.texto}</p>` +
    panelOscuro(planoSvg) +
    `<h4 class="doc-h4">${t.plano.ubicacionTitulo}</h4>` +
    `<p class="doc-cuerpo">${modeloUbicacionParlantes(sala, datos.disposicion, idioma)}</p>`;

  const secciones: string[] = [];

  secciones.push(
    seccionDocumento({
      capa: t.capaFisica,
      verdictoClase: datos.mPot.verdictoClase,
      verdictoTexto: datos.mPot.verdictoTexto,
      titulo: tm.potencia.titulo,
      simpleHtml: datos.mPot.simpleHtml,
      textoHtml: datos.mPot.textoHtml,
      calcHtml: datos.mPot.calcHtml,
      avisoHtml: datos.mPot.avisoHtml,
      extraHtml: `<p class="doc-fuente">${datos.mPot.crestFactorHtml}</p>`,
      fuenteHtml: datos.mPot.fuenteHtml,
      graficoHtml: panelOscuro(
        `<div class="meter"><div class="scale" id="doc-pw-scale"></div>` +
          `<div class="scap"><span>${tm.potencia.escalaInsuficiente}</span><span>${tm.potencia.escalaEje}</span><span>${tm.potencia.escalaSobra}</span></div></div>`
      ),
    })
  );

  if (!datos.mCarga.sinDatos) {
    secciones.push(
      seccionDocumento({
        capa: t.capaFisica,
        verdictoClase: datos.mCarga.verdictoClase,
        verdictoTexto: datos.mCarga.verdictoTexto,
        titulo: tm.carga.titulo,
        simpleHtml: datos.mCarga.simpleHtml,
        textoHtml: datos.mCarga.textoHtml,
        avisoHtml: datos.mCarga.avisoHtml,
        fuenteHtml: datos.mCarga.fuenteHtml,
      })
    );
  }

  const fuenteSeccion = (
    m: ModeloTarjetaPuente | ModeloTarjetaRecorrido | null,
    titulo: string
  ): SeccionInput | null => {
    if (!m || m.sinDatos) return null;
    return {
      capa: t.capaFisica,
      verdictoClase: m.verdictoClase,
      verdictoTexto: m.verdictoTexto,
      titulo,
      simpleHtml: m.simpleHtml,
      textoHtml: m.textoHtml,
      calcHtml: m.calcHtml,
      avisoHtml: m.avisoHtml,
      fuenteHtml: m.fuenteHtml,
    };
  };
  for (const s of [
    fuenteSeccion(datos.mPuenteStreamer, tm.puente.tituloStreamer),
    fuenteSeccion(datos.mRecorridoStreamer, tm.recorrido.tituloStreamer),
    fuenteSeccion(datos.mPuenteDac, tm.puente.tituloDac),
    fuenteSeccion(datos.mRecorridoDac, tm.recorrido.tituloDac),
  ]) {
    if (s) secciones.push(seccionDocumento(s));
  }

  const svgModos = construirCurvasModalesSvg(sala, datos.agrupadosModos, idioma);
  secciones.push(
    seccionDocumento({
      capa: t.geometria,
      verdictoClase: datos.mModos.verdictoClase,
      verdictoTexto: datos.mModos.verdictoTexto,
      titulo: tm.modos.titulo,
      simpleHtml: datos.mModos.simpleHtml,
      textoHtml: datos.mModos.textoHtml,
      avisoHtml: datos.mModos.avisoHtml,
      extraHtml: datos.mModos.sugerenciaHtml ? `<div class="doc-flag">${datos.mModos.sugerenciaHtml}</div>` : '',
      fuenteHtml: datos.mModos.fuenteHtml,
      graficoHtml: svgModos ? panelOscuro(svgModos + `<div class="src">${tm.modos.curvasCaption}</div>`) : '',
    })
  );

  secciones.push(
    seccionDocumento({
      capa: t.geometria,
      verdictoClase: datos.mReverb.verdictoClase,
      verdictoTexto: datos.mReverb.verdictoTexto,
      titulo: tm.reverberacion.titulo,
      simpleHtml: datos.mReverb.simpleHtml,
      textoHtml: datos.mReverb.textoHtml,
      calcHtml: datos.mReverb.calcHtml,
      fuenteHtml: datos.mReverb.fuenteHtml,
    })
  );

  const rf = datos.resumenFinal;
  const tmr = tm.resumen;
  const resumenHtml =
    `<p class="doc-simple-seccion">${rf.comportamientoHtml}</p>` +
    `<p class="doc-cuerpo">${rf.resumenHtml}</p>` +
    `<h4 class="doc-h4">${tmr.fortalezasTitulo}</h4><ul class="doc-lista">${rf.fortalezasHtml}</ul>` +
    `<h4 class="doc-h4">${tmr.debilidadesTitulo}</h4><ul class="doc-lista">${rf.debilidadesHtml}</ul>` +
    (rf.sinDatosHtml ? `<h4 class="doc-h4">${tmr.sinDatosTitulo}</h4><ul class="doc-lista">${rf.sinDatosHtml}</ul>` : '') +
    `<h4 class="doc-h4">${tmr.recomendacionTitulo}</h4><ul class="doc-lista">${rf.recomendacionesHtml}</ul>`;

  return {
    fechaTexto,
    equiposHtml,
    anchoLargoTexto: `${num(sala.anchoM, 1, idioma)} × ${num(sala.largoM, 1, idioma)} m`,
    altoTexto: `${num(sala.altoM, 2, idioma)} m`,
    distanciaTexto: `≈ ${num(distanciaEscuchaM, 1, idioma)} m`,
    nivelTexto,
    picoTexto: `${num(picoObjetivoDb, 0, idioma)} dB`,
    planoHtml,
    puntajeTexto: `${num(puntaje.valor, 1, idioma)}/10`,
    puntajeClase: puntaje.clase,
    seccionesHtml: secciones.join(''),
    resumenHtml,
  };
}
