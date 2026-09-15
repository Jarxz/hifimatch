/**
 * Ícono lineal paramétrico por equipo — PURO, sin `document`. No es una
 * foto de producto (derechos del fabricante + el CSP del sitio sólo deja
 * `img-src 'self' data:`, ver CLAUDE.md) ni un ícono fijo por categoría:
 * es una plantilla base en SVG con variantes reales, derivadas de texto
 * que el catálogo YA tiene (`tipo`/`descripcion`, es curado) — nunca un
 * campo nuevo ni una foto por equipo.
 *
 * Las variantes se diseñaron mirando 5 fotos oficiales reales de equipos
 * ya catalogados (PSB Alpha P5, MartinLogan ElectroMotion ESL X, Anthem
 * MRX 740 8K, Rotel A14MKII, Eversolo DMP-A6 — descargadas sólo para
 * referencia visual local, nunca alojadas ni redistribuidas) para que las
 * proporciones no sean inventadas — ver CLAUDE.md para el detalle de cada
 * hallazgo.
 *
 * Trazo lineal simple, un solo color (`currentColor`, quien pinta decide
 * el color vía CSS), mismo viewBox cuadrado en las 4 categorías para que
 * el layout de la ficha no tenga que tratar cada una distinto.
 */

export type CategoriaEquipo = 'parlante' | 'amplificador' | 'streamer' | 'dac';

const VIEWBOX = '0 0 100 100';
const TRAZO = 2.2;

function envolverSvg(contenido: string): string {
  return `<svg viewBox="${VIEWBOX}" fill="none" stroke="currentColor" stroke-width="${TRAZO}" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${contenido}</svg>`;
}

function contieneAlguna(texto: string, palabras: readonly string[]): boolean {
  const t = texto.toLowerCase();
  return palabras.some((p) => t.includes(p));
}

/** "2 vías" → 2, "2,5 vías" → 2.5, "3 vías" → 3. Sin match (texto que no
 * declara vías, ej. un DAC/streamer) → 2, el caso más común del
 * catálogo — nunca null: siempre hay que dibujar algo. */
function contarVias(texto: string): number {
  const m = texto.match(/(\d+(?:,\d+)?)\s*v[ií]as/i);
  if (!m || !m[1]) return 2;
  return Number(m[1].replace(',', '.'));
}

function formaTweeter(cx: number, cy: number, texto: string): string {
  if (contieneAlguna(texto, ['cinta', 'amt', 'ribbon'])) {
    // Tweeter de cinta/AMT: rectángulo delgado vertical, no un círculo.
    return `<rect x="${cx - 2}" y="${cy - 6}" width="4" height="12" rx="1"/>`;
  }
  if (contieneAlguna(texto, ['bocina', 'horn'])) {
    // Tweeter de bocina: trapecio chico.
    return `<path d="M ${cx - 5} ${cy + 5} L ${cx - 2} ${cy - 5} L ${cx + 2} ${cy - 5} L ${cx + 5} ${cy + 5} Z"/>`;
  }
  // Domo — el caso más común (referencia PSB Alpha P5).
  return `<circle cx="${cx}" cy="${cy}" r="5"/>`;
}

/**
 * Parlante — base: caja rectangular con drivers circulares (o la
 * plantilla electrostática completa, que no tiene drivers en absoluto).
 * `columna` da una caja alta y angosta; `estantería`/`monitor`, una caja
 * más cuadrada (proporciones de la referencia PSB Alpha P5).
 */
function iconoParlante(texto: string): string {
  if (contieneAlguna(texto, ['electrostátic', 'electrostatic', 'híbrido electrostátic'])) {
    // Panel alto con textura de malla + franja sólida en la base — mismas
    // proporciones que la referencia MartinLogan ElectroMotion ESL X: sin
    // esto ningún círculo de driver tendría sentido.
    const lineas = [14, 22, 30, 38, 46, 54, 62, 70].map((y) => `<line x1="34" y1="${y}" x2="66" y2="${y}"/>`).join('');
    return envolverSvg(`<rect x="34" y="6" width="32" height="72" rx="2"/>${lineas}<rect x="34" y="78" width="32" height="16" rx="1"/>`);
  }

  const columna = contieneAlguna(texto, ['columna', 'floorstander', 'piso']);
  const caja = columna ? { x: 37, y: 3, w: 26, h: 94 } : { x: 27, y: 18, w: 46, h: 64 };
  const cx = caja.x + caja.w / 2;

  const vias = contarVias(texto);
  const drivers: string[] = [];
  const top = caja.y + 14;
  const bottom = caja.y + caja.h - 14;
  drivers.push(formaTweeter(cx, top, texto));
  if (vias >= 3) {
    // 3 vías: tweeter + medio + woofer.
    drivers.push(`<circle cx="${cx}" cy="${(top + bottom) / 2}" r="7"/>`);
    drivers.push(`<circle cx="${cx}" cy="${bottom}" r="10"/>`);
  } else if (vias >= 2.5) {
    // 2,5 vías: tweeter + dos woofers apilados (configuración común).
    const medio = top + (bottom - top) * 0.4;
    drivers.push(`<circle cx="${cx}" cy="${medio}" r="9"/>`);
    drivers.push(`<circle cx="${cx}" cy="${bottom}" r="9"/>`);
  } else {
    // 2 vías: tweeter + un woofer grande — referencia PSB Alpha P5.
    drivers.push(`<circle cx="${cx}" cy="${(top + bottom) / 2 + 6}" r="13"/>`);
  }

  return envolverSvg(`<rect x="${caja.x}" y="${caja.y}" width="${caja.w}" height="${caja.h}" rx="2"/>${drivers.join('')}`);
}

/**
 * Amplificador — base: fascia rectangular ancha con patas. `válvula`/
 * `tubo`/SET agrega la silueta de válvulas sobresaliendo arriba; un
 * receptor AV ensancha la fascia y agrega pantalla grande (referencia
 * Anthem MRX 740 8K); "sin previo" (ampli de potencia puro) se queda
 * minimalista, sin perilla ni display.
 */
function iconoAmplificador(texto: string): string {
  const patas = `<line x1="30" y1="82" x2="30" y2="86"/><line x1="70" y1="82" x2="70" y2="86"/>`;

  if (contieneAlguna(texto, ['válvula', 'valvula', 'tubo', 'set (', 'clase a pura'])) {
    const tubos = [38, 50, 62]
      .map((cx) => `<line x1="${cx}" y1="26" x2="${cx}" y2="12"/><ellipse cx="${cx}" cy="12" rx="4" ry="2.5"/>`)
      .join('');
    return envolverSvg(`<rect x="16" y="26" width="68" height="54" rx="2"/>${tubos}${patas}`);
  }

  if (contieneAlguna(texto, ['receptor', 'multicanal', ' av ', 'a/v'])) {
    return envolverSvg(
      `<rect x="8" y="30" width="84" height="46" rx="2"/>` +
        `<rect x="14" y="38" width="34" height="26" rx="1"/>` + // pantalla grande
        `<circle cx="72" cy="51" r="9"/>` + // perilla
        `<circle cx="58" cy="70" r="1.6"/><circle cx="64" cy="70" r="1.6"/><circle cx="82" cy="70" r="1.6"/>` + // botones
        patas
    );
  }

  if (contieneAlguna(texto, ['sin previo', 'potencia pur', 'power amplifier'])) {
    // Ampli de potencia puro: fascia minimalista, sin perilla ni display.
    return envolverSvg(`<rect x="14" y="32" width="72" height="42" rx="2"/><circle cx="24" cy="53" r="1.8"/>${patas}`);
  }

  // Integrado común — referencia Rotel A14MKII: tira de display delgada +
  // perilla + fila de botones.
  return envolverSvg(
    `<rect x="12" y="30" width="76" height="44" rx="2"/>` +
      `<rect x="18" y="38" width="30" height="10" rx="1"/>` +
      `<circle cx="74" cy="52" r="10"/>` +
      `<circle cx="56" cy="60" r="1.5"/><circle cx="62" cy="60" r="1.5"/><circle cx="68" cy="60" r="1.5"/>` +
      patas
  );
}

/**
 * Streamer/DAC — base: caja baja y ancha. Mención de pantalla agrega un
 * rectángulo grande ocupando ~60% del frente (referencia Eversolo
 * DMP-A6) + perilla; el caso por defecto (la mayoría de los DACs) queda
 * minimalista, con sólo un LED chico.
 */
function iconoFuente(texto: string, variableConocidaConPerilla: boolean): string {
  if (contieneAlguna(texto, ['pantalla', 'touchscreen', 'display a color'])) {
    return envolverSvg(
      `<rect x="10" y="34" width="80" height="34" rx="2"/>` +
        `<rect x="16" y="40" width="46" height="22" rx="1"/>` + // pantalla grande
        `<circle cx="78" cy="51" r="9"/>` // perilla
    );
  }

  const perilla = variableConocidaConPerilla ? `<circle cx="72" cy="51" r="7"/>` : '';
  return envolverSvg(`<rect x="10" y="36" width="80" height="30" rx="2"/><circle cx="20" cy="51" r="2" fill="currentColor" stroke="none"/>${perilla}`);
}

/**
 * `tipoEs`/`descripcionEs`: texto ya curado del catálogo en español (el
 * campo `es` de `Localizado`) — el buscador de palabras clave corre
 * siempre sobre ese idioma, nunca sobre datos del usuario ni sobre el
 * inglés (evita mantener dos listas de palabras clave).
 */
export function iconoEquipoSvg(categoria: CategoriaEquipo, tipoEs: string, descripcionEs: string): string {
  const texto = `${tipoEs} ${descripcionEs}`.toLowerCase();
  switch (categoria) {
    case 'parlante':
      return iconoParlante(texto);
    case 'amplificador':
      return iconoAmplificador(texto);
    case 'streamer':
    case 'dac':
      // Salida variable (funciona como preamplificador digital) suele
      // venir mencionada como tal en la descripción — cuando la fuente
      // tiene perilla real de volumen, vale la pena dibujarla incluso
      // sin pantalla.
      return iconoFuente(texto, contieneAlguna(texto, ['variable', 'preamplificador digital']));
  }
}
