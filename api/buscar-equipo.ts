/**
 * Función serverless de Vercel — segundo backend real del sitio, mismo
 * patrón que api/contact.ts (que ya documenta, con tres bugs de
 * producción resueltos, por qué CADA import relativo acá adentro lleva
 * extensión `.js`: `api/package.json` declara `type:module`, así que
 * Vercel compila `/api/**` con resolución `node16`/`nodenext`, que exige
 * `.js` apuntando al nombre ya compilado — no al `.ts` fuente).
 *
 * Adaptador delgado: parsea el request, resuelve las dos piezas de
 * infraestructura que `packages/buscador` deliberadamente NO conoce
 * (geo-gate por los términos de Google, límite de cupo por Upstash) y
 * delega el resto en `manejarBusqueda` (testeado sin red).
 *
 * Sin CORS abierto, mismo motivo que api/contact.ts: el fetch del sitio
 * es same-origin (`connect-src 'self'` en la CSP ya lo permite), agregar
 * `Access-Control-Allow-Origin` habilitaría que cualquier sitio de
 * terceros use este endpoint — acá el costo de abuso es mucho más alto
 * que en el formulario de contacto, porque cada llamada real gasta cupo
 * de Tavily.
 *
 * Todo resultado "ok:false" que sale de acá (región restringida, cupo
 * agotado, sin resultado, datos fuera de rango) es una respuesta HTTP
 * 200 válida — no un error del servidor. El frontend los trata todos
 * igual: si `ok` no es `true`, ofrece la ficha manual. Sólo los fallos
 * de la propia función (método inválido, entrada mal formada, falta
 * configuración) devuelven un código HTTP de error.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { Redis } from '@upstash/redis';
import { manejarBusqueda } from '../packages/buscador/src/buscador.js';
import type { CategoriaBusqueda, EquipoWeb, SolicitudBusqueda, ResultadoProveedor, CacheEquipoBuscado } from '../packages/buscador/src/buscador.js';
import { paisRestringido } from '../packages/buscador/src/geo.js';
import { buscarEquipoEnLaWeb } from './proveedor-busqueda.js';

const CATEGORIAS_VALIDAS: readonly CategoriaBusqueda[] = ['parlante', 'amplificador', 'streamer', 'dac'];
const LARGO_MAXIMO_CAMPO = 100;

function comoTexto(v: unknown): string {
  return typeof v === 'string' ? v.trim().slice(0, LARGO_MAXIMO_CAMPO) : '';
}

function parsearEntrada(body: unknown): SolicitudBusqueda | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const categoria = typeof b.categoria === 'string' && (CATEGORIAS_VALIDAS as string[]).includes(b.categoria) ? (b.categoria as CategoriaBusqueda) : null;
  const marca = comoTexto(b.marca);
  const modelo = comoTexto(b.modelo);
  if (!categoria || marca === '' || modelo === '') return null;
  return { categoria, marca, modelo };
}

/** El header de geolocalización de Vercel (`x-vercel-ip-country`, ver
 * CLAUDE.md "API support") está disponible en toda deployment, sin
 * restricción de plan — confirmado contra la documentación oficial. Se
 * lee directo de `req.headers` (estilo Node de `@vercel/node`, igual
 * convención que ya usa api/contact.ts) en vez de la función
 * `geolocation()` de `@vercel/functions`, que espera un `Request` de
 * Fetch API — un tipo distinto al `VercelRequest` que usa este archivo. */
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

// ── Cupo: global por MES calendario UTC (atado al ciclo real de Tavily,
// 1.000 búsquedas/mes gratis) + por IP, por día (protección de abuso,
// independiente del ciclo de facturación del proveedor) ────────────────
// Sólo se cuenta un intento real contra el proveedor (nunca un acierto
// de caché) — así una consulta ya resuelta no compite por el mismo
// cupo. CUOTA_MENSUAL_GLOBAL deja ~10% de margen bajo las 1.000
// búsquedas/mes reales de Tavily (search_depth:'basic' = 1 crédito por
// equipo, ver proveedor-busqueda.ts) — el margen es para no cortar el
// mes justo al límite exacto si el conteo se desincroniza por un reinicio
// de Redis o un reintento.
const CUOTA_MENSUAL_GLOBAL = Number(process.env.BUSCADOR_CUOTA_MENSUAL_GLOBAL ?? 900);
const LIMITE_POR_IP_DIARIO = Number(process.env.BUSCADOR_LIMITE_POR_IP_DIARIO ?? 15);
const TTL_CONTADOR_MES_S = 60 * 60 * 24 * 32; // 32 días de margen sobre el corte de mes UTC
const TTL_CONTADOR_IP_S = 60 * 60 * 26; // 26h de margen sobre el corte de día UTC

function mesActualUtc(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}
function diaActualUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function cupoDisponible(redis: Redis, ip: string): Promise<boolean> {
  const [countGlobal, countIp] = await Promise.all([redis.get<number>(`rl:global:${mesActualUtc()}`), redis.get<number>(`rl:ip:${diaActualUtc()}:${ip}`)]);
  if ((countGlobal ?? 0) >= CUOTA_MENSUAL_GLOBAL) return false;
  if ((countIp ?? 0) >= LIMITE_POR_IP_DIARIO) return false;
  return true;
}

async function registrarUso(redis: Redis, ip: string): Promise<void> {
  const claveGlobal = `rl:global:${mesActualUtc()}`;
  const claveIp = `rl:ip:${diaActualUtc()}:${ip}`;
  await Promise.all([
    redis.incr(claveGlobal).then(() => redis.expire(claveGlobal, TTL_CONTADOR_MES_S)),
    redis.incr(claveIp).then(() => redis.expire(claveIp, TTL_CONTADOR_IP_S)),
  ]);
}

// ── Caché: 180 días — specs físicas de un producto real no cambian ─────
const TTL_CACHE_S = 60 * 60 * 24 * 180;

function cacheRedis(redis: Redis): CacheEquipoBuscado {
  return {
    async get(clave: string): Promise<EquipoWeb | null> {
      const valor = await redis.get<EquipoWeb>(`equipo:${clave}`);
      return valor ?? null;
    },
    async set(clave: string, equipo: EquipoWeb): Promise<void> {
      await redis.set(`equipo:${clave}`, equipo, { ex: TTL_CACHE_S });
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, codigo: 'metodo-invalido' });
    return;
  }

  const entrada = parsearEntrada(req.body);
  if (!entrada) {
    res.status(400).json({ ok: false, codigo: 'entrada-invalida' });
    return;
  }

  // Geo-gate ANTES de tocar Redis o los proveedores — un visitante de una
  // región restringida nunca dispara ninguna llamada real, cae directo a
  // la ficha manual (ver packages/buscador/src/geo.ts). Protege
  // específicamente el paso de extracción (Gemini, plan gratuito) — los
  // términos de Google exigen plan pago para servir la API a usuarios del
  // EEE/Suiza/Reino Unido; Tavily no tiene una restricción equivalente
  // conocida, pero el gate corre igual para toda la búsqueda, no sólo
  // para la mitad que la necesita.
  const pais = primeraCabecera(req.headers['x-vercel-ip-country']);
  if (paisRestringido(pais)) {
    res.status(200).json({ ok: false, codigo: 'region-restringida' });
    return;
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const geminiKey = process.env.GEMINI_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!redisUrl || !redisToken || !geminiKey || !tavilyKey) {
    console.error('api/buscar-equipo: faltan variables de entorno (UPSTASH_REDIS_REST_URL/TOKEN, GEMINI_API_KEY, TAVILY_API_KEY)');
    res.status(500).json({ ok: false, codigo: 'error-servidor' });
    return;
  }

  const redis = new Redis({ url: redisUrl, token: redisToken });
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const ip = ipDeRequest(req);

  const resultado = await manejarBusqueda(entrada, {
    cache: cacheRedis(redis),
    buscarEnProveedor: async (solicitud): Promise<ResultadoProveedor> => {
      if (!(await cupoDisponible(redis, ip))) return { ok: false, codigo: 'cupo-agotado' };
      await registrarUso(redis, ip);
      return buscarEquipoEnLaWeb(ai, solicitud);
    },
  });

  res.status(200).json(resultado);
}
