/**
 * Detección de soporte de AR — mismo criterio que ya usa `enviarContacto`
 * en `main.ts` para `file://`: declarar la limitación antes de intentar
 * la acción, nunca fallar en silencio. `navigator` se recibe como
 * parámetro (nunca leído del global acá adentro) para que este módulo
 * sea testeable con `node --test` sin depender de qué globals define el
 * runtime de Node — los llamadores reales (`main.ts`, `entrada-ar.ts`)
 * pasan el `navigator` real del navegador.
 */
export interface NavigatorConXr {
  xr?: {
    isSessionSupported(modo: string): Promise<boolean>;
  };
}

/** Chequeo síncrono barato — usar ANTES de intentar cualquier navegación
 * a `ar.html`, para no abrir una pestaña/página muerta. */
export function tieneNavigatorXr(nav: NavigatorConXr | undefined): boolean {
  return typeof nav !== 'undefined' && typeof nav.xr !== 'undefined';
}

/** Chequeo autoritativo (async) — algunos navegadores rechazan la
 * promesa de `isSessionSupported` en vez de resolver `false`; se cubre
 * acá para que el llamador nunca tenga que manejar el rechazo. */
export async function soportaArInmersiva(nav: NavigatorConXr | undefined): Promise<boolean> {
  if (!tieneNavigatorXr(nav)) return false;
  try {
    return await nav!.xr!.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}

/**
 * ¿Es un iPhone/iPad/iPod? Puro — recibe el `userAgent` como string en
 * vez de leer `navigator.userAgent` directo, mismo criterio de
 * testabilidad que el resto del módulo. Sólo la mitad de la detección
 * de AR Quick Look — la otra mitad (`document.createElement('a').
 * relList.supports('ar')`) necesita DOM de verdad, así que vive inline
 * en cada llamador (`main.ts`, `entrada-ar.ts`) en vez de acá, para no
 * mezclar una función que sólo necesita un string con una que necesita
 * el navegador real.
 */
export function esUserAgentIOS(userAgent: string): boolean {
  return /iPad|iPhone|iPod/.test(userAgent);
}

/**
 * ¿Es una computadora de escritorio/laptop (no un teléfono ni una
 * tablet)? Heurística estándar (ausencia de los tokens de dispositivo
 * móvil más comunes en el user agent) — no hay una señal mejor sin pedir
 * permisos adicionales; Client Hints (`sec-ch-ua-mobile`) es un header
 * que llega al servidor, no una propiedad simple de leer del lado del
 * cliente. Puro, mismo criterio de testabilidad que `esUserAgentIOS`.
 * Uso real: "Ver en AR" sin soporte + esto en `true` → tiene sentido
 * ofrecer un código QR para escanear con el teléfono (main.ts); sin
 * soporte + esto en `false` (ej. un Android viejo sin ARCore) → un QR no
 * ayudaría, ese dispositivo YA es el teléfono.
 */
export function esDispositivoDeEscritorio(userAgent: string): boolean {
  return !/Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
}

/**
 * Interruptor de la función de Quick Look en iPhone — deshabilitada
 * después de probarla en hardware real: el usuario reportó que no
 * funcionaba bien, sin más detalle todavía sobre qué falló
 * específicamente (ver CLAUDE.md). Queda la implementación completa
 * (`escenaMalla.ts`, el panel `#ar-quicklook` de `ar.html`, el flujo de
 * `entrada-ar.ts`) sin usar, no borrada — por si se retoma más adelante
 * con un diagnóstico más preciso. `main.ts` (`tieneChanceDeQuickLook`)
 * y `entrada-ar.ts` (`soportaQuickLook`) chequean esto antes que nada,
 * así que un iPhone hoy cae siempre al mismo mensaje de "no disponible"
 * que antes de que existiera Quick Look en este sitio.
 */
export const QUICK_LOOK_HABILITADO = false;
