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
