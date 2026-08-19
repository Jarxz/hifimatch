/**
 * Función serverless de Vercel — el único backend real del sitio. Se
 * construye por separado del `buildCommand` de `apps/web` (Vercel detecta
 * `/api/**` y lo compila aparte, con su propio TypeScript — ignora
 * `tsconfig.api.json`); por eso `npm run typecheck:api` (enganchado a
 * `verify`) es necesario para que una regresión acá también rompa el
 * deploy, igual que en los demás workspaces (`docs/despliegue.md`).
 *
 * El import de abajo hacia `packages/contact` va **sin** extensión `.ts`
 * a propósito — es el único import de todo el repo así, y no es un
 * descuido: el compilador de Vercel para `/api/**` no acepta imports
 * relativos con extensión `.ts` explícita (`allowImportingTsExtensions`
 * no está habilitado ahí), a diferencia de `node --test` en el resto del
 * repo, que sí la necesita. Confirmado en producción — con la extensión,
 * la función ni siquiera cargaba (`FUNCTION_INVOCATION_FAILED` en
 * cualquier request). Ver el comentario de cabecera de
 * `packages/contact/src/contacto.ts` para el detalle completo.
 *
 * Adaptador delgado: parsea el request, arma el `enviarEmail` real
 * (Resend) y delega toda la validación/lógica en `manejarContacto`
 * (`packages/contact`, testeado sin red). Sin CORS abierto a propósito —
 * el fetch es same-origin, agregar `Access-Control-Allow-Origin: *`
 * habilitaría que cualquier sitio de terceros use este endpoint.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { manejarContacto } from '../packages/contact/src/contacto';
import type { EntradaContacto } from '../packages/contact/src/contacto';

function comoTexto(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function comoNumero(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function parsearEntrada(body: unknown): EntradaContacto {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    nombre: comoTexto(b.nombre),
    email: comoTexto(b.email),
    mensaje: comoTexto(b.mensaje),
    honeypot: comoTexto(b.honeypot),
    cargadoEnMs: comoNumero(b.cargadoEnMs),
    enviadoEnMs: comoNumero(b.enviadoEnMs),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, codigo: 'metodo-invalido' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const destinatario = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !destinatario) {
    // Config faltante en el dashboard de Vercel, no un error del usuario —
    // se loguea el detalle real server-side, nunca se lo devuelve al cliente.
    console.error('api/contact: faltan las variables de entorno RESEND_API_KEY y/o CONTACT_TO_EMAIL');
    res.status(500).json({ ok: false, codigo: 'error-servidor' });
    return;
  }

  const resend = new Resend(apiKey);
  const entrada = parsearEntrada(req.body);

  const resultado = await manejarContacto(entrada, {
    enviarEmail: async (datos) => {
      const { error } = await resend.emails.send({
        from: process.env.CONTACT_FROM_EMAIL ?? 'The Hifi Match <onboarding@resend.dev>',
        to: destinatario,
        replyTo: datos.email,
        subject: `Contacto — ${datos.nombre.trim() || 'sin nombre'}`,
        text: datos.mensaje,
      });
      if (error) throw new Error(error.message);
    },
  });

  res.status(resultado.ok ? 200 : 400).json(resultado);
}
