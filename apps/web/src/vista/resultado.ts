/**
 * Traduce los resultados del motor a texto de pantalla — PURO: recibe
 * datos del catálogo + el resultado ya calculado por el motor, devuelve
 * strings (algunos HTML, con <b>) listos para que pintar.ts los asigne al
 * DOM. Nada acá importa `document`; por eso es testeable con `node --test`
 * sin levantar nada, igual que el motor.
 *
 * Paso 4: sitio sólo en español, mismo texto que tenía
 * prototipo-frontend.html salvo donde la redacción cambió porque la fuente
 * del dato cambió de forma (ver packages/data: `fuente` es una cita corta,
 * ya no la oración larga que hoy vive en `nota`).
 *
 * Paso 5: el motor ya no emite `etiqueta`/`avisos` en prosa — devuelve
 * `codigo` (una unión de literales) y, en potencia.ts, `avisos` con los
 * números en crudo (`AvisoPotencia`). Las cuatro tablas TEXTO_* de abajo
 * son la traducción código→texto, hoy fija en español; el Paso 6 las
 * reemplaza por los diccionarios de `idioma/es.ts` y `idioma/en.ts` — el
 * resto de este archivo no cambia de forma, sólo de dónde saca el texto.
 */
import type { CodigoPotencia, AvisoPotencia, ResultadoPotencia } from '../../../../packages/engine/src/potencia.ts';
import type { CodigoCarga, ResultadoCarga } from '../../../../packages/engine/src/carga.ts';
import type {
  CodigoPuenteImpedancias,
  CodigoRecorridoVolumen,
  ResultadoPuenteImpedancias,
  ResultadoRecorridoVolumen,
} from '../../../../packages/engine/src/ganancia.ts';
import { RATIO_BRIDGING_OK, UMBRAL_RECORRIDO } from '../../../../packages/engine/src/ganancia.ts';
import type { ParlanteCat, AmplificadorCat, FuenteCat } from '../../../../packages/data/src/tipos-catalogo.ts';
import { num, numConSigno } from '../formato/numeros.ts';
import { IDIOMA_PROVISIONAL as IDIOMA } from '../idioma-provisional.ts';

export type ClaseVerdicto = 'ok' | 'warn' | 'alert' | 'dim';

const TEXTO_POTENCIA: Record<CodigoPotencia, string> = {
  'con-margen': 'Con margen',
  justo: 'Justo',
  insuficiente: 'Insuficiente',
};

const TEXTO_CARGA: Record<CodigoCarga, string> = {
  'sin-dato': 'Sin dato',
  'exige-corriente': 'Exige corriente',
  cubierto: 'Cubierto',
  'carga-benigna': 'Carga benigna',
};

const TEXTO_PUENTE: Record<CodigoPuenteImpedancias, string> = {
  'sin-dato': 'Sin dato',
  'puente-correcto': 'Puente correcto',
  'puente-ajustado': 'Puente ajustado',
  'puente-insuficiente': 'Puente insuficiente',
};

const TEXTO_RECORRIDO: Record<CodigoRecorridoVolumen, string> = {
  'sin-dato': 'Sin dato',
  insuficiente: 'Insuficiente',
  'recorrido-sano': 'Recorrido de volumen sano',
  'recorrido-corto': 'Recorrido corto',
};

function textoAvisoPotencia(a: AvisoPotencia): string {
  return `El fabricante recomienda desde ${num(a.recomendadaW, 0, IDIOMA)} W para este parlante; el amplificador entrega ${num(a.entregadaW, 0, IDIOMA)} W.`;
}

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
  picoObjetivoDb: number
): ModeloTarjetaPotencia {
  const nivelMinuscula = nivelTexto.toLowerCase();
  let textoHtml: string;
  if (r.severidad === 'ok') {
    textoHtml =
      `El ${amp.nombre} entrega los picos a nivel <b>${nivelMinuscula}</b> con ` +
      `<b>${num(r.margenDb, 1, IDIOMA)} dB</b> de margen a ${num(distM, 1, IDIOMA)} m. Alcanza con holgura.`;
  } else if (r.severidad === 'warn') {
    textoHtml =
      `Llega a los picos a nivel <b>${nivelMinuscula}</b>, pero con sólo ` +
      `<b>${num(r.margenDb, 1, IDIOMA)} dB</b> de margen. En los transientes más fuertes queda al límite.`;
  } else {
    textoHtml =
      `Faltan <b>${num(Math.abs(r.margenDb), 1, IDIOMA)} dB</b> para los picos a nivel <b>${nivelMinuscula}</b> ` +
      `a ${num(distM, 1, IDIOMA)} m. A ese volumen el amplificador recorta.`;
  }

  const calcHtml =
    `SPL disponible = ${num(spk.sensibilidadDb.valor, 0, IDIOMA)} − 20·log₁₀(${num(distM, 1, IDIOMA)}) + ` +
    `10·log₁₀(${num(amp.potencia8OhmW.valor, 0, IDIOMA)}) + 6 <span style="color:var(--faint)">par</span> + ` +
    `3 <span style="color:var(--faint)">sala</span> = <b>${num(r.splDisponibleDb, 1, IDIOMA)} dB</b><br>` +
    `objetivo en pico (${nivelMinuscula}) = <b>${num(picoObjetivoDb, 0, IDIOMA)} dB</b><br>` +
    `margen = ${num(r.splDisponibleDb, 1, IDIOMA)} − ${num(picoObjetivoDb, 0, IDIOMA)} = <b>${numConSigno(r.margenDb, 1, IDIOMA)} dB</b>`;

  const avisoHtml = r.avisos.length > 0 ? textoAvisoPotencia(r.avisos[0]!) : null;

  const fuenteHtml =
    `<b>Fuente sensibilidad:</b> ${spk.sensibilidadDb.fuente[IDIOMA]}` +
    (spk.sensibilidadDb.nota ? ` — ${spk.sensibilidadDb.nota[IDIOMA]}` : '') +
    ` <span class="conf">confianza ${spk.sensibilidadDb.confianza}</span><br>` +
    `<b>Fuente potencia:</b> ${amp.potencia8OhmW.fuente[IDIOMA]} (RMS, 8 Ω) ` +
    `<span class="conf">confianza ${amp.potencia8OhmW.confianza}</span>`;

  return {
    verdictoClase: r.severidad,
    verdictoTexto: TEXTO_POTENCIA[r.codigo],
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

export function modeloCarga(spk: ParlanteCat, amp: AmplificadorCat, r: ResultadoCarga): ModeloTarjetaCarga {
  if (r.severidad === 'sin-datos') {
    return {
      sinDatos: true,
      verdictoClase: 'dim',
      verdictoTexto: TEXTO_CARGA[r.codigo],
      textoHtml:
        'No hay una medición precisa de la impedancia mínima de este parlante. Las mediciones ' +
        'independientes no reportan caídas críticas, pero <b>sin el dato no se afirma que sea una carga fácil</b>.',
      avisoHtml: 'Un dato faltante no se cuenta como aprobado. <b>Pendiente:</b> curva de impedancia medida.',
      avisoEsSinDatos: true,
      fuenteHtml: `<b>Fuente:</b> impedancia nominal ${num(spk.impedanciaNominalOhm, 0, IDIOMA)} Ω (fábrica). Mínima: sin medición. <span class="conf">confianza baja</span>`,
    };
  }

  const minZ = spk.impedanciaMinOhm as number; // no null: severidad !== 'sin-datos'
  let textoHtml: string;
  let avisoHtml: string | null;

  if (r.severidad === 'warn') {
    textoHtml =
      `La impedancia baja a <b>${num(minZ, 1, IDIOMA)} Ω</b>, justo donde el bajo pide más corriente. ` +
      `Con un amplificador de potencia modesta puede sentirse el grave blando o sin control.`;
    avisoHtml =
      'Conviene un amplificador que <b>doble su potencia al bajar de 8 a 4 Ω</b> (reserva ≥1,7×) o que ' +
      'entregue <b>60 W o más</b> en 8 Ω — señal de buena entrega de corriente.';
  } else if (r.dura && r.reserva) {
    textoHtml =
      `La impedancia baja a <b>${num(minZ, 1, IDIOMA)} Ω</b>, una carga exigente, pero este amplificador ` +
      `tiene reserva de corriente (casi dobla su potencia a 4 Ω) y la controla.`;
    avisoHtml = null;
  } else if (r.dura) {
    const razon =
      amp.potencia4OhmW !== null
        ? `aunque su reserva a 4 Ω (${num(amp.potencia4OhmW.valor / amp.potencia8OhmW.valor, 1, IDIOMA)}×) no llega ` +
          `al umbral de 1,7×, entrega suficiente potencia (≥60 W en 8 Ω) como para controlarla.`
        : 'no hay dato de cuánto sube su potencia a 4 Ω, pero entrega suficiente potencia (≥60 W en 8 Ω) como para controlarla.';
    textoHtml = `La impedancia baja a <b>${num(minZ, 1, IDIOMA)} Ω</b>, una carga exigente, pero este amplificador ${razon}`;
    avisoHtml = null;
  } else {
    textoHtml = 'La impedancia se mantiene alta; es una carga fácil para cualquier amplificador.';
    avisoHtml = null;
  }

  return {
    sinDatos: false,
    verdictoClase: r.severidad,
    verdictoTexto: TEXTO_CARGA[r.codigo],
    textoHtml,
    avisoHtml,
    avisoEsSinDatos: false,
    fuenteHtml: `<b>Fuente:</b> impedancia nominal ${num(spk.impedanciaNominalOhm, 0, IDIOMA)} Ω, mínima ${num(minZ, 1, IDIOMA)} Ω (fábrica / medición). <span class="conf">confianza media</span>`,
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

export function modeloPuente(fuente: FuenteCat, amp: AmplificadorCat, r: ResultadoPuenteImpedancias): ModeloTarjetaPuente {
  if (r.severidad === 'sin-datos') {
    return {
      sinDatos: true,
      verdictoClase: 'dim',
      verdictoTexto: TEXTO_PUENTE[r.codigo],
      textoHtml: `Falta la impedancia de salida de <b>${fuente.nombre}</b> o la de entrada de <b>${amp.nombre}</b>. Sin ambos datos no se afirma que el puente sea correcto.`,
      calcHtml: '',
      avisoHtml: 'Un dato faltante no se cuenta como aprobado. <b>Pendiente:</b> impedancia de salida de la fuente o de entrada del amplificador.',
      avisoEsSinDatos: true,
      fuenteHtml: '',
    };
  }

  const ratioZ = r.ratioZ as number;
  const calcHtml =
    `ratioZ = Z entrada(${amp.nombre}) / Z salida(${fuente.nombre}) = ${num(amp.impedanciaEntradaOhm ?? 0, 0, IDIOMA)} / ` +
    `${num(fuente.impedanciaSalidaOhm ?? 0, 0, IDIOMA)} = <b>${num(ratioZ, 1, IDIOMA)}×</b>`;

  let textoHtml: string;
  let avisoHtml: string | null;
  if (r.severidad === 'ok') {
    textoHtml = `La entrada del amplificador es <b>${num(ratioZ, 1, IDIOMA)}×</b> la impedancia de salida de la fuente — sobre la convención de ${RATIO_BRIDGING_OK}:1 para transferir la señal sin pérdida perceptible.`;
    avisoHtml = null;
  } else if (r.severidad === 'warn') {
    textoHtml = `La entrada del amplificador es sólo <b>${num(ratioZ, 1, IDIOMA)}×</b> la impedancia de salida de la fuente — bajo la convención de ${RATIO_BRIDGING_OK}:1. Con cables largos o de alta capacitancia puede haber pérdida de nivel o de graves medible.`;
    avisoHtml = 'Conviene una fuente con menor impedancia de salida, o cables de interconexión cortos y de baja capacitancia.';
  } else {
    textoHtml = `La impedancia de entrada del amplificador es menor que la de salida de la fuente (<b>${num(ratioZ, 2, IDIOMA)}×</b>) — la fuente no tiene margen para manejar esa entrada. Pérdida de nivel significativa.`;
    avisoHtml = 'Esta combinación no transfiere la señal correctamente. Conviene otra fuente o un preamplificador intermedio con baja impedancia de salida.';
  }

  return {
    sinDatos: false,
    verdictoClase: r.severidad,
    verdictoTexto: TEXTO_PUENTE[r.codigo],
    textoHtml,
    calcHtml,
    avisoHtml,
    avisoEsSinDatos: false,
    fuenteHtml: `<b>Convención:</b> puente de voltaje ≥${RATIO_BRIDGING_OK}:1 (Rane «Sound System Interconnection»; Whitlock / Jensen Transformers) — no es un dato del equipo, es una convención de ingeniería de audio. <span class="conf">confianza ${fuente.confianza}</span>`,
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

export function modeloRecorrido(fuente: FuenteCat, amp: AmplificadorCat, r: ResultadoRecorridoVolumen): ModeloTarjetaRecorrido {
  if (r.severidad === 'sin-datos') {
    return {
      sinDatos: true,
      verdictoClase: 'dim',
      verdictoTexto: TEXTO_RECORRIDO[r.codigo],
      textoHtml: `Falta el voltaje de salida de <b>${fuente.nombre}</b> o la sensibilidad de entrada de <b>${amp.nombre}</b>.`,
      calcHtml: '',
      avisoHtml: 'Un dato faltante no se cuenta como aprobado. <b>Pendiente:</b> voltaje de salida de la fuente o sensibilidad de entrada del amplificador.',
      avisoEsSinDatos: true,
      fuenteHtml: '',
    };
  }

  const margenV = r.margenV as number;
  const sensEntradaV = (amp.sensEntradaMv ?? 0) / 1000;
  const calcHtml =
    `margenV = salidaV(${fuente.nombre}) / sensEntrada(${amp.nombre}) = ${num(fuente.salidaV ?? 0, 2, IDIOMA)} / ` +
    `${num(sensEntradaV, 2, IDIOMA)} = <b>${num(margenV, 1, IDIOMA)}×</b>`;

  let textoHtml: string;
  let avisoHtml: string | null;
  if (r.severidad === 'ok') {
    textoHtml = `La fuente entrega <b>${num(margenV, 1, IDIOMA)}×</b> la tensión que el amplificador necesita para su potencia nominal — recorrido de volumen sano.`;
    avisoHtml = null;
  } else if (r.severidad === 'warn') {
    textoHtml = `La fuente entrega <b>${num(margenV, 1, IDIOMA)}×</b> de sobra la tensión que necesita el amplificador — se usa sólo una fracción baja del recorrido del potenciómetro. El sistema funciona, con menos resolución de volumen en el rango de escucha habitual.`;
    avisoHtml = null;
  } else {
    textoHtml = `La fuente entrega sólo <b>${num(margenV, 2, IDIOMA)}×</b> la tensión que el amplificador necesita para su potencia nominal — no alcanza. El margen que calculó la regla de potencia deja de ser válido con esta fuente conectada.`;
    avisoHtml = 'Conviene una fuente con mayor tensión de salida, o revisar si hay una etapa de preamplificación intermedia.';
  }

  return {
    sinDatos: false,
    verdictoClase: r.severidad,
    verdictoTexto: TEXTO_RECORRIDO[r.codigo],
    textoHtml,
    calcHtml,
    avisoHtml,
    avisoEsSinDatos: false,
    fuenteHtml: `<b>Umbral de recorrido:</b> ${UMBRAL_RECORRIDO}× — criterio del sitio, no una convención publicada; se verifica escuchando. <span class="conf">confianza ${fuente.confianza}</span>`,
  };
}
