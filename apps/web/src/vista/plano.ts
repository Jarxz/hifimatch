/**
 * Plano SVG de la sala — puro: (sala, disposición) → string. Ningún acceso
 * al DOM acá; pintar.ts es quien lo inyecta con innerHTML. Réplica del
 * buildPlan() del prototipo, pero leyendo los nombres de campo reales de
 * DisposicionSala (packages/engine/src/sala.ts) en vez de los alias planos
 * (cx, sep, xL, xR…) que el prototipo inventaba en su propio `room()`.
 *
 * Trampa a la que hay que prestar atención (documentada en el plan de
 * migración): las coordenadas del SVG (X/Y, viewBox, radios) usan siempre
 * `coord()` — punto ASCII, nunca localizado. Un `width="123,4"` es un
 * atributo inválido y el navegador lo descarta: el plano se rompería sólo
 * en español. Sólo los tres `<text>` de metros/distancia usan `num()`.
 */
import type { Sala, DisposicionSala } from '../../../../packages/engine/src/sala.ts';
import { coord, num } from '../formato/numeros.ts';
import { IDIOMA_PROVISIONAL as IDIOMA } from '../idioma-provisional.ts';

export function construirPlanoSvg(sala: Sala, disp: DisposicionSala): string {
  const scale = Math.min(460 / sala.anchoM, 380 / sala.largoM);
  const pad = 42;
  const Wp = sala.anchoM * scale;
  const Lp = sala.largoM * scale;
  const sw = Wp + pad * 2;
  const sh = Lp + pad * 2;

  const X = (x: number) => coord(pad + x * scale, 1);
  const Y = (y: number) => coord(pad + y * scale, 1);

  const cx = disp.centroXM;
  const spOff = disp.offsetFrenteM;
  const ly = disp.filaEscuchaM;
  const xL = disp.parlanteIzq.x;
  const xR = disp.parlanteDer.x;
  const rpy = disp.reflexionIzq.y;
  const dist = disp.distanciaEscuchaM;

  let s = `<svg viewBox="0 0 ${coord(sw, 0)} ${coord(sh, 0)}" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace,Menlo,Consolas,monospace">`;

  // sala
  s += `<rect x="${coord(pad, 0)}" y="${coord(pad, 0)}" width="${coord(Wp, 1)}" height="${coord(Lp, 1)}" fill="rgba(255,255,255,.015)" stroke="rgba(255,255,255,.22)" stroke-width="1"/>`;
  // muro frontal
  s += `<line x1="${coord(pad, 0)}" y1="${coord(pad, 0)}" x2="${coord(pad + Wp, 1)}" y2="${coord(pad, 0)}" stroke="rgba(255,255,255,.42)" stroke-width="2"/>`;
  s += `<text x="${X(cx)}" y="${coord(pad - 14, 0)}" fill="#6E6E75" font-size="10" letter-spacing="1.5" text-anchor="middle">MURO FRONTAL</text>`;
  // dimensiones
  s += `<text x="${X(cx)}" y="${coord(pad + Lp + 26, 1)}" fill="#8C8C93" font-size="11" text-anchor="middle">${num(sala.anchoM, 1, IDIOMA)} m</text>`;
  s += `<text x="${coord(pad - 14, 0)}" y="${Y(sala.largoM / 2)}" fill="#8C8C93" font-size="11" text-anchor="middle" transform="rotate(-90 ${coord(pad - 14, 0)} ${Y(sala.largoM / 2)})">${num(sala.largoM, 1, IDIOMA)} m</text>`;
  // triángulo de escucha
  s += `<line x1="${X(xL)}" y1="${Y(spOff)}" x2="${X(cx)}" y2="${Y(ly)}" stroke="rgba(255,255,255,.5)" stroke-width="1" stroke-dasharray="4 3"/>`;
  s += `<line x1="${X(xR)}" y1="${Y(spOff)}" x2="${X(cx)}" y2="${Y(ly)}" stroke="rgba(255,255,255,.5)" stroke-width="1" stroke-dasharray="4 3"/>`;
  // rayos de reflexión
  s += `<polyline points="${X(xL)},${Y(spOff)} ${X(0)},${Y(rpy)} ${X(cx)},${Y(ly)}" fill="none" stroke="rgba(199,173,124,.55)" stroke-width="1" stroke-dasharray="2 3"/>`;
  s += `<polyline points="${X(xR)},${Y(spOff)} ${X(sala.anchoM)},${Y(rpy)} ${X(cx)},${Y(ly)}" fill="none" stroke="rgba(199,173,124,.55)" stroke-width="1" stroke-dasharray="2 3"/>`;
  // puntos de reflexión
  s += `<circle cx="${X(0)}" cy="${Y(rpy)}" r="4" fill="none" stroke="#C7AD7C" stroke-width="1.3"/>`;
  s += `<circle cx="${X(sala.anchoM)}" cy="${Y(rpy)}" r="4" fill="none" stroke="#C7AD7C" stroke-width="1.3"/>`;
  s += `<text x="${coord(parseFloat(X(0)) + 8, 1)}" y="${coord(parseFloat(Y(rpy)) - 7, 1)}" fill="#C7AD7C" font-size="9">1ª refl.</text>`;
  // parlantes
  const parlanteSvg = (x: number): string => {
    const px = parseFloat(X(x));
    const py = parseFloat(Y(spOff));
    return `<rect x="${coord(px - 7, 1)}" y="${coord(py - 5, 1)}" width="14" height="10" rx="1.5" fill="#ECECEE"/>`;
  };
  s += parlanteSvg(xL) + parlanteSvg(xR);
  s += `<text x="${X(xL)}" y="${coord(parseFloat(Y(spOff)) - 11, 1)}" fill="#ECECEE" font-size="10" text-anchor="middle">L</text>`;
  s += `<text x="${X(xR)}" y="${coord(parseFloat(Y(spOff)) - 11, 1)}" fill="#ECECEE" font-size="10" text-anchor="middle">R</text>`;
  // punto dulce
  s += `<circle cx="${X(cx)}" cy="${Y(ly)}" r="${coord(0.45 * scale, 1)}" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1" stroke-dasharray="3 3"/>`;
  s += `<circle cx="${X(cx)}" cy="${Y(ly)}" r="4.5" fill="#ECECEE"/>`;
  s += `<text x="${X(cx)}" y="${coord(parseFloat(Y(ly)) + 20, 1)}" fill="#ECECEE" font-size="10" text-anchor="middle">punto dulce</text>`;
  // distancia de escucha
  const mx = (parseFloat(X(xR)) + parseFloat(X(cx))) / 2;
  const my = (parseFloat(Y(spOff)) + parseFloat(Y(ly))) / 2;
  s += `<text x="${coord(mx + 8, 1)}" y="${coord(my, 1)}" fill="#8C8C93" font-size="10">${num(dist, 1, IDIOMA)} m</text>`;

  s += '</svg>';
  return s;
}
