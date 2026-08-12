/**
 * Deriva los chips de presentación (ej. "8 Ω", "mín 3,5 Ω", "40–100 W")
 * desde los campos físicos del catálogo, en vez de escribirlos a mano —
 * que es justo cómo prototipo-frontend.html y data/equipos-seed.json
 * terminaron divergiendo (ver commit de packages/data). Lo no derivable
 * (DAC, phono, nombres de chip) sigue viniendo de `chipsExtra`, bilingüe.
 *
 * Paso 4: sitio sólo en español (`IDIOMA` fijo acá). El Paso 6 le agrega el
 * parámetro de idioma a estas funciones — el número ya sale por
 * formato/numeros.ts con la firma final, así que ese paso no toca esta
 * lógica de derivación, sólo qué idioma le pasa.
 *
 * Nota: `especX()` junta sólo los chips "físicos" (Ω/W/V), sin
 * `chipsExtra` (DAC, phono, nombres de chip) — es la línea compacta del
 * ítem de cadena. El prototipo era inconsistente acá (algunos amplis
 * incluían "· DAC" en su spec compacto, otros no); acá es siempre la
 * misma regla. Si no hay ningún chip físico (ej. una fuente sin voltaje
 * ni impedancia publicados), cae a chipsExtra para no dejar la línea vacía.
 */
import { num } from '../formato/numeros.ts';
import type { ParlanteCat, AmplificadorCat, FuenteCat } from '../../../../packages/data/src/tipos-catalogo.ts';
import { IDIOMA_PROVISIONAL as IDIOMA } from '../idioma-provisional.ts';

/** Cuántos decimales necesita un número para representarse tal cual está
 * en el catálogo (3.5 → 1, 4 → 0, 5.76 → 2) — evita "4,0" para valores
 * enteros sin truncar los que sí tienen decimales. */
function decimalesNaturales(v: number): number {
  const s = v.toString();
  const i = s.indexOf('.');
  return i === -1 ? 0 : s.length - i - 1;
}

function rangoPotenciaW(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null) return `${num(min, 0, IDIOMA)}–${num(max, 0, IDIOMA)} W`;
  if (min === null && max !== null) return `${num(max, 0, IDIOMA)} W`;
  if (min !== null && max === null) return `≥${num(min, 0, IDIOMA)} W`;
  return null;
}

function chipsCoreParlante(p: ParlanteCat): string[] {
  const chips: string[] = [`${num(p.impedanciaNominalOhm, 0, IDIOMA)} Ω`];
  const calificador = p.sensibilidadDb.calificador ? ` ${p.sensibilidadDb.calificador[IDIOMA]}` : '';
  chips.push(`${num(p.sensibilidadDb.valor, 0, IDIOMA)} dB${calificador}`);
  if (p.impedanciaMinOhm !== null) {
    chips.push(`mín ${num(p.impedanciaMinOhm, decimalesNaturales(p.impedanciaMinOhm), IDIOMA)} Ω`);
  }
  const rango = rangoPotenciaW(p.potenciaRecMinW, p.potenciaRecMaxW);
  if (rango) chips.push(rango);
  if (p.maxSplDb !== null) chips.push(`${num(p.maxSplDb, 0, IDIOMA)} dB máx`);
  return chips;
}

export function chipsParlante(p: ParlanteCat): string[] {
  return [...chipsCoreParlante(p), ...p.chipsExtra.map((c) => c[IDIOMA])];
}

export function especParlante(p: ParlanteCat): string {
  const core = chipsCoreParlante(p);
  return (core.length > 0 ? core : p.chipsExtra.map((c) => c[IDIOMA])).join(' · ');
}

function chipsCoreAmplificador(a: AmplificadorCat): string[] {
  const chips: string[] = [`${num(a.potencia8OhmW.valor, 0, IDIOMA)} W / 8 Ω`];
  if (a.potencia4OhmW !== null) {
    const asterisco = a.potencia4OhmW.nota ? '*' : '';
    chips.push(`${num(a.potencia4OhmW.valor, 0, IDIOMA)} W / 4 Ω${asterisco}`);
  }
  if (a.cargaMinOhm !== null) {
    chips.push(`mín ${num(a.cargaMinOhm, decimalesNaturales(a.cargaMinOhm), IDIOMA)} Ω`);
  }
  return chips;
}

export function chipsAmplificador(a: AmplificadorCat): string[] {
  return [...chipsCoreAmplificador(a), ...a.chipsExtra.map((c) => c[IDIOMA])];
}

export function especAmplificador(a: AmplificadorCat): string {
  const core = chipsCoreAmplificador(a);
  return (core.length > 0 ? core : a.chipsExtra.map((c) => c[IDIOMA])).join(' · ');
}

function chipsCoreFuente(f: FuenteCat): string[] {
  const chips: string[] = [];
  // Fijo en 1 decimal (no decimalesNaturales): 2.0 en JS es indistinguible
  // de 2, así que "naturales" perdería el cero y mostraría "2 V" en vez de
  // "2,0 V" — inconsistente con las fuentes que sí tienen decimal (2,1 V,
  // 2,2 V). Todo salidaV del catálogo es una cantidad de 1 decimal.
  if (f.salidaV !== null) chips.push(`${num(f.salidaV, 1, IDIOMA)} V salida`);
  if (f.impedanciaSalidaOhm !== null) chips.push(`${num(f.impedanciaSalidaOhm, 0, IDIOMA)} Ω salida`);
  return chips;
}

export function chipsFuente(f: FuenteCat): string[] {
  return [...chipsCoreFuente(f), ...f.chipsExtra.map((c) => c[IDIOMA])];
}

export function especFuente(f: FuenteCat): string {
  const core = chipsCoreFuente(f);
  return (core.length > 0 ? core : f.chipsExtra.map((c) => c[IDIOMA])).join(' · ');
}
