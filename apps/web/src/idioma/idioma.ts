/**
 * Selección de idioma: qué diccionario está activo, cómo se guarda, y cómo
 * se aplica al cromo estático del DOM (data-i18n). El texto dinámico de
 * resultados NO pasa por acá — main.ts llama a `textosDe(idioma)` y
 * construye ese texto en TS, 100% tipado (ver vista/resultado.ts).
 */
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { es } from './es.ts';
import { en } from './en.ts';
import type { Textos } from './es.ts';

export type { Idioma } from '../../../../packages/data/src/idioma.ts';
export type { Textos } from './es.ts';

const DICCIONARIOS: Record<Idioma, Textos> = { es, en };
const CLAVE_LOCAL_STORAGE = 'cadena.idioma';

export function textosDe(idioma: Idioma): Textos {
  return DICCIONARIOS[idioma];
}

function esIdioma(v: string | null): v is Idioma {
  return v === 'es' || v === 'en';
}

/**
 * localStorage tira SecurityError sobre file:// en Safari (bloquea el
 * acceso a almacenamiento local para páginas de archivo, salvo que el
 * usuario lo habilite a mano). Sin este try/catch, leer el idioma
 * guardado rompería el arranque entero de la app en ese caso — el idioma
 * simplemente no persiste ahí entre recargas, pero el sitio sigue
 * funcionando.
 */
export function leerIdiomaGuardado(): Idioma | null {
  try {
    const v = localStorage.getItem(CLAVE_LOCAL_STORAGE);
    return esIdioma(v) ? v : null;
  } catch {
    return null;
  }
}

export function guardarIdioma(idioma: Idioma): void {
  try {
    localStorage.setItem(CLAVE_LOCAL_STORAGE, idioma);
  } catch {
    // ver leerIdiomaGuardado — no persiste, pero no debe romper nada.
  }
}

/** es por defecto (decisión del proyecto): NO se autodetecta desde
 * navigator.language. Si algún día se quiere, es esta única línea. */
export function idiomaInicial(): Idioma {
  return leerIdiomaGuardado() ?? 'es';
}

/** Exportada para que idioma.test.ts valide con la misma lógica de
 * resolución que cada data-i18n de index.html existe en los dos diccionarios. */
export function leerRuta(t: Textos, ruta: string): string {
  const partes = ruta.split('.');
  let actual: unknown = t;
  for (const parte of partes) {
    if (typeof actual !== 'object' || actual === null || !(parte in actual)) {
      throw new Error(`idioma: la clave "${ruta}" no existe en el diccionario`);
    }
    actual = (actual as Record<string, unknown>)[parte];
  }
  if (typeof actual !== 'string') {
    throw new Error(`idioma: la clave "${ruta}" no resuelve a un string (¿es una función o un objeto?)`);
  }
  return actual;
}

/**
 * Aplica el cromo estático: <html lang>, <title>, meta description, cada
 * [data-i18n] (textContent), [data-i18n-html] (innerHTML — sólo el footer,
 * que lleva <br>), [data-i18n-aria] (aria-label), y el estado
 * aria-pressed de los botones ES/EN. El texto dinámico de resultados lo
 * repinta quien llama a esto (main.ts), porque depende del estado de la
 * cadena elegida, no sólo del idioma.
 */
export function aplicarCromoEstatico(idioma: Idioma): void {
  const t = textosDe(idioma);

  document.documentElement.lang = t.meta.lang;
  document.title = t.meta.titulo;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t.meta.descripcion);

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = leerRuta(t, el.dataset.i18n!);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => {
    el.innerHTML = leerRuta(t, el.dataset.i18nHtml!);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', leerRuta(t, el.dataset.i18nAria!));
  });
  document.querySelectorAll<HTMLButtonElement>('[data-idioma]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.idioma === idioma));
  });
}
