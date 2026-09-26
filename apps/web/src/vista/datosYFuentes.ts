// PURO — sin DOM ni motor. Tabla "Datos y fuentes" de Resultado: cada número
// que entra al cálculo con su origen y su estado. Sólo relee lo que el
// catálogo ya declara (`DatoCitado`: fuente + confianza) — no evalúa nada ni
// completa huecos: un dato que el fabricante no publica se muestra como
// "No publicado / Sin dato", nunca como un valor por defecto.
//
// Sólo `sensibilidadDb`, las potencias y la salida de streamer/DAC llevan
// cita y confianza propias; el resto de los campos de cada equipo (impedancias,
// carga mínima…) se respalda con la lista `fuentes` del equipo, y así se
// declara ("Sin cita propia") en vez de asignarles una confianza inventada.
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import type { ParlanteCat, AmplificadorCat, FuenteCat } from '../../../../packages/data/src/tipos-catalogo.ts';
import type { Confianza } from '../../../../packages/engine/src/tipos.ts';
import { textosDe } from '../idioma/idioma.ts';
import type { Textos } from '../idioma/idioma.ts';
import { num } from '../formato/numeros.ts';

/** Enteros sin decimales; el resto con 1 decimal, o 2 si el primero no alcanza
 * (0,05 Ω no puede mostrarse como "0 Ω": sería un dato distinto del declarado). */
function numAuto(v: number, idioma: Idioma): string {
  if (Number.isInteger(v)) return num(v, 0, idioma);
  const a1 = Math.round(v * 10) / 10;
  return num(v, Math.abs(a1 - v) < 1e-9 ? 1 : 2, idioma);
}

export interface FilaDatoFuente {
  dato: string;
  valor: string;
  origen: string;
  /** Aclaración corta bajo el origen (medición independiente, dato pendiente…). */
  nota: string | null;
  estado: string;
}

export interface GrupoDatosFuentes {
  titulo: string;
  filas: FilaDatoFuente[];
  /** Qué dato falta y por qué (`pendiente` del catálogo), del equipo entero:
   * no se ata a una fila concreta porque el catálogo no dice a cuál se refiere. */
  nota: string | null;
}

export interface DatosParaTabla {
  spk: ParlanteCat;
  amp: AmplificadorCat;
  streamer: FuenteCat | null;
  dac: FuenteCat | null;
  anchoM: number;
  largoM: number;
  altoM: number;
  nivelTexto: string;
  picoObjetivoDb: number;
}

/** Las notas del catálogo admiten <b>…</b> (se pintan como HTML en otras
 * pantallas); acá se muestran como texto plano, así que se quitan las marcas. */
function sinEtiquetas(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function estadoConfianza(c: Confianza, t: Textos): string {
  const d = t.resultado.datos;
  return { alta: d.estadoAlta, media: d.estadoMedia, baja: d.estadoBaja }[c];
}

function referencias(fuentes: readonly string[], t: Textos): string {
  return fuentes.length > 0 ? fuentes.join(' · ') : t.resultado.datos.sinReferencias;
}

function filasParlante(p: ParlanteCat, idioma: Idioma, t: Textos): FilaDatoFuente[] {
  const d = t.resultado.datos;
  const conv = { '2.83V': d.convencion2v83, '1W': d.convencion1w }[p.sensibilidadConvencion ?? '2.83V'];
  const convTexto = p.sensibilidadConvencion === null ? d.convencionSinDeclarar : conv;
  const calif = p.sensibilidadDb.calificador?.[idioma];
  const sensValor = [`${numAuto(p.sensibilidadDb.valor, idioma)} dB`, calif, convTexto].filter(Boolean).join(' · ');
  const filas: FilaDatoFuente[] = [
    {
      dato: d.sensibilidad,
      valor: sensValor,
      origen: p.sensibilidadDb.fuente[idioma],
      nota: p.sensibilidadDb.nota ? sinEtiquetas(p.sensibilidadDb.nota[idioma]) : null,
      estado: estadoConfianza(p.sensibilidadDb.confianza, t),
    },
    {
      dato: d.impedancia,
      valor: `${numAuto(p.impedanciaNominalOhm, idioma)} Ω / ${p.impedanciaMinOhm === null ? d.noPublicado : `${numAuto(p.impedanciaMinOhm, idioma)} Ω`}`,
      origen: referencias(p.fuentes, t),
      nota: null,
      estado: d.estadoSinCita,
    },
  ];
  if (p.impedanciaMaxOhm !== null || p.anguloFaseGrados !== null) {
    filas.push({
      dato: d.impedanciaExtra,
      valor: [
        p.impedanciaMaxOhm !== null ? `${numAuto(p.impedanciaMaxOhm, idioma)} Ω` : d.noPublicado,
        p.anguloFaseGrados !== null ? `${numAuto(p.anguloFaseGrados, idioma)}°` : d.noPublicado,
      ].join(' / '),
      origen: referencias(p.fuentes, t),
      nota: null,
      estado: d.estadoSinCita,
    });
  }
  return filas;
}

function filasAmplificador(a: AmplificadorCat, idioma: Idioma, t: Textos): FilaDatoFuente[] {
  const d = t.resultado.datos;
  const filas: FilaDatoFuente[] = [
    {
      dato: d.potencia8,
      valor: `${numAuto(a.potencia8OhmW.valor, idioma)} W`,
      origen: a.potencia8OhmW.fuente[idioma],
      nota: a.potencia8OhmW.nota ? sinEtiquetas(a.potencia8OhmW.nota[idioma]) : null,
      estado: estadoConfianza(a.potencia8OhmW.confianza, t),
    },
    a.potencia4OhmW
      ? {
          dato: d.potencia4,
          valor: `${numAuto(a.potencia4OhmW.valor, idioma)} W`,
          origen: a.potencia4OhmW.fuente[idioma],
          nota: a.potencia4OhmW.nota ? sinEtiquetas(a.potencia4OhmW.nota[idioma]) : null,
          estado: estadoConfianza(a.potencia4OhmW.confianza, t),
        }
      : {
          dato: d.potencia4,
          valor: d.noPublicado,
          origen: d.sinReferencias,
          nota: null,
          estado: d.estadoSinDato,
        },
    {
      dato: d.cargaMinima,
      valor: a.cargaMinOhm !== null ? `${numAuto(a.cargaMinOhm, idioma)} Ω` : d.noPublicado,
      origen: a.cargaMinOhm !== null ? referencias(a.fuentes, t) : d.sinReferencias,
      nota: null,
      estado: a.cargaMinOhm !== null ? d.estadoSinCita : d.estadoSinDato,
    },
  ];
  if (a.factorAmortiguamiento !== null) {
    filas.push({
      dato: d.factorAmortiguamiento,
      valor: numAuto(a.factorAmortiguamiento, idioma),
      origen: referencias(a.fuentes, t),
      nota: null,
      estado: d.estadoSinCita,
    });
  }
  return filas;
}

function filaFuente(f: FuenteCat, idioma: Idioma, t: Textos): FilaDatoFuente {
  const d = t.resultado.datos;
  const v = f.salidaV !== null ? `${numAuto(f.salidaV, idioma)} V` : d.noPublicado;
  const z = f.impedanciaSalidaOhm !== null ? `${numAuto(f.impedanciaSalidaOhm, idioma)} Ω` : d.noPublicado;
  const hayDato = f.salidaV !== null || f.impedanciaSalidaOhm !== null;
  return {
    dato: d.salida,
    valor: `${v} / ${z}`,
    origen: f.fuente[idioma],
    nota: null,
    estado: hayDato ? estadoConfianza(f.confianza, t) : d.estadoSinDato,
  };
}

export function modeloDatosYFuentes(d: DatosParaTabla, idioma: Idioma): GrupoDatosFuentes[] {
  const t = textosDe(idioma);
  const r = t.resultado;
  const pendiente = (x: { pendiente?: { es: string; en: string } }): string | null =>
    x.pendiente ? sinEtiquetas(x.pendiente[idioma]) : null;
  const grupos: GrupoDatosFuentes[] = [
    { titulo: `${r.itemParlantes} · ${d.spk.nombre}`, filas: filasParlante(d.spk, idioma, t), nota: pendiente(d.spk) },
    { titulo: `${r.itemAmplificador} · ${d.amp.nombre}`, filas: filasAmplificador(d.amp, idioma, t), nota: pendiente(d.amp) },
  ];
  if (d.streamer) {
    grupos.push({ titulo: `${r.itemStreamer} · ${d.streamer.nombre}`, filas: [filaFuente(d.streamer, idioma, t)], nota: pendiente(d.streamer) });
  }
  if (d.dac) {
    grupos.push({ titulo: `${r.itemDac} · ${d.dac.nombre}`, filas: [filaFuente(d.dac, idioma, t)], nota: pendiente(d.dac) });
  }
  grupos.push({
    titulo: r.datos.grupoSala,
    nota: null,
    filas: [
      {
        dato: r.datos.dimensiones,
        valor: `${num(d.anchoM, 1, idioma)} × ${num(d.largoM, 1, idioma)} × ${num(d.altoM, 2, idioma)} m`,
        origen: r.datos.origenUsuario,
        nota: null,
        estado: r.datos.estadoSinMedicion,
      },
      {
        dato: r.datos.materiales,
        valor: r.datos.valorMateriales,
        origen: r.datos.origenMateriales,
        nota: null,
        estado: r.datos.estadoEstimacion,
      },
      {
        dato: r.datos.picoObjetivo,
        valor: `${num(d.picoObjetivoDb, 0, idioma)} dB`,
        origen: r.datos.origenNivel({ nivel: d.nivelTexto }),
        nota: null,
        estado: r.datos.estadoCriterio,
      },
    ],
  });
  return grupos;
}
