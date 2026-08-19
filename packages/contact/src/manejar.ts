/**
 * Handler de contacto, con el envío de email inyectado como dependencia —
 * así se puede testear el flujo completo (qué códigos produce cada
 * entrada, cuándo SÍ y cuándo NO se llama a `enviarEmail`) con
 * `node --test`, sin red ni credenciales. `api/contact.ts` es el único
 * lugar que arma el `enviarEmail` real (llamada a Resend).
 */
import { validarContacto } from './validar.ts';
import type { EntradaContacto, CodigoContacto } from './validar.ts';

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
