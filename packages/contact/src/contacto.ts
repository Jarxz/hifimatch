/**
 * Validación pura del formulario de contacto + handler con el envío de
 * email inyectado como dependencia — sin red, sin DOM. Un solo archivo a
 * propósito (antes eran dos: `validar.ts` + `manejar.ts`): Vercel compila
 * `/api/**` con su propio TypeScript, que no acepta imports relativos con
 * extensión `.ts` explícita (`allowImportingTsExtensions` no está
 * habilitado ahí) — pero esa extensión es justo lo que necesita `node
 * --test` para resolver imports relativos sin bundler (`CLAUDE.md`). Con
 * dos archivos, `manejar.ts` importando `./validar.ts` quedaba atrapado
 * entre esas dos exigencias contrapuestas: sin extensión, rompía `node
 * --test` (`ERR_MODULE_NOT_FOUND`, confirmado); con extensión, rompía el
 * build de la función en Vercel (confirmado en producción —
 * `FUNCTION_INVOCATION_FAILED` en cualquier request, incluso un `GET`).
 * Fusionar en un solo archivo elimina el import relativo interno entre
 * los dos — ya no hay ningún punto donde ambas exigencias choquen.
 * `api/contact.ts` es el único consumidor que importa este archivo SIN
 * extensión (es el único que no pasa por `node --test`).
 *
 * El motor de reglas de validación es el mismo de siempre: `codigo`, no
 * texto (`CLAUDE.md`); el diccionario de `apps/web/src/idioma/{es,en}.ts`
 * es quien redacta. Orden de chequeo, de menor a mayor costo de un falso
 * positivo: honeypot (un humano real nunca llena ese campo — si llegó
 * lleno, es un bot, se corta ahí sin mirar el resto) → tiempo mínimo
 * desde que se abrió el formulario (un bot completa y manda en
 * milisegundos; el umbral es corto a propósito — 2-3 s generarían falsos
 * positivos con autocompletado o gente que tipea rápido) → formato de
 * email → mensaje vacío → mensaje demasiado largo (tope de defensa, no
 * un límite de UX real).
 */

export type CodigoContacto = 'honeypot' | 'muy-rapido' | 'email-invalido' | 'mensaje-vacio' | 'mensaje-largo';

/** Umbral de "demasiado rápido" — ver comentario de cabecera. */
export const TIEMPO_MINIMO_MS = 1000;

/** Tope de longitud del mensaje — defensa contra payloads absurdos, no un
 * límite pensado para un mensaje humano real (que nunca lo alcanza). */
export const LARGO_MAXIMO_MENSAJE = 5000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EntradaContacto {
  nombre: string;
  email: string;
  mensaje: string;
  /** Campo honeypot — vacío para un humano, cualquier valor no vacío delata un bot. */
  honeypot: string;
  /** `Date.now()` al abrir el formulario. */
  cargadoEnMs: number;
  /** `Date.now()` al enviar. */
  enviadoEnMs: number;
}

export type ResultadoValidacion = { ok: true } | { ok: false; codigo: CodigoContacto };

export function validarContacto(e: EntradaContacto): ResultadoValidacion {
  if (e.honeypot.trim() !== '') return { ok: false, codigo: 'honeypot' };
  if (e.enviadoEnMs - e.cargadoEnMs < TIEMPO_MINIMO_MS) return { ok: false, codigo: 'muy-rapido' };
  if (!EMAIL_RE.test(e.email.trim())) return { ok: false, codigo: 'email-invalido' };
  if (e.mensaje.trim() === '') return { ok: false, codigo: 'mensaje-vacio' };
  if (e.mensaje.length > LARGO_MAXIMO_MENSAJE) return { ok: false, codigo: 'mensaje-largo' };
  return { ok: true };
}

export interface DatosEmail {
  nombre: string;
  email: string;
  mensaje: string;
}

export interface DependenciasContacto {
  enviarEmail(datos: DatosEmail): Promise<void>;
}

export type ResultadoContacto = { ok: true } | { ok: false; codigo: CodigoContacto | 'error-servidor' };

/**
 * El honeypot es el único caso que responde `{ ok: true }` aunque no se
 * haya enviado nada — nunca hay que confirmarle a un bot que fue
 * detectado, o adapta el script. Cualquier otro rechazo es un error real
 * (con su propio `codigo`) para que un humano que se equivocó lo sepa.
 */
export async function manejarContacto(entrada: EntradaContacto, deps: DependenciasContacto): Promise<ResultadoContacto> {
  const validacion = validarContacto(entrada);
  if (!validacion.ok) {
    if (validacion.codigo === 'honeypot') return { ok: true };
    return { ok: false, codigo: validacion.codigo };
  }

  try {
    await deps.enviarEmail({ nombre: entrada.nombre, email: entrada.email, mensaje: entrada.mensaje });
    return { ok: true };
  } catch (err) {
    console.error('contacto: fallo enviarEmail', err);
    return { ok: false, codigo: 'error-servidor' };
  }
}
