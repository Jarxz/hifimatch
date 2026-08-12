/**
 * Catálogo curado de CADENA — única fuente de datos de equipos. Fusiona lo
 * que antes vivía duplicado en prototipo-frontend.html (presentación:
 * `type`, `chips[]`, `desc`) y en data/equipos-seed.json (física: `fuente`,
 * `confianza`, `_pendiente`), que ya habían divergido. Regla de fusión:
 * gana el JSON en lo físico, gana el HTML en lo editorial. Divergencias
 * resueltas explícitamente, documentadas en el commit de este archivo.
 *
 * VERIFICAR cada valor contra las fuentes citadas antes de publicar (mismo
 * aviso que llevaba equipos-seed.json — la curaduría es continua, Fase 5).
 */
import type { Catalogo } from './tipos-catalogo.ts';

export const CATALOGO: Catalogo = {
  parlantes: [
    {
      id: 'kef-ls50-meta',
      nombre: 'KEF LS50 Meta',
      tipo: {
        es: 'Monitor de 2 vías, puerto trasero, driver coaxial Uni-Q',
        en: '2-way monitor, rear port, Uni-Q coaxial driver',
      },
      descripcion: {
        es: 'Driver coaxial Uni-Q (tweeter de 25 mm con tecnología MAT sobre medio-grave de 130 mm): fuente puntual e imagen precisa. <b>Carga exigente</b> — 85 dB de sensibilidad y caída a 3,5 Ω piden un amplificador con reserva de corriente.',
        en: 'Uni-Q coaxial driver (a 25 mm MAT-technology dome tweeter mounted on a 130 mm mid-bass): a point source with precise imaging. <b>Demanding load</b> — 85 dB sensitivity and a dip to 3.5 Ω call for an amplifier with current reserve.',
      },
      sensibilidadDb: {
        valor: 85,
        fuente: { es: 'KEF (ficha oficial)', en: 'KEF (official spec sheet)' },
        confianza: 'alta',
        nota: {
          es: "medición independiente (Stereophile / Erin's Audio Corner) ~84,5 dB — coincide con fábrica",
          en: "independent measurement (Stereophile / Erin's Audio Corner) ~84.5 dB — matches the factory figure",
        },
      },
      impedanciaNominalOhm: 8,
      impedanciaMinOhm: 3.5,
      potenciaRecMinW: 40,
      potenciaRecMaxW: 100,
      maxSplDb: 106,
      chipsExtra: [],
      fuentes: ['KEF (ficha oficial)', 'Stereophile (mediciones J. Atkinson)', "Erin's Audio Corner"],
    },
    {
      id: 'klipsch-rp600m-ii',
      nombre: 'Klipsch RP-600M II',
      tipo: {
        es: 'Monitor de 2 vías, trompa Tractrix, puerto trasero',
        en: '2-way monitor, Tractrix horn, rear port',
      },
      descripcion: {
        es: 'Tweeter de titanio de 1" en trompa Tractrix sobre woofer Cerametallic de 6,5". La trompa lo hace <b>eficiente y fácil de mover</b>, con impedancia benigna cerca de 8 Ω. Cuidado con el dato: la sensibilidad de fábrica (94,5 dB) es en media-espacio; la anecoica independiente da ~86 dB.',
        en: 'A 1" titanium tweeter in a Tractrix horn over a 6.5" Cerametallic woofer. The horn makes it <b>efficient and easy to drive</b>, with a benign impedance near 8 Ω. Watch this spec: the factory sensitivity figure (94.5 dB) is half-space; the independent anechoic measurement gives ~86 dB.',
      },
      sensibilidadDb: {
        valor: 86,
        fuente: { es: "Erin's Audio Corner (anecoica)", en: "Erin's Audio Corner (anechoic)" },
        confianza: 'media',
        nota: {
          es: 'fábrica declara 94,5 dB pero es en media-espacio; se usa la anecoica ~86 dB',
          en: 'the factory rates it at 94.5 dB but that is half-space; the ~86 dB anechoic figure is used instead',
        },
        calificador: { es: 'anecoica', en: 'anechoic' },
      },
      impedanciaNominalOhm: 8,
      impedanciaMinOhm: null,
      potenciaRecMinW: null,
      potenciaRecMaxW: 100,
      maxSplDb: null,
      chipsExtra: [{ es: '44 Hz–25 kHz', en: '44 Hz–25 kHz' }],
      fuentes: ['Klipsch (ficha oficial)', "Erin's Audio Corner"],
      pendiente: {
        es: "curva de impedancia medida (impedanciaMinOhm) — hoy sin dato, por eso la regla de carga devuelve 'sin-datos'",
        en: "measured impedance curve (impedanciaMinOhm) — no data yet, so the load rule returns 'no-data'",
      },
    },
    {
      id: 'elac-debut2-b62',
      nombre: 'ELAC Debut 2.0 B6.2',
      tipo: {
        es: 'Monitor de 2 vías, puerto trasero, tweeter de domo de tela',
        en: '2-way monitor, rear port, fabric dome tweeter',
      },
      descripcion: {
        es: 'Tweeter de domo de tela de 1" sobre woofer de fibra de aramida de 6,5". Impedancia nominal de 6 Ω, más exigente que un 8 Ω típico, pero sin una caída mínima medida de forma confiable todavía — <b>la regla de carga no tiene ese dato</b>.',
        en: 'A 1" fabric dome tweeter over a 6.5" aramid-fiber woofer. Nominal impedance of 6 Ω, more demanding than a typical 8 Ω, but without a reliably measured minimum yet — <b>the load rule has no data for that</b>.',
      },
      sensibilidadDb: {
        valor: 87,
        fuente: { es: 'ELAC (ficha oficial)', en: 'ELAC (official spec sheet)' },
        confianza: 'alta',
        nota: {
          es: 'medición independiente (Audio Science Review) 86,6 dB — coincide con fábrica',
          en: 'independent measurement (Audio Science Review) 86.6 dB — matches the factory figure',
        },
      },
      impedanciaNominalOhm: 6,
      impedanciaMinOhm: null,
      potenciaRecMinW: 30,
      potenciaRecMaxW: 120,
      maxSplDb: null,
      chipsExtra: [],
      fuentes: ['ELAC (ficha oficial)', 'Audio Science Review (ASR)'],
      pendiente: {
        es: "impedancia mínima medida — no se encontró dato confiable de ASR/Erin's, la regla de carga devuelve 'sin-datos'",
        en: "measured minimum impedance — no reliable data found from ASR/Erin's, the load rule returns 'no-data'",
      },
    },
    {
      id: 'wharfedale-diamond-12-1',
      nombre: 'Wharfedale Diamond 12.1',
      tipo: { es: 'Monitor de 2 vías, puerto trasero', en: '2-way monitor, rear port' },
      descripcion: {
        es: 'Tweeter textil de 1" sobre woofer Klarity de 5". Impedancia nominal 8 Ω con mínima de 4 Ω — carga moderadamente exigente. No encontramos medición independiente que confirme la sensibilidad de fábrica.',
        en: 'A 1" textile dome tweeter over a 5" Klarity woofer. Nominal impedance of 8 Ω with a 4 Ω minimum — a moderately demanding load. We found no independent measurement confirming the factory sensitivity figure.',
      },
      sensibilidadDb: {
        valor: 88,
        fuente: { es: 'Wharfedale (ficha oficial)', en: 'Wharfedale (official spec sheet)' },
        confianza: 'media',
        nota: {
          es: "no se encontró medición independiente (Stereophile/ASR/Erin's) de este modelo",
          en: "no independent measurement found (Stereophile/ASR/Erin's) for this model",
        },
      },
      impedanciaNominalOhm: 8,
      impedanciaMinOhm: 4,
      potenciaRecMinW: 20,
      potenciaRecMaxW: 100,
      maxSplDb: null,
      chipsExtra: [],
      fuentes: ['Wharfedale (ficha oficial)'],
    },
    {
      id: 'bw-606-s2-anniversary',
      nombre: 'Bowers & Wilkins 606 S2 Anniversary Edition',
      tipo: {
        es: 'Monitor de 2 vías, puerto trasero, tweeter de domo',
        en: '2-way monitor, rear port, dome tweeter',
      },
      descripcion: {
        es: 'Tweeter de domo sobre woofer Continuum de 6,5". Impedancia mínima de 3,7 Ω según ficha oficial — carga exigente, sin medición independiente publicada de este modelo específico.',
        en: 'A dome tweeter over a 6.5" Continuum woofer. Minimum impedance of 3.7 Ω per the official spec sheet — a demanding load, with no independent measurement published for this specific model.',
      },
      sensibilidadDb: {
        valor: 88,
        fuente: { es: 'Bowers & Wilkins (ficha oficial)', en: 'Bowers & Wilkins (official spec sheet)' },
        confianza: 'media',
        nota: {
          es: 'no se encontró medición independiente de este modelo específico',
          en: 'no independent measurement found for this specific model',
        },
      },
      impedanciaNominalOhm: 8,
      impedanciaMinOhm: 3.7,
      potenciaRecMinW: 30,
      potenciaRecMaxW: 120,
      maxSplDb: null,
      chipsExtra: [],
      fuentes: ['Bowers & Wilkins (ficha oficial)'],
    },
    {
      id: 'q-acoustics-3020i',
      nombre: 'Q Acoustics 3020i',
      tipo: { es: 'Monitor de 2 vías, puerto trasero', en: '2-way monitor, rear port' },
      descripcion: {
        es: 'Domo de 22 mm sobre woofer de 5". Impedancia nominal 6 Ω con mínima de 4 Ω. Rango de potencia recomendada relativamente bajo (25–75 W): pensado para amplificadores modestos.',
        en: 'A 22 mm dome over a 5" woofer. Nominal impedance of 6 Ω with a 4 Ω minimum. A relatively low recommended power range (25–75 W): meant for modest amplifiers.',
      },
      sensibilidadDb: {
        valor: 88,
        fuente: { es: 'Q Acoustics (ficha oficial)', en: 'Q Acoustics (official spec sheet)' },
        confianza: 'media',
        nota: {
          es: 'no se encontró medición independiente de este modelo',
          en: 'no independent measurement found for this model',
        },
      },
      impedanciaNominalOhm: 6,
      impedanciaMinOhm: 4,
      potenciaRecMinW: 25,
      potenciaRecMaxW: 75,
      maxSplDb: null,
      chipsExtra: [],
      fuentes: ['Q Acoustics (ficha oficial)'],
    },
    {
      id: 'revel-performa3-m106',
      nombre: 'Revel Performa3 M106',
      tipo: {
        es: 'Monitor de 2 vías, puerto trasero, tweeter de titanio',
        en: '2-way monitor, rear port, titanium tweeter',
      },
      descripcion: {
        es: 'Tweeter de titanio sobre woofer de aluminio. Su impedancia mínima medida (5,76 Ω, a 138 Hz y 2400 Hz) es benigna: no baja de forma crítica pese al nominal de 8 Ω.',
        en: 'A titanium tweeter over an aluminum woofer. Its measured minimum impedance (5.76 Ω, at 138 Hz and 2400 Hz) is benign: it does not dip critically despite the nominal 8 Ω rating.',
      },
      sensibilidadDb: {
        valor: 87,
        fuente: { es: 'Revel (ficha oficial)', en: 'Revel (official spec sheet)' },
        confianza: 'alta',
        nota: {
          es: 'medición independiente (Stereophile / J. Atkinson) ~86,4 dB(B) — coincide con fábrica',
          en: 'independent measurement (Stereophile / J. Atkinson) ~86.4 dB(B) — matches the factory figure',
        },
      },
      impedanciaNominalOhm: 8,
      impedanciaMinOhm: 5.76,
      potenciaRecMinW: 50,
      potenciaRecMaxW: 150,
      maxSplDb: null,
      chipsExtra: [],
      fuentes: ['Revel (ficha oficial)', 'Stereophile (mediciones J. Atkinson)'],
      pendiente: {
        es: 'mínimo medido a 138 Hz y 2400 Hz (fase −34°); es un mínimo benigno, no una caída dura',
        en: 'minimum measured at 138 Hz and 2400 Hz (−34° phase); a benign minimum, not a hard dip',
      },
    },
    {
      id: 'dynaudio-emit-20',
      nombre: 'Dynaudio Emit 20',
      tipo: { es: 'Monitor de 2 vías, puerto trasero', en: '2-way monitor, rear port' },
      descripcion: {
        es: 'Impedancia mínima medida de forma independiente (HiFi Critic / M. Colloms) en 5,4 Ω, a 40 Hz y 170 Hz — carga benigna pese al nominal de 6 Ω. La fábrica recomienda desde 70 W, sin techo publicado.',
        en: 'Minimum impedance independently measured (HiFi Critic / M. Colloms) at 5.4 Ω, at 40 Hz and 170 Hz — a benign load despite the nominal 6 Ω rating. The factory recommends from 70 W up, with no published ceiling.',
      },
      sensibilidadDb: {
        valor: 86,
        fuente: { es: 'Dynaudio (ficha oficial)', en: 'Dynaudio (official spec sheet)' },
        confianza: 'media',
        nota: {
          es: 'no se encontró medición independiente de sensibilidad que confirme o corrija la ficha',
          en: 'no independent sensitivity measurement found to confirm or correct the spec sheet',
        },
      },
      impedanciaNominalOhm: 6,
      impedanciaMinOhm: 5.4,
      potenciaRecMinW: 70,
      potenciaRecMaxW: null,
      maxSplDb: null,
      chipsExtra: [],
      fuentes: ['Dynaudio (ficha oficial)', 'HiFi Critic (M. Colloms, medición de impedancia)'],
      pendiente: {
        es: 'fábrica sólo publica el mínimo recomendado (70 W), no un rango; no confundir con el power handling IEC (160 W), que es una métrica distinta',
        en: 'the factory only publishes the recommended minimum (70 W), not a range; not to be confused with the IEC power handling rating (160 W), a different metric',
      },
    },
  ],

  amplificadores: [
    {
      id: 'cambridge-cxa81',
      nombre: 'Cambridge Audio CXA81',
      tipo: { es: 'Integrado Clase AB, con DAC', en: 'Class AB integrated amplifier, with DAC' },
      descripcion: {
        es: '80 W en 8 Ω que suben a 120 W en 4 Ω: <b>casi los dobla</b>, señal de buena entrega de corriente para cargas exigentes. Trae DAC ESS Sabre, entrada balanceada XLR y factor de amortiguación sobre 110.',
        en: '80 W into 8 Ω rising to 120 W into 4 Ω: <b>nearly doubles</b>, a sign of good current delivery for demanding loads. Includes an ESS Sabre DAC, a balanced XLR input, and a damping factor above 110.',
      },
      potencia8OhmW: {
        valor: 80,
        fuente: { es: 'Cambridge Audio (ficha oficial)', en: 'Cambridge Audio (official spec sheet)' },
        confianza: 'alta',
      },
      potencia4OhmW: {
        valor: 120,
        fuente: { es: 'Cambridge Audio (ficha oficial)', en: 'Cambridge Audio (official spec sheet)' },
        confianza: 'alta',
      },
      cargaMinOhm: null,
      sensEntradaMv: 370,
      impedanciaEntradaOhm: 43000,
      chipsExtra: [
        { es: 'XLR balanceado', en: 'Balanced XLR' },
        { es: 'DAC ESS', en: 'ESS DAC' },
        { es: 'amort. >110', en: 'damping >110' },
      ],
      fuentes: ['Cambridge Audio (ficha oficial)', 'Stereophile'],
    },
    {
      id: 'rega-brio',
      nombre: 'Rega Brio',
      tipo: { es: 'Integrado Clase AB, con phono MM', en: 'Class AB integrated amplifier, with MM phono' },
      descripcion: {
        es: '50 W en 8 Ω y 73 W en 4 Ω, con impedancia de salida muy baja (buen control del cono). <b>Potencia modesta</b>: rinde mejor con parlantes eficientes o de carga benigna. Incluye previo de phono; no trae DAC.',
        en: '50 W into 8 Ω and 73 W into 4 Ω, with a very low output impedance (good cone control). <b>Modest power</b>: performs best with efficient speakers or a benign load. Includes a phono stage; no built-in DAC.',
      },
      potencia8OhmW: {
        valor: 50,
        fuente: { es: 'Rega (ficha oficial)', en: 'Rega (official spec sheet)' },
        confianza: 'alta',
      },
      potencia4OhmW: {
        valor: 73,
        fuente: { es: 'Stereophile (medición)', en: 'Stereophile (measurement)' },
        confianza: 'media',
      },
      cargaMinOhm: 4,
      sensEntradaMv: 210,
      impedanciaEntradaOhm: 47000,
      chipsExtra: [{ es: 'phono MM', en: 'MM phono' }],
      fuentes: ['Rega (ficha oficial)', 'Stereophile'],
    },
    {
      id: 'nad-c316bee-v2',
      nombre: 'NAD C 316BEE V2',
      tipo: { es: 'Integrado Clase AB, con phono MM', en: 'Class AB integrated amplifier, with MM phono' },
      descripcion: {
        es: '40 W tanto en 8 Ω como en 4 Ω — NAD no dobla potencia entre ambas cargas, a diferencia de otros integrados de este rango. Reserva de corriente dinámica (IHF) hasta 2 Ω.',
        en: '40 W into both 8 Ω and 4 Ω — NAD does not double power between the two loads, unlike other integrated amps in this range. Dynamic (IHF) current reserve down to 2 Ω.',
      },
      potencia8OhmW: {
        valor: 40,
        fuente: { es: 'NAD (ficha oficial)', en: 'NAD (official spec sheet)' },
        confianza: 'alta',
      },
      potencia4OhmW: {
        valor: 40,
        fuente: { es: 'NAD (ficha oficial)', en: 'NAD (official spec sheet)' },
        confianza: 'alta',
        nota: {
          es: 'NAD publica la misma potencia continua a 8 y 4 Ω (no dobla); la reserva para 4 Ω aparece sólo como potencia dinámica IHF (120 W), una métrica distinta',
          en: 'NAD publishes the same continuous power at 8 and 4 Ω (it does not double); the 4 Ω reserve shows up only as IHF dynamic power (120 W), a different metric',
        },
      },
      cargaMinOhm: 2,
      sensEntradaMv: 200,
      impedanciaEntradaOhm: null,
      chipsExtra: [{ es: 'phono MM', en: 'MM phono' }],
      fuentes: ['NAD (ficha oficial)'],
      pendiente: {
        es: 'impedancia de entrada de línea — no encontrada en la ficha pública',
        en: 'line input impedance — not found in the public spec sheet',
      },
    },
    {
      id: 'marantz-pm6007',
      nombre: 'Marantz PM6007',
      tipo: {
        es: 'Integrado Clase AB, con DAC y phono MM',
        en: 'Class AB integrated amplifier, with DAC and MM phono',
      },
      descripcion: {
        es: '45 W en 8 Ω que suben a 60 W en 4 Ω (reserva 1,3×, no llega al umbral de 1,7× de la regla de carga). Trae DAC integrado y previo de phono MM.',
        en: "45 W into 8 Ω rising to 60 W into 4 Ω (1.3x reserve, short of the load rule's 1.7x threshold). Includes a built-in DAC and an MM phono stage.",
      },
      potencia8OhmW: {
        valor: 45,
        fuente: { es: 'Marantz (ficha oficial)', en: 'Marantz (official spec sheet)' },
        confianza: 'alta',
      },
      potencia4OhmW: {
        valor: 60,
        fuente: { es: 'Marantz (ficha oficial)', en: 'Marantz (official spec sheet)' },
        confianza: 'alta',
      },
      cargaMinOhm: 4,
      sensEntradaMv: 200,
      impedanciaEntradaOhm: 20000,
      chipsExtra: [
        { es: 'DAC', en: 'DAC' },
        { es: 'phono MM', en: 'MM phono' },
      ],
      fuentes: ['Marantz (ficha oficial)'],
    },
    {
      id: 'yamaha-as501',
      nombre: 'Yamaha A-S501',
      tipo: {
        es: 'Integrado Clase AB, con DAC y phono MM',
        en: 'Class AB integrated amplifier, with DAC and MM phono',
      },
      descripcion: {
        es: '85 W en 8 Ω medidos con THD muy bajo (0,019%); el dato de 120 W a 4 Ω usa una condición de medición distinta (1 kHz, 0,7% THD) — no son directamente comparables entre sí.',
        en: '85 W into 8 Ω measured at a very low THD (0.019%); the 120 W into 4 Ω figure uses a different measurement condition (1 kHz, 0.7% THD) — the two are not directly comparable.',
      },
      potencia8OhmW: {
        valor: 85,
        fuente: { es: 'Yamaha (ficha oficial)', en: 'Yamaha (official spec sheet)' },
        confianza: 'alta',
        nota: {
          es: 'potencia RMS mínima garantizada, 0,019% THD',
          en: 'guaranteed minimum RMS power, 0.019% THD',
        },
      },
      potencia4OhmW: {
        valor: 120,
        fuente: { es: 'Yamaha (ficha oficial)', en: 'Yamaha (official spec sheet)' },
        confianza: 'media',
        nota: {
          es: 'medida a 1 kHz con 0,7% THD — condición distinta a la de 8 Ω, no son directamente comparables',
          en: 'measured at 1 kHz with 0.7% THD — a different condition than the 8 Ω figure, not directly comparable',
        },
      },
      cargaMinOhm: null,
      sensEntradaMv: 200,
      impedanciaEntradaOhm: 47000,
      chipsExtra: [
        { es: 'DAC', en: 'DAC' },
        { es: 'phono MM', en: 'MM phono' },
      ],
      fuentes: ['Yamaha (ficha oficial)'],
      pendiente: {
        es: 'impedancia mínima de carga (cargaMinOhm) — no se encontró como spec explícita, distinta de la tabla de potencia dinámica',
        en: 'minimum load impedance (cargaMinOhm) — not found as an explicit spec, distinct from the dynamic power table',
      },
    },
    {
      id: 'denon-pma600ne',
      nombre: 'Denon PMA-600NE',
      tipo: {
        es: 'Integrado Clase AB, con DAC y phono MM',
        en: 'Class AB integrated amplifier, with DAC and MM phono',
      },
      descripcion: {
        es: '45 W en 8 Ω que suben a 70 W en 4 Ω (reserva 1,56×, por debajo del umbral 1,7×). Trae DAC integrado y previo de phono MM.',
        en: '45 W into 8 Ω rising to 70 W into 4 Ω (1.56x reserve, below the 1.7x threshold). Includes a built-in DAC and an MM phono stage.',
      },
      potencia8OhmW: {
        valor: 45,
        fuente: { es: 'Denon (ficha oficial)', en: 'Denon (official spec sheet)' },
        confianza: 'alta',
      },
      potencia4OhmW: {
        valor: 70,
        fuente: { es: 'Denon (ficha oficial)', en: 'Denon (official spec sheet)' },
        confianza: 'alta',
      },
      cargaMinOhm: null,
      sensEntradaMv: 110,
      impedanciaEntradaOhm: 30000,
      chipsExtra: [
        { es: 'DAC', en: 'DAC' },
        { es: 'phono MM', en: 'MM phono' },
      ],
      fuentes: ['Denon (ficha oficial)'],
    },
    {
      id: 'hegel-h95',
      nombre: 'Hegel H95',
      tipo: { es: 'Integrado Clase AB, con DAC', en: 'Class AB integrated amplifier, with DAC' },
      descripcion: {
        es: '60 W en 8 Ω (1 kHz, 1% THD). Hegel no publica una potencia continua a 4 Ω — sólo declara carga mínima de 2 Ω, señal de una etapa de salida con reserva de corriente aunque sin el dato formal a 4 Ω.',
        en: 'A 60 W rating into 8 Ω (1 kHz, 1% THD). Hegel does not publish a continuous power rating at 4 Ω — it only states a 2 Ω minimum load, a sign of an output stage with current reserve even without a formal 4 Ω figure.',
      },
      potencia8OhmW: {
        valor: 60,
        fuente: { es: 'Hegel (ficha oficial)', en: 'Hegel (official spec sheet)' },
        confianza: 'alta',
        nota: { es: '1 kHz, 1% THD', en: '1 kHz, 1% THD' },
      },
      potencia4OhmW: {
        valor: 96,
        fuente: { es: 'SoundStage! / Hi-Fi News (medición)', en: 'SoundStage! / Hi-Fi News (measurement)' },
        confianza: 'baja',
        nota: {
          es: 'es una ráfaga dinámica (tono de 80 Hz, 500 ms), no una potencia continua — Hegel no publica un valor continuo a 4 Ω, sólo declara carga mínima de 2 Ω',
          en: 'this is a dynamic burst figure (80 Hz tone, 500 ms), not continuous power — Hegel does not publish a continuous 4 Ω figure, only a stated 2 Ω minimum load',
        },
      },
      cargaMinOhm: 2,
      sensEntradaMv: null,
      impedanciaEntradaOhm: null,
      chipsExtra: [
        { es: 'DAC', en: 'DAC' },
        { es: 'amort. >2000', en: 'damping >2000' },
      ],
      fuentes: ['Hegel (ficha oficial)', 'SoundStageNetwork / Hi-Fi News (medición)'],
      pendiente: {
        es: 'sensibilidad e impedancia de entrada de línea — no publicadas por Hegel para este modelo',
        en: 'line input sensitivity and impedance — not published by Hegel for this model',
      },
    },
    {
      id: 'arcam-a5',
      nombre: 'Arcam A5 (Radia)',
      tipo: { es: 'Integrado Clase AB, con phono MM', en: 'Class AB integrated amplifier, with MM phono' },
      descripcion: {
        es: '50 W en 8 Ω que suben a 75 W en 4 Ω (reserva 1,5×, por debajo del umbral 1,7×). Trae previo de phono MM; no incluye DAC.',
        en: '50 W into 8 Ω rising to 75 W into 4 Ω (1.5x reserve, below the 1.7x threshold). Includes an MM phono stage; no built-in DAC.',
      },
      potencia8OhmW: {
        valor: 50,
        fuente: { es: 'Arcam (ficha oficial)', en: 'Arcam (official spec sheet)' },
        confianza: 'alta',
      },
      potencia4OhmW: {
        valor: 75,
        fuente: { es: 'Arcam (ficha oficial)', en: 'Arcam (official spec sheet)' },
        confianza: 'alta',
      },
      cargaMinOhm: null,
      sensEntradaMv: null,
      impedanciaEntradaOhm: null,
      chipsExtra: [{ es: 'phono MM', en: 'MM phono' }],
      fuentes: ['Arcam (ficha oficial)'],
      pendiente: {
        es: 'sensibilidad e impedancia de entrada de línea — no confirmadas con certeza en la ficha pública disponible',
        en: 'line input sensitivity and impedance — not confirmed with certainty in the available public spec sheet',
      },
    },
  ],

  fuentes: [
    {
      id: 'bluesound-node-n130',
      nombre: 'Bluesound Node (N130, 2021)',
      tipo: {
        es: 'Streamer de red, DAC integrado (salida analógica)',
        en: 'Network streamer, integrated DAC (analog output)',
      },
      descripcion: {
        es: 'DAC integrado Texas Instruments PCM5242, salida analógica fija de 2,2 V. La ficha oficial no publica la impedancia de salida; confirmada directamente por soporte técnico de Bluesound en 500 Ω — alta para una salida de línea, <b>conviene revisar el puente de impedancias</b> hacia el amplificador, sobre todo con cables largos.',
        en: 'A built-in Texas Instruments PCM5242 DAC, with a fixed 2.2 V analog output. The official spec sheet does not publish the output impedance; confirmed directly by Bluesound technical support at 500 Ω — high for a line output, <b>worth checking the impedance bridge</b> to the amplifier, especially with long cables.',
      },
      salidaV: 2.2,
      impedanciaSalidaOhm: 500,
      fuente: {
        es: 'Bluesound (soporte técnico oficial, respuesta directa y atribuida)',
        en: 'Bluesound (official technical support, direct and attributed reply)',
      },
      confianza: 'media',
      chipsExtra: [
        { es: 'PCM5242', en: 'PCM5242' },
        { es: 'hasta 24/192 + MQA', en: 'up to 24/192 + MQA' },
      ],
      fuentes: [
        'Bluesound (ficha oficial) — no publica voltaje ni impedancia de salida',
        'Bluesound Support Community: Tony W. (Product Support Manager), 8 dic 2023 — ' +
          '"RCA / Analog Output Level is 2.2V @ 500 ohms Impedance" (específico del NODE N130; ' +
          'el Node 2i es distinto: 650 Ω / 0,6 V, según el mismo hilo de soporte)',
      ],
    },
    {
      id: 'wiim-pro-plus',
      nombre: 'WiiM Pro Plus',
      tipo: {
        es: 'Streamer de red, DAC integrado (salida analógica)',
        en: 'Network streamer, integrated DAC (analog output)',
      },
      descripcion: {
        es: 'DAC AKM AKM4493SEQ. La salida de línea es <b>configurable por el usuario</b> (500 mV / 800 mV / 1 V / 2 V) — acá se registra el máximo (2,0 V); el recorrido de volumen real depende de en qué nivel esté configurada. Impedancia de salida de 10 Ω medida de forma independiente (no publicada por el fabricante): baja, buen puente con casi cualquier entrada de línea.',
        en: 'AKM AKM4493SEQ DAC. The line output is <b>user-configurable</b> (500 mV / 800 mV / 1 V / 2 V) — the maximum (2.0 V) is recorded here; the actual volume headroom depends on which level it is set to. Output impedance of 10 Ω independently measured (not published by the manufacturer): low, bridging well with almost any line input.',
      },
      salidaV: 2.0,
      impedanciaSalidaOhm: 10,
      fuente: {
        es: 'WiiM (ficha oficial, voltaje máximo configurable); Hi-Fi News (medición independiente, impedancia de salida)',
        en: 'WiiM (official spec sheet, configurable maximum voltage); Hi-Fi News (independent measurement, output impedance)',
      },
      confianza: 'alta',
      chipsExtra: [
        { es: 'AKM4493SEQ', en: 'AKM4493SEQ' },
        { es: 'hasta 32/768', en: 'up to 32/768' },
        { es: 'salida configurable', en: 'configurable output' },
      ],
      fuentes: [
        'WiiM (ficha oficial / foro oficial — nivel de salida configurable: 500 mV/800 mV/1 V/2 V)',
        'Hi-Fi News (lab report, hifinews.com/content/wiim-pro-plus-lab-report — 2 V desde 10 Ω)',
      ],
    },
    {
      id: 'cambridge-cxn-v2',
      nombre: 'Cambridge Audio CXN (V2)',
      tipo: {
        es: 'Streamer de red, DAC integrado, salida RCA y XLR',
        en: 'Network streamer, integrated DAC, RCA and XLR output',
      },
      descripcion: {
        es: 'DAC doble Wolfson WM8740, salida RCA y XLR. La ficha oficial no publica voltaje ni impedancia de salida — <b>ninguna de las dos subreglas de ganancia corre</b> con este equipo.',
        en: 'A dual Wolfson WM8740 DAC, with RCA and XLR output. The official spec sheet does not publish output voltage or impedance — <b>neither of the two gain-chain sub-rules runs</b> with this unit.',
      },
      salidaV: null,
      impedanciaSalidaOhm: null,
      fuente: { es: 'Cambridge Audio (ficha oficial)', en: 'Cambridge Audio (official spec sheet)' },
      confianza: 'baja',
      chipsExtra: [
        { es: 'RCA + XLR', en: 'RCA + XLR' },
        { es: '2× WM8740', en: '2× WM8740' },
      ],
      fuentes: ['Cambridge Audio (ficha oficial)'],
      pendiente: {
        es: 'voltaje e impedancia de salida — la ficha oficial no los publica; fuentes de terceros dan valores aproximados ("~2 V") sin confirmar, así que se dejan en null en vez de asumir',
        en: 'output voltage and impedance — the official spec sheet does not publish them; third-party sources give approximate values ("~2 V") without confirmation, so they are left null instead of assumed',
      },
    },
    {
      id: 'schiit-modi-plus',
      nombre: 'Schiit Modi+',
      tipo: { es: 'DAC de escritorio, USB/coaxial/óptico', en: 'Desktop DAC, USB/coaxial/optical' },
      descripcion: {
        es: 'DAC ESS ES9018, salida fija de 2,0 V y 75 Ω de salida — impedancia moderada, típica de un DAC de escritorio sin preamplificación.',
        en: 'An ESS ES9018 DAC, with a fixed 2.0 V output and a 75 Ω output impedance — a moderate figure, typical of a desktop DAC without a preamp stage.',
      },
      salidaV: 2.0,
      impedanciaSalidaOhm: 75,
      fuente: { es: 'Schiit (ficha oficial)', en: 'Schiit (official spec sheet)' },
      confianza: 'alta',
      chipsExtra: [{ es: 'USB/coax/óptico', en: 'USB/coax/optical' }],
      fuentes: ['Schiit Audio (ficha oficial)'],
    },
    {
      id: 'topping-e30-ii',
      nombre: 'Topping E30 II',
      tipo: { es: 'DAC de escritorio, sólo RCA (sin XLR)', en: 'Desktop DAC, RCA only (no XLR)' },
      descripcion: {
        es: 'DAC doble AKM AK4493S, salida de 2,1 V y 20 Ω — impedancia de salida baja, buen puente con casi cualquier entrada de línea.',
        en: 'A dual AKM AK4493S DAC, with a 2.1 V output and 20 Ω output impedance — a low figure, bridging well with almost any line input.',
      },
      salidaV: 2.1,
      impedanciaSalidaOhm: 20,
      fuente: { es: 'Topping (ficha oficial)', en: 'Topping (official spec sheet)' },
      confianza: 'alta',
      chipsExtra: [
        { es: 'sólo RCA', en: 'RCA only' },
        { es: 'preamp con volumen', en: 'preamp with volume control' },
      ],
      fuentes: ['Topping (ficha oficial)'],
    },
    {
      id: 'cambridge-dacmagic-200m',
      nombre: 'Cambridge Audio DacMagic 200M',
      tipo: { es: 'DAC/preamp de escritorio, RCA y XLR', en: 'Desktop DAC/preamp, RCA and XLR' },
      descripcion: {
        es: 'Preamp/DAC con salida fija o variable; se usan acá los valores de RCA (no balanceada): 2,1 V y menos de 50 Ω de impedancia de salida.',
        en: 'A preamp/DAC with fixed or variable output; the unbalanced RCA figures are used here: 2.1 V and under 50 Ω of output impedance.',
      },
      salidaV: 2.1,
      impedanciaSalidaOhm: 50,
      fuente: { es: 'Cambridge Audio (ficha oficial)', en: 'Cambridge Audio (official spec sheet)' },
      confianza: 'alta',
      chipsExtra: [
        { es: 'XLR balanceada 4,2 V / 100 Ω', en: 'balanced XLR 4.2 V / 100 Ω' },
        { es: 'salida fija o variable', en: 'fixed or variable output' },
      ],
      fuentes: ['Cambridge Audio (ficha oficial)'],
    },
  ],

  cables: [
    {
      id: 'belden-5000up',
      nombre: 'Belden 5000UP (12 AWG)',
      tipo: {
        es: 'Cable de parlante, 2 conductores 12 AWG, sin blindaje',
        en: 'Speaker cable, 2-conductor 12 AWG, unshielded',
      },
      descripcion: {
        es: 'Cable de parlante de dos conductores paralelos 12 AWG, sin blindaje ni construcción especial contra la capacitancia.',
        en: 'A two-conductor parallel 12 AWG speaker cable, unshielded, with no special construction against capacitance.',
      },
      calibreAwg: 12,
      resistenciaOhmM: 0.00512,
      capacitanciaPfM: 100,
      inductanciaUhM: 0.52,
      fuente: { es: 'Belden (ficha técnica oficial)', en: 'Belden (official technical data sheet)' },
      confianza: 'alta',
      chipsExtra: [],
      fuentes: ['Belden (techdata oficial, catalog.belden.com)'],
      pendiente: {
        es: 'resistencia convertida de 1,56 Ω/1000 ft publicados por Belden; no es un valor medido aparte',
        en: 'resistance converted from the 1.56 Ω/1000 ft that Belden publishes; not a separately measured value',
      },
    },
    {
      id: 'mogami-w3082',
      nombre: 'Mogami W3082',
      tipo: {
        es: 'Cable de parlante, construcción coaxial de baja inductancia',
        en: 'Speaker cable, low-inductance coaxial construction',
      },
      descripcion: {
        es: 'Construcción coaxial que reduce la inductancia en serie frente a un cable paralelo convencional del mismo calibre.',
        en: 'A coaxial construction that reduces series inductance compared to a conventional parallel cable of the same gauge.',
      },
      calibreAwg: 14,
      resistenciaOhmM: 0.009,
      capacitanciaPfM: 253,
      inductanciaUhM: 0.4,
      fuente: { es: 'Mogami (ficha técnica oficial)', en: 'Mogami (official technical data sheet)' },
      confianza: 'alta',
      chipsExtra: [{ es: 'baja inductancia', en: 'low inductance' }],
      fuentes: ['Mogami (ficha técnica oficial)'],
      pendiente: {
        es: 'calibre "≈14 AWG" es una equivalencia aproximada: la construcción coaxial no es un AWG estándar de dos conductores',
        en: 'the "≈14 AWG" gauge is an approximate equivalence: the coaxial construction is not a standard two-conductor AWG',
      },
    },
    {
      id: 'mogami-2534',
      nombre: 'Mogami 2534 (Neglex Quad)',
      tipo: {
        es: 'Cable de interconexión balanceado (XLR), construcción quad',
        en: 'Balanced interconnect cable (XLR), quad construction',
      },
      descripcion: {
        es: 'Construcción "quad" (Neglex) con blindaje trenzado, pensada para interconexión balanceada de bajo ruido.',
        en: 'A "quad" (Neglex) construction with braided shielding, designed for low-noise balanced interconnection.',
      },
      calibreAwg: 24,
      resistenciaOhmM: 0.083,
      capacitanciaPfM: 97,
      inductanciaUhM: 0.4,
      fuente: { es: 'Mogami (ficha técnica oficial)', en: 'Mogami (official technical data sheet)' },
      confianza: 'alta',
      chipsExtra: [{ es: 'blindaje trenzado', en: 'braided shielding' }],
      fuentes: ['Mogami (ficha técnica oficial, Neglex Quad W2534)'],
    },
  ],
};
