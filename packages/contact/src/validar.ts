/**
 * Validación pura del formulario de contacto — sin red, sin DOM. El motor
 * de reglas es el mismo de siempre: `codigo`, no texto (`CLAUDE.md`); el
 * diccionario de `apps/web/src/idioma/{es,en}.ts` es quien redacta.
 *
 * Orden de chequeo, de menor a mayor costo de un falso positivo:
 * honeypot (un humano real nunca llena ese campo — si llegó lleno, es un
 * bot, se corta ahí sin mirar el resto) → tiempo mínimo desde que se abrió
 * el formulario (un bot completa y manda en milisegundos; el umbral es
 * corto a propósito — 2-3 s generarían falsos positivos con
 * autocompletado o gente que tipea rápido) → formato de email → mensaje
 * vacío → mensaje demasiado largo (tope de defensa, no un límite de UX
 * real).
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
