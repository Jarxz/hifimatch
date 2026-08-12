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
export function calcularDisposicion(sala) {
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
