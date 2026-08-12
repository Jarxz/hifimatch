/**
 * Los dos idiomas del sitio. Vive acá (no en apps/web) porque el catálogo
 * mismo es bilingüe: cada texto de producto se escribe en los dos desde el
 * origen, no se traduce después.
 */
export type Idioma = 'es' | 'en';

/**
 * Mapped type sobre Idioma: agregar un tercer idioma se vuelve un error de
 * compilación en cada registro del catálogo al que le falte, nunca un texto
 * vacío en pantalla.
 */
export type Localizado = { readonly [K in Idioma]: string };
