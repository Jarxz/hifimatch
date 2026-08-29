// middleware.ts — Vercel Routing Middleware (antes "Edge Middleware").
// Alcance único: negociación de contenido Accept sobre la portada
// (acceptmarkdown.com) — el ítem 3 de la auditoría "Is Agentic". No toca
// ninguna otra ruta; apps/web sigue siendo 100% estático, esto es la
// única lógica que corre por petición en Vercel fuera de api/contact.ts
// (que sigue existiendo aparte, sin relación con esto).
//
// Vive en la raíz del repo (mismo nivel que vercel.json) porque Vercel lo
// busca ahí, no dentro de apps/web. Depende de @vercel/functions
// (dependencia de runtime real, declarada en el package.json raíz junto a
// resend/@vercel/node) — mismo criterio ya establecido por api/contact.ts:
// una excepción aislada a "cero dependencias de runtime" del resto del
// repo, nunca importada desde apps/web ni packages/*.
//
// El package.json raíz declara "type":"module" precisamente para que este
// archivo (y su test) se resuelvan como ESM real — sin eso, Vercel podría
// compilar este entrypoint como CommonJS y el `import` de un paquete ESM
// reventaría en runtime (mismo bug ya sufrido y documentado con
// api/contact.ts: ERR_REQUIRE_ESM). Como acá no hay ningún import
// RELATIVO a un paquete interno del monorepo (sólo el paquete externo
// @vercel/functions), no aplica la exigencia de extensión ".js" que sí
// rigió para api/contact.ts bajo resolución node16/nodenext.
import { next } from '@vercel/functions';

export const config = { matcher: '/' };

/** Markdown que describe la portada para acceptmarkdown.com — mismo
 * contenido de fondo que `meta.descripcion`/`splash.subtitulo`
 * (apps/web/src/idioma/es.ts), redactado una sola vez a mano: no se
 * genera extrayendo texto del HTML en cada petición, ni intenta reflejar
 * el idioma activo (el HTML crudo sin JS tampoco lo hace — ver
 * CLAUDE.md, "Bilingüe real, no maquetado"). */
export const HOMEPAGE_MARKDOWN = `# The Hifi Match

> Motor de compatibilidad hi-fi: evalúa si un sistema de audio (parlantes, amplificador, streamer, DAC) es compatible entre sí y qué entrega en una sala real, con reglas físicas verificables — sin juicios de gusto ni predicciones de sinergia sonora.

The Hifi Match es una herramienta web gratuita, sin registro, que corre enteramente en el navegador: evalúa margen de potencia, carga e impedancia, puente de impedancias y recorrido de volumen de fuentes digitales, modos de sala y tiempo de reverberación (RT60). Cada regla declara su fórmula, su umbral y la fuente del dato; un dato faltante nunca se muestra como aprobado.

## Enlaces

- [Analizar un sistema](https://www.thehifimatch.com/)
- [Acerca de](https://www.thehifimatch.com/about.html)
- [Contacto](https://www.thehifimatch.com/contact.html)
- [Mapa del sitio](https://www.thehifimatch.com/sitemap.xml)
`;

/** Puro y testeable aparte de `next()`/del entorno de Vercel: decide si
 * la petición prefiere Markdown sobre HTML, siguiendo negociación de
 * contenido estándar (RFC 9110 §12.5.1) — compara `q=` cuando ambos
 * tipos aparecen, y asume preferencia por Markdown si el cliente no
 * ofrece HTML/`* / *` en absoluto (el caso exacto que reporta la
 * auditoría: `Accept: text/markdown` solo). */
export function prefiereMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  const tipos = accept.split(',').map((parte) => {
    const [tipo, ...params] = parte.trim().split(';');
    const qParam = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    const q = qParam ? Number(qParam.slice(2)) : 1;
    return { tipo: (tipo ?? '').trim().toLowerCase(), q: Number.isFinite(q) ? q : 1 };
  });
  const markdown = tipos.find((t) => t.tipo === 'text/markdown');
  if (!markdown) return false;
  const html = tipos.find((t) => t.tipo === 'text/html' || t.tipo === '*/*');
  if (!html) return true;
  return markdown.q >= html.q;
}

export default function middleware(request: Request): Response {
  if (prefiereMarkdown(request.headers.get('accept'))) {
    return new Response(HOMEPAGE_MARKDOWN, {
      status: 200,
      headers: {
        'content-type': 'text/markdown; charset=utf-8',
        vary: 'Accept, Accept-Encoding',
      },
    });
  }
  return next({ headers: { vary: 'Accept, Accept-Encoding' } });
}
