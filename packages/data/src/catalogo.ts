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
      impedanciaMinOhm: 5,
      potenciaRecMinW: 30,
      potenciaRecMaxW: 120,
      maxSplDb: null,
      chipsExtra: [],
      fuentes: ['ELAC (ficha oficial)', 'Audio Science Review (ASR, reseña de amirm)'],
      pendiente: {
        es: 'impedancia mínima (~5 Ω) es la cifra textual de la reseña de ASR (amirm), leída del gráfico sin frecuencia exacta indicada en prosa — confianza media',
        en: "minimum impedance (~5 Ω) is ASR's (amirm) review prose figure, read off the graph without an exact frequency stated in text — medium confidence",
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
      maxSplDb: 96,
      chipsExtra: [],
      fuentes: ['Wharfedale (ficha oficial)'],
      pendiente: {
        es: 'SPL máximo (96 dB) declarado por el fabricante como "Peak SPL", no como valor continuo/RMS — no directamente comparable con equipos que reporten maxSplDb bajo otra convención',
        en: 'maximum SPL (96 dB) is manufacturer-rated as "Peak SPL," not a continuous/RMS figure — not directly comparable to equipment reporting maxSplDb under a different convention',
      },
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
    {
      id: 'wharfedale-linton-heritage',
      nombre: 'Wharfedale Linton Heritage',
      tipo: {
        es: 'Monitor de 3 vías, estantería, doble puerto trasero',
        en: '3-way standmount monitor, dual rear port',
      },
      descripcion: {
        es: 'Tweeter textil de 1" sobre medio de Kevlar tejido de 5" y woofer de Kevlar de 8". Caja de 3 vías inusualmente grande para estantería, con <b>graves generosos para el tamaño</b>. Impedancia mínima medida de forma independiente (3,4 Ω, Stereophile) confirma casi exactamente la de fábrica (3,5 Ω) — carga moderadamente exigente.',
        en: 'A 1" fabric dome tweeter over a 5" woven Kevlar midrange and an 8" Kevlar woofer. An unusually large 3-way standmount cabinet, with <b>generous bass output for its size</b>. Independently measured minimum impedance (3.4 Ω, Stereophile) confirms the factory figure (3.5 Ω) almost exactly — a moderately demanding load.',
      },
      sensibilidadDb: {
        valor: 88.1,
        fuente: { es: 'Stereophile (mediciones J. Atkinson)', en: 'Stereophile (J. Atkinson measurements)' },
        confianza: 'alta',
        nota: {
          es: 'fábrica declara 90 dB pero a 2,0 V/1m (no 2,83 V/1m estándar) — no comparable directamente; se usa el valor medido de Stereophile, ya en la referencia estándar del proyecto',
          en: 'the factory rates it at 90 dB but at 2.0 V/1m (not the standard 2.83 V/1m) — not directly comparable; the Stereophile measured figure is used instead, already in this project\'s standard reference',
        },
      },
      impedanciaNominalOhm: 6,
      impedanciaMinOhm: 3.4,
      potenciaRecMinW: 25,
      potenciaRecMaxW: 200,
      maxSplDb: 110,
      chipsExtra: [{ es: '40 Hz–20 kHz', en: '40 Hz–20 kHz' }],
      fuentes: ['Wharfedale (ficha oficial)', 'Stereophile (mediciones J. Atkinson)'],
      pendiente: {
        es: 'SPL máximo (110 dB) declarado por fábrica como pico, no continuo; no directamente comparable con equipos que reporten maxSplDb como valor continuo',
        en: 'maximum SPL (110 dB) is factory-rated as peak, not continuous — not directly comparable to equipment reporting maxSplDb as a continuous figure',
      },
    },
    {
      id: 'sonus-faber-lumina-ii',
      nombre: 'Sonus Faber Lumina II',
      tipo: { es: 'Monitor de 2 vías, estantería, puerto trasero', en: '2-way standmount monitor, rear port' },
      descripcion: {
        es: 'Domo blando DAD de 29 mm sobre medio-woofer de pulpa de celulosa de 150 mm. Impedancia nominal de 4 Ω: <b>carga más exigente que el 8 Ω habitual</b> de este catálogo, aunque sin medición independiente del mínimo real.',
        en: 'A 29 mm soft-dome DAD tweeter over a 150 mm cellulose-pulp mid-woofer. A 4 Ω nominal impedance: <b>a more demanding load than the usual 8 Ω</b> in this catalog, though without an independent measurement of the actual minimum.',
      },
      sensibilidadDb: {
        valor: 86,
        fuente: { es: 'Sonus Faber (ficha oficial)', en: 'Sonus Faber (official spec sheet)' },
        confianza: 'alta',
        nota: {
          es: "medición independiente (Erin's Audio Corner) 85,8 dB — coincide con fábrica",
          en: "independent measurement (Erin's Audio Corner) 85.8 dB — matches the factory figure",
        },
      },
      impedanciaNominalOhm: 4,
      impedanciaMinOhm: null,
      potenciaRecMinW: 30,
      potenciaRecMaxW: 150,
      maxSplDb: null,
      chipsExtra: [{ es: '55 Hz–24 kHz', en: '55 Hz–24 kHz' }],
      fuentes: ['Sonus Faber (ficha oficial)', "Erin's Audio Corner"],
      pendiente: {
        es: "impedancia mínima medida — Erin's Audio Corner publicó un gráfico de impedancia sin cifra en prosa; sin ese dato, la regla de carga devuelve 'sin-datos'. SPL máximo tampoco publicado por ninguna fuente consultada",
        en: "measured minimum impedance — Erin's Audio Corner published an impedance graph without a prose figure; without that data, the load rule returns 'no-data'. Maximum SPL is also not published by any source consulted",
      },
    },
    {
      id: 'monitor-audio-silver-50-7g',
      nombre: 'Monitor Audio Silver 50 (7G)',
      tipo: { es: 'Monitor de 2 vías, estantería, puerto trasero', en: '2-way standmount monitor, rear port' },
      descripcion: {
        es: 'Tweeter C-CAM Gold Dome de 25 mm con guía de ondas UD Waveguide II sobre medio-woofer C-CAM RST II de 133 mm. Sensibilidad e impedancia mínima <b>confirmadas casi exactas por medición independiente</b> (Hi-Fi News): 3,9 Ω a 250 Hz, coincide con la ficha oficial.',
        en: 'A 25 mm C-CAM Gold Dome tweeter with a UD Waveguide II over a 133 mm C-CAM RST II mid-woofer. Sensitivity and minimum impedance <b>confirmed almost exactly by an independent measurement</b> (Hi-Fi News): 3.9 Ω at 250 Hz, matching the official spec sheet.',
      },
      sensibilidadDb: {
        valor: 86,
        fuente: { es: 'Monitor Audio (ficha oficial)', en: 'Monitor Audio (official spec sheet)' },
        confianza: 'alta',
        nota: {
          es: "medición independiente: Erin's Audio Corner 85,5 dB; Hi-Fi News (P. Miller) 87 dB a 1 kHz / 86,6 dB promedio — ambas coinciden con fábrica dentro de 1 dB",
          en: "independent measurement: Erin's Audio Corner 85.5 dB; Hi-Fi News (P. Miller) 87 dB at 1 kHz / 86.6 dB average — both match the factory figure within 1 dB",
        },
      },
      impedanciaNominalOhm: 8,
      impedanciaMinOhm: 3.9,
      potenciaRecMinW: 40,
      potenciaRecMaxW: 100,
      maxSplDb: 104,
      chipsExtra: [{ es: '47 Hz–35 kHz', en: '47 Hz–35 kHz' }],
      fuentes: ['Monitor Audio (ficha oficial)', "Erin's Audio Corner", 'Hi-Fi News (lab report, P. Miller)'],
      pendiente: {
        es: 'Hi-Fi News mide la impedancia por debajo de 8 Ω entre 130–800 Hz y sugiere que el nominal real de trabajo es más cercano a 4 Ω; se mantiene el rótulo de fábrica (8 Ω) como nominal declarado',
        en: 'Hi-Fi News measures the impedance dipping below 8 Ω between 130–800 Hz and suggests the real working nominal is closer to 4 Ω; the factory-declared nominal (8 Ω) is kept as the labeled figure',
      },
    },
    {
      id: 'focal-vestia-n2',
      nombre: 'Focal Vestia N2',
      tipo: {
        es: 'Columna (piso) de 3 vías, doble puerto (frontal y trasero)',
        en: '3-way floorstanding column, dual port (front and rear)',
      },
      descripcion: {
        es: '<b>No es un modelo de estantería</b> — es la columna de piso de la línea Vestia (101 cm de alto), con tweeter TAM de 1" y dos woofers Slatefiber de 6,5". Todos los datos numéricos vienen de la ficha oficial, sin medición independiente que los corrobore.',
        en: "<b>Not a standmount model</b> — this is the Vestia line's floorstanding column (101 cm tall), with a 1\" TAM tweeter and two 6.5\" Slatefiber woofers. All numeric figures come from the official spec sheet, with no independent measurement corroborating them.",
      },
      sensibilidadDb: {
        valor: 91.5,
        fuente: { es: 'Focal (ficha oficial)', en: 'Focal (official spec sheet)' },
        confianza: 'media',
        nota: {
          es: 'no se encontró medición independiente (Stereophile, ASR, SoundStage) de este modelo específico',
          en: 'no independent measurement found (Stereophile, ASR, SoundStage) for this specific model',
        },
      },
      impedanciaNominalOhm: 8,
      impedanciaMinOhm: 3,
      potenciaRecMinW: 40,
      potenciaRecMaxW: 250,
      maxSplDb: null,
      chipsExtra: [{ es: '47 Hz–30 kHz', en: '47 Hz–30 kHz' }],
      fuentes: ['Focal (ficha oficial)'],
      pendiente: {
        es: 'impedancia mínima (3 Ω) sin frecuencia asociada en la ficha oficial, y sin corroborar con medición independiente — confianza más baja que el resto del dato de este equipo. SPL máximo no publicado',
        en: "minimum impedance (3 Ω) has no associated frequency in the official spec sheet, and is not corroborated by an independent measurement — lower confidence than the rest of this unit's data. Maximum SPL not published",
      },
    },
    {
      id: 'diatone-ds251-mk2',
      nombre: 'Diatone DS-251MK2',
      tipo: {
        es: 'Monitor vintage de 3 vías, suspensión acústica sellada (1973)',
        en: 'Vintage 3-way monitor, sealed acoustic suspension (1973)',
      },
      descripcion: {
        es: 'Parlante japonés vintage (Mitsubishi Diatone, 1973): woofer de 25 cm con marco die-cast de aluminio, tweeter de 5 cm y super-tweeter de 3 cm de aluminio duro. <b>Ficha de época, sin medición independiente moderna</b> — los datos vienen de archivos de catálogo, no de un manual escaneado directamente.',
        en: 'A vintage Japanese speaker (Mitsubishi Diatone, 1973): a 25 cm woofer with a die-cast aluminum frame, a 5 cm tweeter, and a 3 cm hard-aluminum super-tweeter. <b>Period spec sheet, no modern independent measurement</b> — the data comes from catalog archives, not a directly scanned manual.',
      },
      sensibilidadDb: {
        valor: 91,
        fuente: { es: 'audio-heritage.jp (archivo de catálogo)', en: 'audio-heritage.jp (catalog archive)' },
        confianza: 'media',
        nota: {
          es: 'declarada en el estándar japonés "New JIS" (1 W) de la época — no confirmado que equivalga a dB/2,83V·m estándar moderno; sin manual original escaneado que lo verifique',
          en: 'stated in the era\'s Japanese "New JIS" (1 W) standard — not confirmed to be equivalent to the modern dB/2.83V·m standard; no scanned original manual available to verify it',
        },
      },
      impedanciaNominalOhm: 8,
      impedanciaMinOhm: null,
      potenciaRecMinW: null,
      potenciaRecMaxW: null,
      maxSplDb: null,
      chipsExtra: [{ es: '3 vías, 40 Hz–25 kHz', en: '3-way, 40 Hz–25 kHz' }],
      fuentes: ['audio-heritage.jp (archivo de catálogo)', 'audio-database.com (misma familia de archivo)'],
      pendiente: {
        es: 'equipo discontinuado (~1976), sin manual original escaneado disponible. El catálogo de época sólo publica "entrada máxima" (40 W), que no equivale a un rango de potencia recomendada — se deja potenciaRecMinW/MaxW en null en vez de asumir la equivalencia. Impedancia mínima y SPL máximo tampoco se publicaban en fichas de esta época',
        en: 'discontinued equipment (~1976), no scanned original manual available. The period catalog only publishes "maximum input" (40 W), which is not the same as a recommended power range — potenciaRecMinW/MaxW are left null instead of assuming the equivalence. Minimum impedance and maximum SPL were also not published in spec sheets of this era',
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
      cargaMinOhm: 4,
      sensEntradaMv: 370,
      impedanciaEntradaOhm: 43000,
      chipsExtra: [
        { es: 'XLR balanceado', en: 'Balanced XLR' },
        { es: 'DAC ESS', en: 'ESS DAC' },
        { es: 'amort. >110', en: 'damping >110' },
      ],
      fuentes: ['Cambridge Audio (ficha oficial)', 'Stereophile', 'HiFi Engine / SpeakerDecision (agregadores)'],
      pendiente: {
        es: 'carga mínima (4 Ω) proviene de agregadores (HiFi Engine, SpeakerDecision) que citan la ficha del fabricante; no se pudo verificar contra el manual oficial en PDF (bloqueado al buscarlo) — confianza media',
        en: 'minimum load (4 Ω) comes from aggregators (HiFi Engine, SpeakerDecision) citing the manufacturer spec sheet; could not be verified against the official PDF manual (blocked when fetched) — medium confidence',
      },
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
      cargaMinOhm: 4,
      sensEntradaMv: 200,
      impedanciaEntradaOhm: 47000,
      chipsExtra: [
        { es: 'DAC', en: 'DAC' },
        { es: 'phono MM', en: 'MM phono' },
      ],
      fuentes: ['Yamaha (ficha oficial)'],
      pendiente: {
        es: 'el manual trae un selector de impedancia (IMPEDANCE SELECTOR): mínimo 4 Ω en posición LOW, 6 Ω en posición HIGH — se registra el mínimo real alcanzable (4 Ω), no el ajuste de fábrica por defecto',
        en: 'the manual documents an IMPEDANCE SELECTOR: 4 Ω minimum in the LOW position, 6 Ω in HIGH — the real achievable minimum (4 Ω) is recorded here, not the default factory setting',
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
      cargaMinOhm: 4,
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
    {
      id: 'mcintosh-mc252',
      nombre: 'McIntosh MC252',
      tipo: {
        es: 'Etapa de potencia estéreo Clase AB, con Output Autoformer',
        en: 'Class AB stereo power amplifier, with Output Autoformer',
      },
      descripcion: {
        es: 'Etapa de potencia (sin previo ni entradas de fuente): 250 W tanto en 8 Ω como en 4 Ω, <b>gracias al Output Autoformer patentado</b> que adapta la salida en vez de depender de un selector de taps o de la fuente de alimentación. Circuito balanceado de punta a punta, desde la entrada XLR hasta la salida.',
        en: 'A power amplifier (no preamp, no source inputs): 250 W into both 8 Ω and 4 Ω, <b>thanks to the patented Output Autoformer</b> that adapts the output instead of relying on a tap selector or the power supply. A fully balanced circuit from the XLR input through to the output.',
      },
      potencia8OhmW: {
        valor: 250,
        fuente: { es: 'McIntosh (ficha oficial)', en: 'McIntosh (official spec sheet)' },
        confianza: 'alta',
      },
      potencia4OhmW: {
        valor: 250,
        fuente: { es: 'McIntosh (ficha oficial)', en: 'McIntosh (official spec sheet)' },
        confianza: 'alta',
        nota: {
          es: 'idéntica a la de 8 Ω — no es un error: el Output Autoformer entrega la misma potencia nominal en 2, 4 y 8 Ω sin selector de taps',
          en: 'identical to the 8 Ω figure — not an error: the Output Autoformer delivers the same rated power into 2, 4, and 8 Ω without a tap selector',
        },
      },
      cargaMinOhm: 2,
      sensEntradaMv: 1600,
      impedanciaEntradaOhm: 10000,
      chipsExtra: [
        { es: 'entrada XLR balanceada (3200 mV / 20 kΩ)', en: 'balanced XLR input (3200 mV / 20 kΩ)' },
        { es: 'amort. 40', en: 'damping 40' },
        { es: 'bloqueo DC a la salida', en: 'DC blocking at the output' },
      ],
      fuentes: ['McIntosh (ficha oficial)', 'audio-database.com', 'manual del propietario (McIntosh)'],
      pendiente: {
        es: 'sensEntradaMv e impedanciaEntradaOhm registrados para la entrada RCA no balanceada (1600 mV / 10 kΩ); la entrada XLR balanceada tiene valores distintos (3200 mV / 20 kΩ), ver chipsExtra',
        en: 'sensEntradaMv and impedanciaEntradaOhm are recorded for the unbalanced RCA input (1600 mV / 10 kΩ); the balanced XLR input has different figures (3200 mV / 20 kΩ), see chipsExtra',
      },
    },
    {
      id: 'cayin-la34-plus',
      nombre: 'Cayin LA-34 Plus',
      tipo: {
        es: 'Integrado a válvulas, Clase AB1 push-pull, 4× EL34',
        en: 'Class AB1 push-pull tube integrated amplifier, 4× EL34',
      },
      descripcion: {
        es: '32 W por canal con 4 válvulas de salida EL34 en push-pull, cableado punto a punto. <b>Potencia modesta, típica de un integrado a válvulas</b> — rinde mejor con parlantes eficientes. Salida por transformador con taps seleccionables de 4 Ω y 8 Ω, no una carga mínima en el sentido de un ampli de estado sólido.',
        en: 'A 32 W-per-channel design with 4 EL34 output tubes in push-pull, point-to-point wired. <b>Modest power, typical of a tube integrated</b> — performs best with efficient speakers. Transformer output with selectable 4 Ω and 8 Ω taps, not a minimum load in the solid-state sense.',
      },
      potencia8OhmW: {
        valor: 32,
        fuente: { es: 'Cayin (manual del propietario)', en: "Cayin (owner's manual)" },
        confianza: 'media',
        nota: {
          es: 'THD 1% a 1 kHz. Fuente primaria (cayin.cn) no disponible al momento de verificar; dato tomado del manual replicado por retailers (Elite Audio UK, Audio Costruzioni) que coinciden entre sí',
          en: '1% THD at 1 kHz. Primary source (cayin.cn) unavailable at verification time; figure taken from the manual as republished by retailers (Elite Audio UK, Audio Costruzioni), which agree with each other',
        },
      },
      potencia4OhmW: null,
      cargaMinOhm: 4,
      sensEntradaMv: 260,
      impedanciaEntradaOhm: 100000,
      chipsExtra: [
        { es: '4× EL34 (push-pull)', en: '4× EL34 (push-pull)' },
        { es: 'cableado punto a punto', en: 'point-to-point wiring' },
        { es: 'bias externo ajustable', en: 'external bias adjustment' },
      ],
      fuentes: ['Cayin (manual del propietario, vía retailers)', 'Elite Audio UK', 'Audio Costruzioni'],
      pendiente: {
        es: 'sin dato de potencia a 4 Ω: la salida es por taps seleccionables de transformador (4 Ω/8 Ω), no una medición separada a impedancia fija — cargaMinOhm (4 Ω) refleja el tap más bajo disponible, no un mínimo soportado en el sentido de un ampli de estado sólido. Sitio oficial (cayin.cn) caído al momento de la investigación; tampoco se pudo confirmar el complemento exacto de válvulas de preamplificación (fuentes discrepan entre 12AX7+12AU7 y 5BK7A) ni el factor de amortiguación, no publicado',
        en: 'no 4 Ω power figure: the output uses selectable transformer taps (4 Ω/8 Ω), not a separate fixed-impedance measurement — cargaMinOhm (4 Ω) reflects the lowest available tap, not a solid-state-style minimum. Official site (cayin.cn) was down at research time; the exact preamp tube complement could not be confirmed either (sources disagree between 12AX7+12AU7 and 5BK7A), nor was the damping factor, which is not published',
      },
    },
    {
      id: 'advance-paris-a10-classic',
      nombre: 'Advance Paris A10 Classic',
      tipo: { es: 'Integrado Clase AB con previo a válvulas y DAC', en: 'Class AB integrated amplifier with tube preamp stage and DAC' },
      descripcion: {
        es: '130 W en 8 Ω que suben a 190 W en 4 Ω (reserva 1,46×, por debajo del umbral 1,7×). Previo a válvulas (2× ECC81/12AT7) con conmutador "High Bias" que activa polarización Clase A en los primeros vatios. Trae DAC ESS9018 integrado y entrada XLR balanceada.',
        en: '130 W into 8 Ω rising to 190 W into 4 Ω (1.46x reserve, below the 1.7x threshold). A tube preamp stage (2× ECC81/12AT7) with a "High Bias" switch that engages Class A bias for the first watts. Includes a built-in ESS9018 DAC and a balanced XLR input.',
      },
      potencia8OhmW: {
        valor: 130,
        fuente: { es: 'Advance Paris (ficha oficial)', en: 'Advance Paris (official spec sheet)' },
        confianza: 'alta',
      },
      potencia4OhmW: {
        valor: 190,
        fuente: { es: 'Advance Paris (ficha oficial)', en: 'Advance Paris (official spec sheet)' },
        confianza: 'media',
        nota: {
          es: 'no se publican condiciones de medición (THD, frecuencia) para ninguna de las dos cifras de potencia',
          en: 'no measurement conditions (THD, frequency) are published for either power figure',
        },
      },
      cargaMinOhm: null,
      sensEntradaMv: 300,
      impedanciaEntradaOhm: 47000,
      chipsExtra: [
        { es: 'conmutador High Bias (Clase A)', en: 'High Bias switch (Class A)' },
        { es: 'DAC ESS9018', en: 'ESS9018 DAC' },
        { es: 'XLR balanceado', en: 'Balanced XLR' },
      ],
      fuentes: ['Advance Paris (ficha oficial)', 'ecoustics.com', 'Dedicated Audio'],
      pendiente: {
        es: 'sensibilidad de entrada declarada como "<300 mV" (no un valor puntual exacto); carga mínima y factor de amortiguación no publicados por el fabricante',
        en: 'input sensitivity is declared as "<300 mV" (not an exact point value); minimum load and damping factor are not published by the manufacturer',
      },
    },
    {
      id: 'marantz-sr6008',
      nombre: 'Marantz SR6008',
      tipo: {
        es: 'Receptor AV Clase AB, 7 canales + 2 subwoofer (ratings de 2 canales excitados)',
        en: 'Class AB AV receiver, 7.2-channel (2-channel-driven ratings)',
      },
      descripcion: {
        es: 'Receptor AV multicanal (7 canales + 2 pre-out de subwoofer), no un integrado estéreo dedicado. <b>Se registra el rating de 2 canales excitados</b> (110 W/8 Ω, 20 Hz–20 kHz, 0,08% THD), no la cifra inflada de 1 canal a 1 kHz que usan otros fabricantes — Marantz publica esta convención de forma consistente en toda la familia. La potencia real por canal cae si se usan más de 2 canales a la vez.',
        en: 'A multichannel AV receiver (7 channels + 2 subwoofer pre-outs), not a dedicated stereo integrated. <b>The 2-channel-driven rating is recorded</b> (110 W/8 Ω, 20 Hz–20 kHz, 0.08% THD), not the inflated 1-channel-at-1kHz figure other manufacturers use — Marantz publishes this convention consistently across the family. Real per-channel power drops once more than 2 channels are driven at once.',
      },
      potencia8OhmW: {
        valor: 110,
        fuente: { es: 'Marantz (ficha oficial)', en: 'Marantz (official spec sheet)' },
        confianza: 'media',
        nota: {
          es: 'sin banco de pruebas independiente del SR6008 puntual; corroboración indirecta vía el predecesor SR6006 (misma cifra nominal), que Sound & Vision midió en 127,9 W con 2 canales excitados pero sólo 71,3 W con los 7 canales excitados — ilustra cuánto cae la potencia real fuera de estéreo puro',
          en: 'no independent bench test of the SR6008 itself; indirect corroboration via the predecessor SR6006 (same nominal figure), which Sound & Vision measured at 127.9 W with 2 channels driven but only 71.3 W with all 7 driven — illustrating how much real power drops outside pure stereo use',
        },
      },
      potencia4OhmW: null,
      cargaMinOhm: 6,
      sensEntradaMv: 200,
      impedanciaEntradaOhm: 47000,
      chipsExtra: [
        { es: 'Audyssey MultEQ XT', en: 'Audyssey MultEQ XT' },
        { es: 'HDAM / Current Feedback', en: 'HDAM / Current Feedback' },
        { es: '7 canales + 2 pre-out sub', en: '7 channels + 2 sub pre-outs' },
      ],
      fuentes: [
        'Marantz (ficha de especificaciones oficial, PDF)',
        'Sound & Vision (HT Labs Measures, SR6006 — modelo predecesor, corroboración indirecta)',
        'Marantz (soporte técnico oficial, tolerancia de carga por debajo de 6 Ω)',
      ],
      pendiente: {
        es: 'potencia a 4 Ω y factor de amortiguación: no publicados por el fabricante, no estimados. cargaMinOhm (6 Ω) es el rating del selector trasero; el soporte técnico de Marantz tolera hasta 3,2 Ω a volumen moderado, pero no lo garantiza como carga continua — se registra el valor declarado, no el tolerado',
        en: 'power at 4 Ω and damping factor: not published by the manufacturer, not estimated. cargaMinOhm (6 Ω) is the rear-panel selector rating; Marantz technical support tolerates down to 3.2 Ω at moderate volume, but does not guarantee it as a continuous load — the declared figure is recorded, not the tolerated one',
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
    {
      id: 'cambridge-axn10',
      nombre: 'Cambridge Audio AXN10',
      tipo: {
        es: 'Streamer de red, DAC integrado (salida analógica)',
        en: 'Network streamer, integrated DAC (analog output)',
      },
      descripcion: {
        es: 'DAC ESS Sabre ES9033Q, salida fija de 2,0 V. Impedancia de salida de 500 Ω — alta para una salida de línea moderna, <b>conviene revisar el puente de impedancias</b> hacia el amplificador. Plataforma de streaming StreamMagic Gen 4 (AirPlay 2, Chromecast, Roon Ready, Tidal Connect/MQA, Spotify Connect).',
        en: 'An ESS Sabre ES9033Q DAC, with a fixed 2.0 V output. A 500 Ω output impedance — high for a modern line output, <b>worth checking the impedance bridge</b> to the amplifier. StreamMagic Gen 4 streaming platform (AirPlay 2, Chromecast, Roon Ready, Tidal Connect/MQA, Spotify Connect).',
      },
      salidaV: 2.0,
      impedanciaSalidaOhm: 500,
      fuente: { es: 'Cambridge Audio (ficha oficial)', en: 'Cambridge Audio (official spec sheet)' },
      confianza: 'alta',
      chipsExtra: [
        { es: 'ESS Sabre ES9033Q', en: 'ESS Sabre ES9033Q' },
        { es: 'hasta 32/768 + DSD512', en: 'up to 32/768 + DSD512' },
        { es: 'StreamMagic Gen 4', en: 'StreamMagic Gen 4' },
      ],
      fuentes: ['Cambridge Audio (ficha técnica oficial, manuals.cambridgeaudio.com)'],
      pendiente: {
        es: 'impedancia de salida (500 Ω) es alta para una salida de línea moderna (lo típico ronda 50–100 Ω); confirmada de forma idéntica en dos consultas independientes a la misma ficha oficial, pero no se pudo abrir el manual en PDF directamente para una verificación visual adicional',
        en: 'output impedance (500 Ω) is high for a modern line output (typical figures run 50–100 Ω); confirmed identically across two independent lookups of the same official spec sheet, but the PDF manual could not be opened directly for additional visual verification',
      },
    },
    {
      id: 'wadia-121',
      nombre: 'Wadia 121 Decoding Computer',
      tipo: {
        es: 'DAC/preamp de escritorio con etapa de audífonos, salida ajustable en 3 pasos',
        en: 'Desktop DAC/preamp with headphone stage, 3-step adjustable output',
      },
      descripcion: {
        es: 'DAC ESS9018 (Sabre32) con re-muestreo propietario DigiMaster a 32-bit/1,4 MHz antes de la conversión. Salida <b>ajustable en tres pasos</b> (1,0/2,0/4,0 V nominal) — acá se registra el máximo medido (3,48 V); el recorrido de volumen real depende de en qué paso esté configurada. Descontinuado (Wadia cerró como marca); DAC confirmado por desarme técnico, no por ficha oficial vigente.',
        en: 'An ESS9018 (Sabre32) DAC with proprietary DigiMaster re-sampling to 32-bit/1.4 MHz before conversion. A <b>3-step adjustable output</b> (1.0/2.0/4.0 V nominal) — the measured maximum (3.48 V) is recorded here; the actual volume headroom depends on which step it is set to. Discontinued (Wadia closed as a brand); the DAC chip is confirmed by a technical teardown, not a current official spec sheet.',
      },
      salidaV: 3.48,
      impedanciaSalidaOhm: 48,
      fuente: { es: 'Stereophile (mediciones J. Atkinson)', en: 'Stereophile (J. Atkinson measurements)' },
      confianza: 'alta',
      chipsExtra: [
        { es: 'ESS9018 Sabre32', en: 'ESS9018 Sabre32' },
        { es: 'hasta 24/192 (AES/EBU, coax, óptico, USB)', en: 'up to 24/192 (AES/EBU, coax, optical, USB)' },
        { es: 'etapa de audífonos Clase A', en: 'Class A headphone stage' },
      ],
      fuentes: [
        'Stereophile (especificaciones y mediciones, J. Atkinson)',
        'Wadia (ficha oficial / manual de época, ~2012)',
        'avmentor.net (desarme técnico)',
      ],
      pendiente: {
        es: 'salida ajustable en 3 pasos (1,0/2,0/4,0 V nominal; medido por Stereophile en 0,871/1,74/3,48 V) — se registra el máximo medido, mismo criterio que el WiiM Pro Plus. La salida XLR mide aproximadamente el doble de impedancia que la RCA (~96 Ω); se registra el valor RCA (48 Ω). Potencia e impedancia de carga de la salida de audífonos no publicadas en ninguna fuente consultada',
        en: 'output adjustable in 3 steps (1.0/2.0/4.0 V nominal; measured by Stereophile at 0.871/1.74/3.48 V) — the measured maximum is recorded here, the same criterion used for the WiiM Pro Plus. The XLR output measures roughly double the impedance of the RCA (~96 Ω); the RCA figure (48 Ω) is recorded. Headphone output power and load impedance are not published in any source consulted',
      },
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
