/**
 * Código QR — PURO, sin `document`. Usa `qrcode-generator` (MIT, cero
 * dependencias de runtime, ESM — mismo criterio de elección que ya se
 * aplicó con `fuse.js` para la búsqueda local) en vez de escribir el
 * algoritmo de corrección de errores Reed-Solomon a mano. Se bundlea en
 * el build único (`vite-plugin-singlefile`), nunca se carga desde un CDN
 * externo — la CSP del sitio (`script-src`/`connect-src 'self'`) ya
 * prohíbe justamente eso.
 *
 * Uso real: "Ver en AR" desde una computadora (sin cámara ni WebXR)
 * genera el QR de la URL real de `ar.html?<estado>` para que se escanee
 * con el teléfono — la única función de esta ronda que necesita esto.
 */
import qrcode from 'qrcode-generator';

/**
 * SVG completo (string) de un código QR para `texto`. Nivel de
 * corrección de errores 'M' (15%, el default recomendado para uso
 * general — no hay razón para exigir más en una URL que se escanea de
 * una pantalla, no se imprime ni se ensucia). Tipo de versión 0
 * (automático: la librería elige el tamaño mínimo que entra el
 * contenido, en vez de un tamaño fijo que podría quedar corto para una
 * URL larga). `scalable:true` usa un `viewBox` en vez de ancho/alto
 * fijos en píxeles, para poder escalarlo por CSS sin verse pixelado —
 * mismo criterio de "responsive" que el resto del sitio.
 */
export function generarQrSvg(texto: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(texto);
  qr.make();
  return qr.createSvgTag({ scalable: true });
}
