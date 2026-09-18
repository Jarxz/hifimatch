/**
 * Función serverless de Vercel — tercer backend real del sitio (después
 * de api/contact.ts y api/buscar-equipo.ts), mismo patrón: adaptador
 * delgado, `.js` en cada import relativo hacia `packages/**` (Vercel
 * compila `/api/**` con resolución `node16`/`nodenext` en cuanto ve
 * `api/package.json` con `type:module` — exige `.js` apuntando al
 * nombre ya compilado, no al `.ts` fuente; tres bugs de producción ya
 * documentados en `packages/contact/src/contacto.ts` y
 * `api/contact.ts` por esto mismo).
 *
 * A diferencia de los otros dos, éste sirve GET (lista pública) y POST
 * (publicar) en el mismo handler — es el primer endpoint del sitio que
 * hace las dos cosas. Ambos ramales sólo necesitan
 * UPSTASH_REDIS_REST_URL/TOKEN — no hay ningún proveedor externo de
 * pago involucrado (a diferencia de buscar-equipo.ts).
 *
 * Namespace de claves de Redis PROPIO (`rl:mensajes:*`, `mensajes:muro`)
 * — nunca se reusan `rl:ip:*`/`rl:global:*`, que ya son del cupo de
 * búsqueda de equipos (api/buscar-equipo.ts). Comparten la misma
 * instancia de Redis; reusar esas claves mezclaría los dos contadores.
 *
 * Sin CORS abierto, mismo motivo que los otros dos endpoints: el fetch
 * del sitio es same-origin (`connect-src 'self'` en la CSP ya alcanza).
 *
 * Este es el primer endpoint del sitio que guarda contenido público
 * generado por usuarios — sin panel de moderación esta ronda (pedido
 * explícito). Runbook de borrado manual, si hiciera falta quitar un
 * mensaje: abrir la consola web de Upstash → `LRANGE mensajes:muro 0
 * -1` → ubicar la entrada por su `id` (viaja en la respuesta pública,
 * es un UUID opaco) o por su texto → `LREM mensajes:muro 1 '<el JSON
 * exacto de esa entrada>'`.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { Redis } from '@upstash/redis';
import { manejarMensaje, listarMensajesPublicos } from '../packages/mensajes/src/mensajes.js';
import type { EntradaMensaje, DatosMensaje, ResultadoGuardado, MensajeAlmacenado } from '../packages/mensajes/src/mensajes.js';

function comoTexto(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function comoNumero(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function parsearEntrada(body: unknown): EntradaMensaje {
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

/** Mismo patrón que ya usa api/buscar-equipo.ts para leer la IP real
 * detrás del proxy de Vercel. Duplicado a propósito acá (no importado
 * de otro archivo de /api/**) — un módulo compartido dentro de
 * /api/** es exactamente el tipo de cambio que ya rompió el build de
 * este proyecto antes. */
function primeraCabecera(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function ipDeRequest(req: VercelRequest): string {
  const real = primeraCabecera(req.headers['x-real-ip']);
  if (real) return real;
  const forwarded = primeraCabecera(req.headers['x-forwarded-for']);
  return forwarded ? forwarded.split(',')[0]!.trim() : 'desconocida';
}

function diaActualUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Límites de uso — propios de este endpoint, distintos de los de
// buscar-equipo.ts (acá el riesgo es de exhibición pública, no de cupo
// de un proveedor pago) ─────────────────────────────────────────────
const LIMITE_POR_IP_DIARIO = Number(process.env.MENSAJES_LIMITE_POR_IP_DIARIO ?? 20);
const CUOTA_DIARIA_GLOBAL = Number(process.env.MENSAJES_CUOTA_DIARIA_GLOBAL ?? 200);
const COOLDOWN_SEGUNDOS = 30;
const TTL_CONTADOR_S = 60 * 60 * 26; // 26h de margen sobre el corte de día UTC

function claveCooldown(ip: string): string {
  return `rl:mensajes:cooldown:${ip}`;
}
function claveMensajesIp(ip: string): string {
  return `rl:mensajes:ip:${diaActualUtc()}:${ip}`;
}
function claveMensajesGlobal(): string {
  return `rl:mensajes:global:${diaActualUtc()}`;
}

// ── Almacenamiento: una lista, tope de 500 guardados / 50 mostrados ──
const CLAVE_MURO = 'mensajes:muro';
const MAX_MENSAJES_ALMACENADOS = 500;

async function guardarMensajeReal(redis: Redis, ip: string, datos: DatosMensaje): Promise<ResultadoGuardado> {
  // 1. Cooldown atómico — el chequeo más barato primero, sin tocar nada más si ya está activo.
  const libre = await redis.set(claveCooldown(ip), '1', { nx: true, ex: COOLDOWN_SEGUNDOS });
  if (libre === null) return { ok: false, codigo: 'limite-alcanzado' };

  // 2. Cupos diarios (por IP y global).
  const [countIp, countGlobal] = await Promise.all([redis.get<number>(claveMensajesIp(ip)), redis.get<number>(claveMensajesGlobal())]);
  if ((countIp ?? 0) >= LIMITE_POR_IP_DIARIO) return { ok: false, codigo: 'limite-alcanzado' };
  if ((countGlobal ?? 0) >= CUOTA_DIARIA_GLOBAL) return { ok: false, codigo: 'limite-alcanzado' };

  // 3. Guardar de verdad.
  const registro: MensajeAlmacenado = { id: randomUUID(), ...datos, creadoEnMs: Date.now() };
  await redis.lpush(CLAVE_MURO, registro);
  await redis.ltrim(CLAVE_MURO, 0, MAX_MENSAJES_ALMACENADOS - 1);

  const claveIp = claveMensajesIp(ip);
  const claveGlobal = claveMensajesGlobal();
  await Promise.all([redis.incr(claveIp).then(() => redis.expire(claveIp, TTL_CONTADOR_S)), redis.incr(claveGlobal).then(() => redis.expire(claveGlobal, TTL_CONTADOR_S))]);

  return { ok: true, id: registro.id };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) {
    console.error('api/mensajes: faltan las variables de entorno UPSTASH_REDIS_REST_URL y/o UPSTASH_REDIS_REST_TOKEN');
    res.status(500).json({ ok: false, codigo: 'error-servidor' });
    return;
  }
  const redis = new Redis({ url: redisUrl, token: redisToken });

  if (req.method === 'GET') {
    const mensajes = await listarMensajesPublicos({
      obtenerMensajes: async (limite) => (await redis.lrange<MensajeAlmacenado>(CLAVE_MURO, 0, limite - 1)) ?? [],
    });
    res.status(200).json({ ok: true, mensajes });
    return;
  }

  if (req.method === 'POST') {
    const entrada = parsearEntrada(req.body);
    const ip = ipDeRequest(req);
    const resultado = await manejarMensaje(entrada, { guardarMensaje: (datos) => guardarMensajeReal(redis, ip, datos) });
    res.status(resultado.ok ? 200 : 400).json(resultado);
    return;
  }

  res.status(405).json({ ok: false, codigo: 'metodo-invalido' });
}
