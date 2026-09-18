/**
 * Validación pura del muro de mensajes públicos + orquestación con el
 * guardado/listado inyectados como dependencia — sin red, sin DOM. Un
 * solo archivo a propósito, mismo motivo documentado en
 * `packages/contact/src/contacto.ts`: Vercel compila `/api/**` con su
 * propio TypeScript, que no acepta imports relativos con extensión
 * `.ts` explícita — pero esa extensión es justo lo que necesita `node
 * --test` para resolver imports relativos sin bundler. Un solo archivo
 * elimina cualquier import relativo interno, así nunca hay un punto
 * donde esas dos exigencias choquen. `api/mensajes.ts` es el único
 * consumidor que importa este archivo SIN extensión.
 *
 * Diferencia central con `packages/contact`: ahí el mensaje viaja a UN
 * email privado, leído una sola vez — acá el nombre y el mensaje se
 * muestran a **cualquier visitante del sitio**, para siempre (hasta que
 * alguien lo borre a mano de la base). Eso cambia qué es "seguro":
 * - El riesgo real no es inyección de cabeceras de email (no hay
 *   ningún email de por medio en lo que se muestra), es **XSS** — HTML/
 *   script en un nombre o mensaje que se ejecute en el navegador de
 *   otro visitante. La defensa vive en `apps/web/src/vista/mensajes.ts`
 *   (`escapeHtml()` obligatorio antes de cualquier interpolación), no
 *   acá — este módulo sólo valida/sanea texto, nunca genera HTML.
 * - El email SÍ viaja hasta acá (para poder responder si hiciera
 *   falta), pero el tipo `MensajePublico` — lo único que sale hacia el
 *   cliente — ni siquiera tiene el campo `email` en su forma. Ver
 *   `aMensajePublico()` más abajo: es una lista explícita de campos,
 *   nunca un spread del objeto guardado completo.
 */

export type CodigoMensaje = 'honeypot' | 'muy-rapido' | 'email-invalido' | 'mensaje-vacio' | 'mensaje-largo';

/** Umbral de "demasiado rápido" — mismo criterio y mismo valor que
 * `packages/contact` (un bot completa y manda en milisegundos; 2-3 s
 * generarían falsos positivos con gente que tipea rápido). */
export const TIEMPO_MINIMO_MS = 1000;

/** Tope de longitud del mensaje — **más chico que el de Contacto**
 * (5000). Ahí el tope es pura defensa contra payloads absurdos, porque
 * el mensaje es privado y se lee una sola vez. Acá un mensaje kilométrico
 * también es un problema de UX real: queda visible para siempre en una
 * página pública que cualquiera lee. */
export const LARGO_MAXIMO_MENSAJE = 1000;

/** Tope de longitud del nombre — más chico que el de Contacto (200, que
 * existía para no romper un `Subject:` de email; acá no hay ningún
 * email de por medio en lo que se muestra). */
export const LARGO_MAXIMO_NOMBRE = 100;

/**
 * A diferencia de `sanearNombre()` en `packages/contact` (que existe
 * para evitar inyección de cabeceras de email), acá la razón es otra:
 * un nombre con saltos de línea reales rompería visualmente la fila de
 * cada mensaje en el muro público. Se quitan igual, por una razón
 * distinta a la de Contacto — no copiar el comentario sin ajustarlo.
 */
function sanearNombre(nombre: string): string {
  return nombre.replace(/[\r\n]+/g, ' ').trim().slice(0, LARGO_MAXIMO_NOMBRE);
}

/** A diferencia del nombre, los saltos de línea REALES dentro del
 * cuerpo del mensaje se conservan a propósito — un mensaje de varias
 * líneas es normal y deseable en un muro de mensajes. Se renderizan de
 * forma segura después (`vista/mensajes.ts`: escapar primero, recién
 * después convertir a `<br>`). */
function sanearMensaje(mensaje: string): string {
  return mensaje.trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EntradaMensaje {
  nombre: string;
  email: string;
  mensaje: string;
  /** Campo honeypot — vacío para un humano, cualquier valor no vacío delata un bot. */
  honeypot: string;
  /** `Date.now()` al entrar a la pantalla de Mensajes. */
  cargadoEnMs: number;
  /** `Date.now()` al enviar. */
  enviadoEnMs: number;
}

export type ResultadoValidacion = { ok: true } | { ok: false; codigo: CodigoMensaje };

/** Mismo orden que `validarContacto` (de menor a mayor costo de un
 * falso positivo): honeypot → tiempo mínimo → email → mensaje vacío →
 * mensaje demasiado largo. */
export function validarMensaje(e: EntradaMensaje): ResultadoValidacion {
  if (e.honeypot.trim() !== '') return { ok: false, codigo: 'honeypot' };
  if (e.enviadoEnMs - e.cargadoEnMs < TIEMPO_MINIMO_MS) return { ok: false, codigo: 'muy-rapido' };
  if (!EMAIL_RE.test(e.email.trim())) return { ok: false, codigo: 'email-invalido' };
  if (e.mensaje.trim() === '') return { ok: false, codigo: 'mensaje-vacio' };
  if (e.mensaje.length > LARGO_MAXIMO_MENSAJE) return { ok: false, codigo: 'mensaje-largo' };
  return { ok: true };
}

// ── Guardado ────────────────────────────────────────────────────────

export interface DatosMensaje {
  nombre: string;
  email: string;
  mensaje: string;
}

export type ResultadoGuardado = { ok: true; id: string } | { ok: false; codigo: 'limite-alcanzado' };

export interface DependenciasGuardado {
  guardarMensaje(datos: DatosMensaje): Promise<ResultadoGuardado>;
}

export type ResultadoMensaje = { ok: true } | { ok: false; codigo: CodigoMensaje | 'limite-alcanzado' | 'error-servidor' };

/**
 * El honeypot es el único caso que responde `{ ok: true }` aunque no se
 * haya guardado nada — nunca hay que confirmarle a un bot que fue
 * detectado. Cualquier otro rechazo es un código real para que un
 * humano que se equivocó lo sepa. Mismo criterio que `manejarContacto`.
 */
export async function manejarMensaje(entrada: EntradaMensaje, deps: DependenciasGuardado): Promise<ResultadoMensaje> {
  const validacion = validarMensaje(entrada);
  if (!validacion.ok) {
    if (validacion.codigo === 'honeypot') return { ok: true };
    return { ok: false, codigo: validacion.codigo };
  }

  try {
    const resultado = await deps.guardarMensaje({
      nombre: sanearNombre(entrada.nombre),
      email: entrada.email.trim(),
      mensaje: sanearMensaje(entrada.mensaje),
    });
    if (!resultado.ok) return { ok: false, codigo: resultado.codigo };
    return { ok: true };
  } catch (err) {
    console.error('mensajes: fallo guardarMensaje', err);
    return { ok: false, codigo: 'error-servidor' };
  }
}

// ── Listado ─────────────────────────────────────────────────────────

/** Cuántos mensajes se muestran a un visitante — separado del tope de
 * almacenamiento (`api/mensajes.ts` guarda hasta 500, acá sólo se
 * exponen los últimos 50). */
export const LIMITE_MENSAJES_MOSTRADOS = 50;

/** Lo que efectivamente se guarda — incluye `email`, nunca sale de acá tal cual. */
export interface MensajeAlmacenado {
  id: string;
  nombre: string;
  email: string;
  mensaje: string;
  creadoEnMs: number;
}

/** Lo que un visitante puede ver — **sin el campo `email` en absoluto**,
 * no sólo "vacío". Es el tipo, no un valor, el que hace la promesa de
 * privacidad. */
export interface MensajePublico {
  id: string;
  nombre: string;
  mensaje: string;
  creadoEnMs: number;
}

/**
 * La línea más sensible en privacidad de todo este feature: una lista
 * EXPLÍCITA de campos, nunca un spread (`{...m}`) — un spread filtraría
 * `email` en el momento en que alguien agregue un campo nuevo a
 * `MensajeAlmacenado` sin darse cuenta de que este filtro existe.
 */
export function aMensajePublico(m: MensajeAlmacenado): MensajePublico {
  return { id: m.id, nombre: m.nombre, mensaje: m.mensaje, creadoEnMs: m.creadoEnMs };
}

export interface DependenciasListado {
  obtenerMensajes(limite: number): Promise<MensajeAlmacenado[]>;
}

export async function listarMensajesPublicos(deps: DependenciasListado): Promise<MensajePublico[]> {
  const mensajes = await deps.obtenerMensajes(LIMITE_MENSAJES_MOSTRADOS);
  return mensajes.map(aMensajePublico);
}
