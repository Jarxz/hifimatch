/**
 * Regla de carga — ¿el amplificador tiene corriente para la caída de
 * impedancia del parlante? Distinta de la potencia (SPL): acá manda la
 * impedancia mínima. Fórmula y veredicto: docs/motor-mvp.md sección 3.
 */
/** Umbral de reserva de corriente: cuánto debe subir la potencia de 8 a 4 Ω
 * para contar como "casi la dobla". Declarado como supuesto del modelo. */
export const RATIO_RESERVA = 1.7;
/** Umbral de potencia bruta que por sí sola resuelve una carga dura,
 * incluso sin dato de reserva a 4 Ω. Declarado como supuesto del modelo. */
export const POTENCIA_RESUELVE_W = 60;
export function evaluarCarga(parlante, amplificador) {
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
