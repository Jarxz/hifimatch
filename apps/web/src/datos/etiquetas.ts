/**
 * Deriva los chips de presentación (ej. "8 Ω", "mín 3,5 Ω", "40–100 W")
 * desde los campos físicos del catálogo, en vez de escribirlos a mano —
 * que es justo cómo prototipo-frontend.html y data/equipos-seed.json
 * terminaron divergiendo (ver commit de packages/data). Lo no derivable
 * (DAC, phono, nombres de chip) sigue viniendo de `chipsExtra`, bilingüe.
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
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { textosDe } from '../idioma/idioma.ts';

/** Cuántos decimales necesita un número para representarse tal cual está
 * en el catálogo (3.5 → 1, 4 → 0, 5.76 → 2) — evita "4,0" para valores
 * enteros sin truncar los que sí tienen decimales. */
function decimalesNaturales(v: number): number {
  const s = v.toString();
  const i = s.indexOf('.');
  return i === -1 ? 0 : s.length - i - 1;
}

function rangoPotenciaW(min: number | null, max: number | null, idioma: Idioma): string | null {
  if (min !== null && max !== null) return `${num(min, 0, idioma)}–${num(max, 0, idioma)} W`;
  if (min === null && max !== null) return `${num(max, 0, idioma)} W`;
  if (min !== null && max === null) return `≥${num(min, 0, idioma)} W`;
  return null;
}

function chipsCoreParlante(p: ParlanteCat, idioma: Idioma): string[] {
  const t = textosDe(idioma);
  const chips: string[] = [`${num(p.impedanciaNominalOhm, 0, idioma)} Ω`];
  const calificador = p.sensibilidadDb.calificador ? ` ${p.sensibilidadDb.calificador[idioma]}` : '';
  chips.push(`${num(p.sensibilidadDb.valor, 0, idioma)} dB${calificador}`);
  if (p.impedanciaMinOhm !== null) {
    chips.push(`${t.catalogo.min} ${num(p.impedanciaMinOhm, decimalesNaturales(p.impedanciaMinOhm), idioma)} Ω`);
  }
  const rango = rangoPotenciaW(p.potenciaRecMinW, p.potenciaRecMaxW, idioma);
  if (rango) chips.push(rango);
  if (p.maxSplDb !== null) chips.push(`${num(p.maxSplDb, 0, idioma)} dB ${t.catalogo.max}`);
  return chips;
}

export function chipsParlante(p: ParlanteCat, idioma: Idioma): string[] {
  return [...chipsCoreParlante(p, idioma), ...p.chipsExtra.map((c) => c[idioma])];
}

export function especParlante(p: ParlanteCat, idioma: Idioma): string {
  const core = chipsCoreParlante(p, idioma);
  return (core.length > 0 ? core : p.chipsExtra.map((c) => c[idioma])).join(' · ');
}

function chipsCoreAmplificador(a: AmplificadorCat, idioma: Idioma): string[] {
  const t = textosDe(idioma);
  const chips: string[] = [`${num(a.potencia8OhmW.valor, 0, idioma)} W / 8 Ω`];
  if (a.potencia4OhmW !== null) {
    const asterisco = a.potencia4OhmW.nota ? '*' : '';
    chips.push(`${num(a.potencia4OhmW.valor, 0, idioma)} W / 4 Ω${asterisco}`);
  }
  if (a.cargaMinOhm !== null) {
    chips.push(`${t.catalogo.min} ${num(a.cargaMinOhm, decimalesNaturales(a.cargaMinOhm), idioma)} Ω`);
  }
  return chips;
}

export function chipsAmplificador(a: AmplificadorCat, idioma: Idioma): string[] {
  return [...chipsCoreAmplificador(a, idioma), ...a.chipsExtra.map((c) => c[idioma])];
}

export function especAmplificador(a: AmplificadorCat, idioma: Idioma): string {
  const core = chipsCoreAmplificador(a, idioma);
  return (core.length > 0 ? core : a.chipsExtra.map((c) => c[idioma])).join(' · ');
}

function chipsCoreFuente(f: FuenteCat, idioma: Idioma): string[] {
  const t = textosDe(idioma);
  const chips: string[] = [];
  // Fijo en 1 decimal (no decimalesNaturales): 2.0 en JS es indistinguible
  // de 2, así que "naturales" perdería el cero y mostraría "2 V" en vez de
  // "2,0 V" — inconsistente con las fuentes que sí tienen decimal (2,1 V,
  // 2,2 V). Todo salidaV del catálogo es una cantidad de 1 decimal.
  if (f.salidaV !== null) chips.push(`${num(f.salidaV, 1, idioma)} V ${t.catalogo.salida}`);
  if (f.impedanciaSalidaOhm !== null) chips.push(`${num(f.impedanciaSalidaOhm, 0, idioma)} Ω ${t.catalogo.salida}`);
  return chips;
}

export function chipsFuente(f: FuenteCat, idioma: Idioma): string[] {
  return [...chipsCoreFuente(f, idioma), ...f.chipsExtra.map((c) => c[idioma])];
}

export function especFuente(f: FuenteCat, idioma: Idioma): string {
  const core = chipsCoreFuente(f, idioma);
  return (core.length > 0 ? core : f.chipsExtra.map((c) => c[idioma])).join(' · ');
}
