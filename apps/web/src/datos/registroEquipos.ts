/**
 * Registro en memoria de equipos hallados por búsqueda web o cargados a
 * mano — la pieza que evita reescribir el resto del frontend. Un equipo
 * acá es un ParlanteCat/AmplificadorCat/FuenteCat completo
 * (packages/buscador/src/buscador.ts) que NUNCA entra a
 * packages/data/src/catalogo.ts: `estado.spk/amp/streamer/dac` siguen
 * siendo `string | null` con un id, así que `buscarParlante()` y
 * hermanas (main.ts) sólo necesitan consultar este registro ANTES de
 * `CATALOGO.find(...)`, sin cambiar su forma ni la de nada que ya las
 * consume (chipsParlante, infoHtmlParlante, adaptadores.ts...).
 *
 * Vive sólo mientras dura la sesión del navegador — recargar la página
 * lo vacía, igual que cualquier otro estado en memoria del sitio
 * (estado.ts). No hay persistencia a propósito: un equipo no curado no
 * debería sobrevivir más que la sesión que lo cargó.
 */
import type { ParlanteCat, AmplificadorCat, FuenteCat } from '../../../../packages/data/src/tipos-catalogo.ts';

export type EquipoRegistrado = ParlanteCat | AmplificadorCat | FuenteCat;

const registro = new Map<string, EquipoRegistrado>();

export function registrarEquipo(equipo: EquipoRegistrado): void {
  registro.set(equipo.id, equipo);
}

export function buscarEnRegistro(id: string): EquipoRegistrado | null {
  return registro.get(id) ?? null;
}

/** Sólo para tests — no se usa en producción. */
export function vaciarRegistro(): void {
  registro.clear();
}
