// GENERADO por packages/engine/scripts/bundle-navegador.mjs — no editar a mano.
// Fuente real: packages/engine/src/*.ts. Regenerar con `npm run build`.
(function () {
  'use strict';

  // ---- unidades.js ----
/**
 * Conversiones de unidad puras — sin estado, sin I/O, sin dependencias.
 * Cada función corresponde a un término de las fórmulas de docs/motor-mvp.md.
 * Vectores de prueba en unidades.test.ts, tomados de la aritmética intermedia
 * ya verificada en motor-mvp.md sección 2 (vectores A/B/C de potencia).
 */
/** Atenuación por distancia, en dB. Término "− 20·log₁₀(distanciaM)" de la fórmula de potencia. */
function atenuacionPorDistanciaDb(distanciaM) {
    return 20 * Math.log10(distanciaM);
}
/** Ganancia por potencia del amplificador, en dB, referida a 1 W. Término "+ 10·log₁₀(potenciaW)". */
function gananciaPorPotenciaDb(potenciaW) {
    return 10 * Math.log10(potenciaW);
}
/**
 * Suma de niveles en dB en el dominio de potencia (incoherente): 10·log₁₀(Σ 10^(Lᵢ/10)).
 * Distinto del supuesto SUMA_PAR=6dB de potencia.ts, que es una constante de modelo
 * declarada para un par coherente (correlacionado) en el punto de escucha — no el
 * resultado de esta función. No confundir ambos.
 */
function sumarNivelesDb(nivelesDb) {
    const sumaLineal = nivelesDb.reduce((acc, db) => acc + Math.pow(10, db / 10), 0);
    return 10 * Math.log10(sumaLineal);
}
/**
 * Convierte una sensibilidad medida a 2,83V/1m a su equivalente "a 1W/1m".
 * 2,83V sólo equivale a 1W cuando la impedancia es 8Ω (2,83² / 8 ≈ 1). Para otras
 * impedancias, 2,83V entrega más o menos de 1W, y ambas convenciones divergen —
 * la confusión que docs/CLAUDE.md marca como "la fuente de error más común del dominio".
 */
function sensibilidadA1WDb(sensibilidad283VDb, impedanciaOhm) {
    const potenciaRealA283VW = (2.83 * 2.83) / impedanciaOhm;
    return sensibilidad283VDb - 10 * Math.log10(potenciaRealA283VW);
}

  // ---- tipos.js ----
/**
 * Esquema de dominio — fuente de verdad. Espeja exactamente la forma de los
 * datos en data/equipos-seed.json y lo documentado en docs/motor-mvp.md
 * sección 1. Ningún equipo hardcodeado acá: sólo formas de datos.
 */
const ORDEN_CONFIANZA = { alta: 2, media: 1, baja: 0 };
/** La confianza más baja de las dadas — "el veredicto hereda la peor confianza
 * de los datos que usó" (motor-mvp.md, regla de potencia y de carga). */
function peorConfianza(...confianzas) {
    if (confianzas.length === 0) {
        throw new Error('peorConfianza necesita al menos una confianza');
    }
    return confianzas.reduce((peor, actual) => ORDEN_CONFIANZA[actual] < ORDEN_CONFIANZA[peor] ? actual : peor);
}

  // ---- carga.js ----
/**
 * Regla de carga — ¿el amplificador tiene corriente para la caída de
 * impedancia del parlante? Distinta de la potencia (SPL): acá manda la
 * impedancia mínima. Fórmula y veredicto: docs/motor-mvp.md sección 3.
 */
/** Umbral de reserva de corriente: cuánto debe subir la potencia de 8 a 4 Ω
 * para contar como "casi la dobla". Declarado como supuesto del modelo. */
const RATIO_RESERVA = 1.7;
/** Umbral de potencia bruta que por sí sola resuelve una carga dura,
 * incluso sin dato de reserva a 4 Ω. Declarado como supuesto del modelo. */
const POTENCIA_RESUELVE_W = 60;
function evaluarCarga(parlante, amplificador) {
    if (parlante.impedanciaMinOhm === null) {
        return {
            severidad: 'sin-datos',
            etiqueta: 'Sin dato',
            dura: null,
            reserva: null,
            potente: null,
        };
    }
    const dura = parlante.impedanciaMinOhm <= 4;
    const reserva = amplificador.potencia4OhmW !== null &&
        amplificador.potencia4OhmW.valor / amplificador.potencia8OhmW.valor >= RATIO_RESERVA;
    const potente = amplificador.potencia8OhmW.valor >= POTENCIA_RESUELVE_W;
    const resuelta = reserva || potente;
    if (dura && !resuelta) {
        return { severidad: 'warn', etiqueta: 'Exige corriente', dura, reserva, potente };
    }
    if (dura && resuelta) {
        return { severidad: 'ok', etiqueta: 'Cubierto', dura, reserva, potente };
    }
    return { severidad: 'ok', etiqueta: 'Carga benigna', dura, reserva, potente };
}

  // ---- sala.js ----
/**
 * Geometría de sala — disposición simétrica, distancia de escucha y primeras
 * reflexiones, desde una sala rectangular rígida. Fórmula y vector de prueba:
 * docs/motor-mvp.md sección 4.
 *
 * Disciplina (ya declarada en el doc): esto predice desde una sala rígida y
 * se equivoca fácil. No es una regla de compatibilidad con severidad — es
 * disposición de referencia, que se afina midiendo.
 */
function clamp(lo, v, hi) {
    return Math.max(lo, Math.min(v, hi));
}
function calcularDisposicion(sala) {
    const { anchoM: W, largoM: L, altoM: H } = sala;
    const centroXM = W / 2;
    const separacionM = clamp(1.5, 0.55 * W, Math.min(3.0, W - 1.0));
    const offsetFrenteM = clamp(0.5, 0.15 * L, 1.2);
    const filaEscuchaM = clamp(offsetFrenteM + 1.0, offsetFrenteM + separacionM * 1.2, L - 0.6);
    const xL = centroXM - separacionM / 2;
    const xR = centroXM + separacionM / 2;
    const distanciaEscuchaM = Math.sqrt((separacionM / 2) ** 2 + (filaEscuchaM - offsetFrenteM) ** 2);
    // Primer punto de reflexión en los muros laterales (método de la imagen espejo).
    const t = xL / (xL + centroXM);
    const rpy = offsetFrenteM + t * (filaEscuchaM - offsetFrenteM);
    return {
        centroXM,
        separacionM,
        offsetFrenteM,
        filaEscuchaM,
        parlanteIzq: { x: xL, y: offsetFrenteM },
        parlanteDer: { x: xR, y: offsetFrenteM },
        puntoDulce: { x: centroXM, y: filaEscuchaM },
        distanciaEscuchaM,
        reflexionIzq: { x: 0, y: rpy },
        reflexionDer: { x: W, y: rpy },
        volumenM3: W * L * H,
    };
}

  // ---- ganancia.js ----
/**
 * Ganancia de cadena / puente de impedancias fuente→amplificador — regla
 * opcional: sólo corre si el usuario agrega una fuente (streamer o DAC) a la
 * cadena. No reemplaza ni condiciona potencia.ts/carga.ts, que siguen
 * funcionando igual con o sin fuente declarada. Dos preguntas físicamente
 * distintas, dos funciones. Fórmulas, constantes y veredictos:
 * docs/motor-mvp.md sección 6.
 */
/** Convención estándar de "voltage bridging" en audio profesional (Rane
 * "Sound System Interconnection"; Bill Whitlock / Jensen Transformers): la
 * entrada debe tener al menos 10× la impedancia de salida de la fuente para
 * que la pérdida de nivel sea despreciable (<1 dB). Declarado como supuesto
 * del modelo, no dato del equipo. */
const RATIO_BRIDGING_OK = 10;
/** A cuántas veces de sobra el recorrido del volumen se considera "corto":
 * no hay un número citable equivalente a RATIO_BRIDGING_OK para esto (ver
 * motor-mvp.md sección 6.2) — es una decisión de producto, fijada tras
 * preguntar en vez de inventarla. */
const UMBRAL_RECORRIDO = 10;
function evaluarPuenteImpedancias(fuente, amplificador) {
    if (fuente.impedanciaSalidaOhm === null || amplificador.impedanciaEntradaOhm === null) {
        return { severidad: 'sin-datos', etiqueta: 'Sin dato', ratioZ: null };
    }
    const ratioZ = amplificador.impedanciaEntradaOhm / fuente.impedanciaSalidaOhm;
    if (ratioZ >= RATIO_BRIDGING_OK) {
        return { severidad: 'ok', etiqueta: 'Puente correcto', ratioZ };
    }
    if (ratioZ >= 1) {
        return { severidad: 'warn', etiqueta: 'Puente ajustado', ratioZ };
    }
    return { severidad: 'alert', etiqueta: 'Puente insuficiente', ratioZ };
}
function evaluarRecorridoVolumen(fuente, amplificador) {
    if (fuente.salidaV === null || amplificador.sensEntradaMv === null) {
        return { severidad: 'sin-datos', etiqueta: 'Sin dato', margenV: null };
    }
    const margenV = fuente.salidaV / (amplificador.sensEntradaMv / 1000);
    if (margenV < 1) {
        return { severidad: 'alert', etiqueta: 'Insuficiente', margenV };
    }
    if (margenV <= UMBRAL_RECORRIDO) {
        return { severidad: 'ok', etiqueta: 'Recorrido de volumen sano', margenV };
    }
    return { severidad: 'warn', etiqueta: 'Recorrido corto', margenV };
}

  // ---- potencia.js ----
/**
 * Regla de potencia — ¿el amplificador entrega el SPL de pico que la sala pide?
 * Fórmula, constantes y veredicto: docs/motor-mvp.md sección 2.
 */


/** SPL de pico objetivo en el punto de escucha, por nivel. */
const PICO_OBJETIVO_DB = {
    moderado: 90,
    alto: 100,
    referencia: 105,
};
/** Constantes del modelo — supuestos declarados, no datos del equipo.
 * Se verifican midiendo; ver motor-mvp.md sección 2. */
const SUMA_PAR_DB = 6;
const GANANCIA_SALA_DB = 3;
function evaluarPotencia(parlante, amplificador, distanciaM, nivel) {
    const splDisponibleDb = parlante.sensibilidadDb.valor -
        atenuacionPorDistanciaDb(distanciaM) +
        gananciaPorPotenciaDb(amplificador.potencia8OhmW.valor) +
        SUMA_PAR_DB +
        GANANCIA_SALA_DB;
    const margenDb = splDisponibleDb - PICO_OBJETIVO_DB[nivel];
    let severidad;
    let etiqueta;
    if (margenDb >= 3) {
        severidad = 'ok';
        etiqueta = 'Con margen';
    }
    else if (margenDb >= 0) {
        severidad = 'warn';
        etiqueta = 'Justo';
    }
    else {
        severidad = 'alert';
        etiqueta = 'Insuficiente';
    }
    const avisos = [];
    if (parlante.potenciaRecMinW !== null &&
        amplificador.potencia8OhmW.valor < parlante.potenciaRecMinW) {
        avisos.push(`El fabricante recomienda desde ${parlante.potenciaRecMinW} W para este parlante; ` +
            `el amplificador entrega ${amplificador.potencia8OhmW.valor} W.`);
    }
    const confianza = peorConfianza(parlante.sensibilidadDb.confianza, amplificador.potencia8OhmW.confianza);
    return { splDisponibleDb, margenDb, severidad, etiqueta, confianza, avisos };
}

  window.CadenaEngine = { evaluarPotencia, evaluarCarga, calcularDisposicion, evaluarPuenteImpedancias, evaluarRecorridoVolumen, RATIO_BRIDGING_OK, UMBRAL_RECORRIDO };
})();
