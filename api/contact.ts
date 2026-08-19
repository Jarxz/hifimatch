/**
 * Función serverless de Vercel — el único backend real del sitio. Se
 * construye por separado del `buildCommand` de `apps/web` (Vercel detecta
 * `/api/**` y lo compila aparte, con su propio TypeScript — ignora
 * `tsconfig.api.json`); por eso `npm run typecheck:api` (enganchado a
 * `verify`) es necesario para que una regresión acá también rompa el
 * deploy, igual que en los demás workspaces (`docs/despliegue.md`).
 *
 * El import de abajo hacia `packages/contact` lleva extensión **`.js`**
 * (no `.ts`, aunque el archivo fuente es `.ts`) — tercera vuelta sobre
 * el mismo punto, cada una con una causa distinta, documentadas las tres
 * porque el patrón se repite: `api/package.json` (ver más abajo) declara
 * `"type":"module"`, y en cuanto Vercel ve un `package.json` ESM cambia
 * su resolución de módulos a `node16`/`nodenext` — que **exige** la
 * extensión `.js` en imports relativos (apuntando al nombre del archivo
 * ya compilado, no al `.ts` fuente; es la convención estándar de
 * TypeScript bajo esa resolución). Antes de tener `api/package.json`,
 * ese mismo compilador rechazaba `.ts` con `TS5097` (`.ts` no permitida
 * sin `allowImportingTsExtensions`); ahora, sin extensión, rechaza con
 * `TS2835` (`.js` requerida bajo `node16`/`nodenext`). `.js` es la única
 * forma que funciona en los dos momentos.
 *
 * `api/package.json` (`{"type":"module"}`) es necesario por una razón
 * distinta y anterior a la de arriba: `packages/contact/package.json`
 * declara `"type":"module"` (como todo el resto del repo), así que
 * Vercel compila `contacto.ts` a un `.js` con `export`/`import` real.
 * Sin un `package.json` propio en `/api`, este archivo hereda el `type`
 * del `package.json` de la raíz — que no lo declara, por default
 * CommonJS — y el resultado compilado usaba `require()` para importar un
 * módulo ESM, algo que Node rechaza en tiempo de ejecución
 * (`ERR_REQUIRE_ESM`, confirmado en los logs de runtime de Vercel — un
 * bug totalmente independiente del de la extensión, con el mismo
 * síntoma visible, `FUNCTION_INVOCATION_FAILED`). Con `api/package.json`
 * declarando `type:module`, Vercel compila este archivo también a ESM
 * real — mismo formato en los dos lados del import, sin mezcla
 * `require`/`import` — pero ESM es justo lo que activa la exigencia de
 * `.js` del párrafo de arriba, así que corregir este bug reabrió aquel.
 *
 * Adaptador delgado: parsea el request, arma el `enviarEmail` real
 * (Resend) y delega toda la validación/lógica en `manejarContacto`
 * (`packages/contact`, testeado sin red). Sin CORS abierto a propósito —
 * el fetch es same-origin, agregar `Access-Control-Allow-Origin: *`
 * habilitaría que cualquier sitio de terceros use este endpoint.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { manejarContacto } from '../packages/contact/src/contacto.js';
import type { EntradaContacto } from '../packages/contact/src/contacto.js';

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
