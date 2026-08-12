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
export const RATIO_BRIDGING_OK = 10;
/** A cuántas veces de sobra el recorrido del volumen se considera "corto":
 * no hay un número citable equivalente a RATIO_BRIDGING_OK para esto (ver
 * motor-mvp.md sección 6.2) — es una decisión de producto, fijada tras
 * preguntar en vez de inventarla. */
export const UMBRAL_RECORRIDO = 10;
export function evaluarPuenteImpedancias(fuente, amplificador) {
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
export function evaluarRecorridoVolumen(fuente, amplificador) {
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
