/**
 * Esquema de dominio — fuente de verdad. Espeja exactamente la forma de los
 * datos en data/equipos-seed.json y lo documentado en docs/motor-mvp.md
 * sección 1. Ningún equipo hardcodeado acá: sólo formas de datos.
 */
const ORDEN_CONFIANZA = { alta: 2, media: 1, baja: 0 };
/** La confianza más baja de las dadas — "el veredicto hereda la peor confianza
 * de los datos que usó" (motor-mvp.md, regla de potencia y de carga). */
export function peorConfianza(...confianzas) {
    if (confianzas.length === 0) {
        throw new Error('peorConfianza necesita al menos una confianza');
    }
    return confianzas.reduce((peor, actual) => ORDEN_CONFIANZA[actual] < ORDEN_CONFIANZA[peor] ? actual : peor);
}
