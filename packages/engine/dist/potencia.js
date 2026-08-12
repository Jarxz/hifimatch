/**
 * Regla de potencia — ¿el amplificador entrega el SPL de pico que la sala pide?
 * Fórmula, constantes y veredicto: docs/motor-mvp.md sección 2.
 */
import { atenuacionPorDistanciaDb, gananciaPorPotenciaDb } from "./unidades.js";
import { peorConfianza } from "./tipos.js";
/** SPL de pico objetivo en el punto de escucha, por nivel. */
export const PICO_OBJETIVO_DB = {
    moderado: 90,
    alto: 100,
    referencia: 105,
};
/** Constantes del modelo — supuestos declarados, no datos del equipo.
 * Se verifican midiendo; ver motor-mvp.md sección 2. */
export const SUMA_PAR_DB = 6;
export const GANANCIA_SALA_DB = 3;
export function evaluarPotencia(parlante, amplificador, distanciaM, nivel) {
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
