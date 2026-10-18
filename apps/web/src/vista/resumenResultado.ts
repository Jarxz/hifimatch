// PURO — sin DOM ni motor. Arma la banda de resumen de Resultado (tabla
// Cadena / Espacio / Escucha / Confianza y las tres cifras principales) a
// partir de números que el motor YA calculó: no evalúa nada ni inventa
// cifras (no hay "potencia requerida en W" en el motor, así que no se
// muestra). El texto sale del diccionario; los números, de `formato/numeros`.
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import type { Confianza } from '../../../../packages/engine/src/tipos.ts';
import { textosDe } from '../idioma/idioma.ts';
import { num, numConSigno } from '../formato/numeros.ts';

export interface FilaResumenResultado {
  clave: 'cadena' | 'espacio' | 'escucha' | 'confianza';
  etiqueta: string;
  valor: string;
}

export interface MetricaResultado {
  clave: 'nivel' | 'margen' | 'modo';
  etiqueta: string;
  /** Número ya formateado según el idioma ("+2,8", "94,3", "53,6"). */
  valor: string;
  unidad: string;
  texto: string;
  /** Sólo cuando la convención de sensibilidad no declarada abre un rango:
   * se declara junto al número para que la cifra grande no parezca única. */
  rango: string | null;
}

export interface ModeloBandaResultado {
  filas: FilaResumenResultado[];
  metricas: MetricaResultado[];
}

export interface DatosBandaResultado {
  spkNombre: string;
  ampNombre: string;
  streamerNombre: string | null;
  dacNombre: string | null;
  anchoM: number;
  largoM: number;
  altoM: number;
  /** "Moderado", "Alto"… ya traducido. */
  nivelTexto: string;
  picoObjetivoDb: number;
  distanciaEscuchaM: number;
  splDisponibleDb: number;
  splDisponibleRangoDb: [number, number] | null;
  margenDb: number;
  margenRangoDb: [number, number] | null;
  /** Frecuencia del primer modo axial de la sala; null si no hay ninguno listado. */
  primerModoHz: number | null;
  confianzaMasBaja: Confianza;
}

/** Frecuencia del modo axial más bajo entre los listados (orden 1 del eje
 * más largo). `null` si la lista viene vacía. */
export function primerModoAxialHz(modos: readonly { frecuenciaHz: number }[]): number | null {
  if (modos.length === 0) return null;
  return Math.min(...modos.map((m) => m.frecuenciaHz));
}

export function modeloBandaResultado(d: DatosBandaResultado, idioma: Idioma): ModeloBandaResultado {
  const t = textosDe(idioma).resultado;
  const cadena = [d.spkNombre, d.ampNombre, d.streamerNombre, d.dacNombre].filter((n): n is string => n !== null).join(' + ');
  const filas: FilaResumenResultado[] = [
    { clave: 'cadena', etiqueta: t.pcSumCadena, valor: cadena },
    {
      clave: 'espacio',
      etiqueta: t.pcSumEspacio,
      valor: `${num(d.anchoM, 1, idioma)} × ${num(d.largoM, 1, idioma)} × ${num(d.altoM, 2, idioma)} m`,
    },
    {
      clave: 'escucha',
      etiqueta: t.pcSumEscucha,
      valor: `${d.nivelTexto} · ${num(d.picoObjetivoDb, 0, idioma)} dB`,
    },
    { clave: 'confianza', etiqueta: t.pcSumConfianza, valor: t.pcConfianza[d.confianzaMasBaja] },
  ];

  const rango = (r: [number, number] | null, signo: boolean): string | null => {
    if (r === null) return null;
    const f = (v: number): string => (signo ? numConSigno(v, 1, idioma) : num(v, 1, idioma));
    return t.pcRango({ min: f(Math.min(...r)), max: f(Math.max(...r)) });
  };

  const metricas: MetricaResultado[] = [
    {
      clave: 'nivel',
      etiqueta: t.pcMetricaNivelEtiqueta,
      valor: num(d.splDisponibleDb, 1, idioma),
      unidad: 'dB',
      texto: t.pcMetricaNivelTexto({ distancia: num(d.distanciaEscuchaM, 1, idioma) }),
      rango: rango(d.splDisponibleRangoDb, false),
    },
    {
      clave: 'margen',
      etiqueta: t.pcMetricaMargenEtiqueta,
      valor: numConSigno(d.margenDb, 1, idioma),
      unidad: 'dB',
      texto: t.pcMetricaMargenTexto({ pico: num(d.picoObjetivoDb, 0, idioma) }),
      rango: rango(d.margenRangoDb, true),
    },
  ];
  if (d.primerModoHz !== null) {
    metricas.push({
      clave: 'modo',
      etiqueta: t.pcMetricaModoEtiqueta,
      valor: num(d.primerModoHz, 1, idioma),
      unidad: 'Hz',
      texto: t.pcMetricaModoTexto,
      rango: null,
    });
  }
  return { filas, metricas };
}
