/**
 * English translation. Must match `Textos` (the shape of `es.ts`) exactly —
 * a missing key, an extra key, or a function with a different parameter
 * shape is a compile error, not a blank string on screen.
 */
import type { Textos } from './es.ts';

export const en: Textos = {
  meta: {
    lang: 'en',
    titulo: 'Cadena · hi-fi compatibility',
    descripcion: 'Analyzes whether a hi-fi system is compatible with itself and what it delivers in your room.',
  },

  comun: {
    idiomaAria: 'Change language',
  },

  splash: {
    entrarAria: 'Enter the compatibility analysis',
    subtitulo: 'hi-fi compatibility analysis',
    cta: 'Analyze a system',
    pie: 'based on physics · measured specs · no taste opinions',
  },

  config: {
    hs: 'Configure',
    volver: '← Back',
    lead: 'Define the chain',
    leadNote:
      'Pick an amplifier and a pair of speakers, and give the room its dimensions. The analysis calculates the power the system needs in that space and proposes a layout.',
    parlantes: 'Speakers',
    amplificador: 'Amplifier',
    streamer: 'Streamer',
    dac: 'DAC',
    requerido: 'required',
    opcionalFuente: 'optional',
    selectPlaceholder: '— Select —',
    fuentePlaceholder: '— None (optional) —',
    masParlantes: 'More speakers · coming soon',
    masAmplificadores: 'More amplifiers · coming soon',
    masStreamers: 'More streamers · coming soon',
    masDacs: 'More DACs · coming soon',
    verFicha: 'Product page · coming soon',
    dimensionesTitulo: 'Room dimensions',
    ancho: 'Width (front)',
    largo: 'Length (depth)',
    alto: 'Height',
    materialesTitulo: 'Room materials',
    muroFrontal: 'Front wall',
    muroPosterior: 'Rear wall',
    muroIzquierdo: 'Left wall',
    muroDerecho: 'Right wall',
    piso: 'Floor material',
    techo: 'Ceiling material',
    materiales: {
      hormigon: 'Concrete',
      vidrio: 'Glass / window',
      madera: 'Wood',
      yesoCarton: 'Drywall',
      panelAcustico: 'Acoustic panel',
      vacio: 'Open (no wall)',
      maderaLaminado: 'Laminate wood',
      porcelanato: 'Porcelain tile',
      alfombra: 'Carpet',
    },
    nivelEscucha: 'Listening level',
    nivelModerado: 'Moderate',
    nivelAlto: 'Loud',
    nivelReferencia: 'Reference',
    genero: 'Music genre',
    generoRockPop: 'Rock/Pop',
    generoJazzVocal: 'Jazz/Vocal',
    generoClasica: 'Classical',
    distanciaResultante: 'Resulting listening distance',
    volumenPrefix: 'volume',
    proximamente: 'Coming soon',
    subwoofer: 'Subwoofer',
    cables: 'Cables',
    faltaElegir: (p) => `Still need to pick ${p.que}`,
    faltaParlantes: 'speakers',
    faltaAmplificador: 'an amplifier',
    faltaY: ' and ',
    analizar: 'Analyze',
  },

  resultado: {
    hs: 'Result',
    volver: '← Change system',
    cadena: 'The chain',
    itemParlantes: 'Speakers',
    itemAmplificador: 'Amplifier',
    itemStreamer: 'Streamer',
    itemDac: 'DAC',
    sala: 'Room',
    anchoLargo: 'Width × length',
    alto: 'Height',
    distanciaEscucha: 'Listening distance',
    nivel: 'Level',
    picoObjetivo: 'Target peak',
    evaluacion: 'Evaluation',
    capaFisica: 'Physical layer',
    geometria: 'Geometry',
    disposicionReferencia: 'Reference layout',
    verDetalle: 'View technical detail',
    plano: {
      titulo: 'Isometric view, listening position and reflections',
      texto:
        'Symmetric layout calculated from the room dimensions, drawn as a wireframe cube to scale. The sweet spot is the apex of the triangle with the speakers; each point marked on a surface is a first reflection (side, rear, ceiling, or floor), with the total path distance speaker→surface→listener. A wall declared "open" draws no reflection there — the sound does not come back, it escapes.',
      leyendaTriangulo: 'listening triangle',
      leyendaReflexion: 'reflection (with distance)',
      leyendaParlante: 'speaker / listening position',
      muroFrontalCorto: 'FRONT',
      muroPosteriorCorto: 'REAR',
      muroIzquierdoCorto: 'LEFT',
      muroDerechoCorto: 'RIGHT',
      aberturaSufijo: ' (open)',
      puntoDulce: 'sweet spot',
      fuente:
        "Prediction from a rigid, rectangular room geometry, mirror-image method. Ceiling and floor reflections assume the speaker and the listener's ears are at the same height (1.0 m, a site criterion) — not a measurement of your actual setup. It gets refined by listening and measuring in the real space; it does not replace that verification.",
      vista: 'View',
      vistaIsometrica: 'Isometric',
      vistaFrontal: 'Front',
      vistaLateral: 'Side',
      vistaSuperior: 'Top',
      ubicacionTitulo: 'Reference speaker placement',
      ubicacion: (p: { frontal: string; lateral: string; separacion: string }): string =>
        `Distance to the front wall: <b>${p.frontal} m</b>. Distance to each side wall: <b>${p.lateral} m</b>. Distance between speakers: <b>${p.separacion} m</b>. This is the reference layout the rest of the analysis uses (power, modes, reflections) — it gets refined by moving the speakers and listening in the real space.`,
    },
    footer: {
      html:
        '<b>Analysis based on published physics.</b> Every data point carries its source and its confidence ' +
        'level. The power calculation assumes pair summation (+6&nbsp;dB) and room gain (+3&nbsp;dB), which ' +
        'are verified by measuring. No judgments of tone, soundstage, or sonic synergy are made: that is not ' +
        'calculated.<br>' +
        "If you add a digital source (streamer or DAC), the impedance bridge uses the industry's 10:1 " +
        'convention; the volume-headroom threshold (10×) is a site criterion, meant to be verified by ' +
        'listening.<br>' +
        'Starter database of popular, well-measured gear. When the factory sensitivity is measured half-space ' +
        'and overstates it, the independent anechoic measurement is used instead.',
    },
  },

  motor: {
    potencia: {
      titulo: 'Power against the room’s peaks',
      escalaInsuficiente: 'insufficient',
      escalaEje: 'margin over the peak (dB)',
      escalaSobra: 'to spare',
      verdicto: {
        'con-margen': 'With margin',
        justo: 'Tight',
        insuficiente: 'Insufficient',
      },
      simple: {
        'con-margen': (p) =>
          `More power than needed: at this level, the amplifier is only using ${p.porcentaje}% of its capacity — plenty of margin left for loud peaks without distortion.`,
        justo: (p) =>
          `Tight power margin: at this level, the amplifier is already using close to ${p.porcentaje}% of its capacity — the most dynamic passages run right at the limit.`,
        insuficiente: (p) =>
          `Not enough power: reaching this peak would require ${p.porcentaje}% of the amplifier's capacity, more than it has available — risk of clipping on peaks.`,
      },
      conMargen: (p) =>
        `The ${p.amp} delivers the peaks at <b>${p.nivel}</b> level with <b>${p.margenDb} dB</b> of margin at ${p.distM} m. Plenty of headroom.`,
      justoTexto: (p) =>
        `It reaches the peaks at <b>${p.nivel}</b> level, but with only <b>${p.margenDb} dB</b> of margin. On the strongest transients it's at the limit.`,
      insuficienteTexto: (p) =>
        `It's <b>${p.margenAbsDb} dB</b> short of the peaks at <b>${p.nivel}</b> level at ${p.distM} m. At that volume the amplifier clips.`,
      calc: (p) =>
        `Available SPL = ${p.sens} − 20·log₁₀(${p.distM}) + 10·log₁₀(${p.p8}) + 6 <span style="color:var(--faint)">pair</span> + 3 <span style="color:var(--faint)">room</span> = <b>${p.splDb} dB</b><br>` +
        `peak target (${p.nivel}) = <b>${p.picoDb} dB</b><br>` +
        `margin = ${p.splDb} − ${p.picoDb} = <b>${p.margenSigno} dB</b>`,
      avisoRecMin: (p) =>
        `The manufacturer recommends ${p.recomendadaW} W or more for this speaker; the amplifier delivers ${p.entregadaW} W.`,
      fuente: (p) =>
        `<b>Sensitivity source:</b> ${p.sensFuente}${p.sensNota} <span class="conf">${p.sensConf} confidence</span><br>` +
        `<b>Power source:</b> ${p.potFuente} (RMS, 8 Ω) <span class="conf">${p.potConf} confidence</span>`,
      crestFactor: (p) =>
        `With the typical crest factor for <b>${p.genero}</b> (~${p.crestFactorDb} dB peak-to-average), the peak above implies listening at an average of around <b>${p.nivelPromedio} dB</b>. This is a typical genre value, not the specific recording you're playing.`,
    },

    carga: {
      titulo: 'The load the amplifier sees',
      verdicto: {
        'sin-dato': 'No data',
        'exige-corriente': 'Demands current',
        cubierto: 'Covered',
        'carga-benigna': 'Benign load',
      },
      simple: {
        'sin-dato': 'Not enough data to assess this load.',
        'exige-corriente': 'This pairing demands more current than this amplifier has in reserve.',
        cubierto: 'The amplifier handles this load well.',
        'carga-benigna': 'An easy load, no risk to the amplifier.',
      },
      sinDatosTexto:
        'There is no precise measurement of this speaker’s minimum impedance. Independent measurements do not report critical dips, but <b>a missing data point is never counted as a pass</b>.',
      sinDatosAviso: 'A missing data point does not count as approved. <b>Pending:</b> measured impedance curve.',
      sinDatosFuente: (p) =>
        `<b>Source:</b> nominal impedance ${p.nomZ} Ω (factory). Minimum: not measured. <span class="conf">low confidence</span>`,
      warnTexto: (p) =>
        `The impedance dips to <b>${p.minZ} Ω</b>, right where the bass demands more current. With a modestly powered amplifier the bass can feel soft or uncontrolled.`,
      warnAviso:
        'An amplifier that <b>doubles its power going from 8 to 4 Ω</b> (reserve ≥1.7×) is a good fit, or one that delivers <b>60 W or more</b> into 8 Ω — a sign of good current delivery.',
      duroPrefix: (p) => `The impedance dips to <b>${p.minZ} Ω</b>, a demanding load, but this amplifier `,
      duroClauseConReserva: 'has current reserve (it nearly doubles its power into 4 Ω) and controls it.',
      duroClauseConDatoP4: (p) =>
        `even though its 4 Ω reserve (${p.ratio}×) falls short of the 1.7× threshold, delivers enough power (≥60 W into 8 Ω) to control it.`,
      duroClauseSinDatoP4:
        'has no data on how much its power rises into 4 Ω, but delivers enough power (≥60 W into 8 Ω) to control it.',
      benignaTexto: 'The impedance stays high; it is an easy load for any amplifier.',
      fuente: (p) =>
        `<b>Source:</b> nominal impedance ${p.nomZ} Ω, minimum ${p.minZ} Ω (factory / measurement). <span class="conf">medium confidence</span>`,
    },

    puente: {
      tituloStreamer: 'Impedance bridge: streamer → amplifier',
      tituloDac: 'Impedance bridge: DAC → amplifier',
      verdicto: {
        'sin-dato': 'No data',
        'puente-correcto': 'Bridge correct',
        'puente-ajustado': 'Bridge tight',
        'puente-insuficiente': 'Bridge insufficient',
      },
      simple: {
        'sin-dato': 'Missing data to assess this pairing.',
        'puente-correcto': 'The signal passes well from the source to the amplifier.',
        'puente-ajustado': 'The pairing works, but with less margin than ideal.',
        'puente-insuficiente': 'Signal is lost between the source and the amplifier.',
      },
      sinDatosTexto: (p) =>
        `The output impedance of <b>${p.fuente}</b> or the input impedance of <b>${p.amp}</b> is missing. Without both data points the bridge cannot be asserted as correct.`,
      sinDatosAviso:
        'A missing data point does not count as approved. <b>Pending:</b> source output impedance or amplifier input impedance.',
      calc: (p) => `ratioZ = Z input(${p.amp}) / Z output(${p.fuente}) = ${p.inZ} / ${p.outZ} = <b>${p.ratio}×</b>`,
      okTexto: (p) =>
        `The amplifier’s input is <b>${p.ratio}×</b> the source’s output impedance — above the ${p.umbral}:1 convention for transferring the signal without perceptible loss.`,
      warnTexto: (p) =>
        `The amplifier’s input is only <b>${p.ratio}×</b> the source’s output impedance — below the ${p.umbral}:1 convention. With long or high-capacitance cables there can be measurable level or bass loss.`,
      warnAviso: 'A source with lower output impedance helps, or short, low-capacitance interconnect cables.',
      alertTexto: (p) =>
        `The amplifier’s input impedance is lower than the source’s output impedance (<b>${p.ratio}×</b>) — the source has no margin to drive that input. Significant level loss.`,
      alertAviso:
        'This pairing does not transfer the signal correctly. Consider another source or an intermediate preamp with low output impedance.',
      fuente: (p) =>
        `<b>Convention:</b> voltage bridging ≥${p.umbral}:1 (Rane “Sound System Interconnection”; Whitlock / Jensen Transformers) — not a spec of the equipment, an audio engineering convention. <span class="conf">${p.confianza} confidence</span>`,
    },

    recorrido: {
      tituloStreamer: 'Volume headroom: streamer',
      tituloDac: 'Volume headroom: DAC',
      verdicto: {
        'sin-dato': 'No data',
        insuficiente: 'Insufficient',
        'recorrido-sano': 'Healthy headroom',
        'recorrido-corto': 'Short headroom',
      },
      simple: {
        'sin-dato': 'Missing data to assess volume headroom.',
        insuficiente: 'Volume won’t reach the level you need.',
        'recorrido-sano': 'You’ll use a comfortable range of the volume dial.',
        'recorrido-corto': 'You’ll move the volume within a very small range of the dial.',
      },
      sinDatosTexto: (p) =>
        `The output voltage of <b>${p.fuente}</b> or the input sensitivity of <b>${p.amp}</b> is missing.`,
      sinDatosAviso:
        'A missing data point does not count as approved. <b>Pending:</b> source output voltage or amplifier input sensitivity.',
      calc: (p) => `marginV = outputV(${p.fuente}) / inputSens(${p.amp}) = ${p.salidaV} / ${p.sensV} = <b>${p.margen}×</b>`,
      okTexto: (p) =>
        `The source delivers <b>${p.margen}×</b> the voltage the amplifier needs for its rated power — healthy volume headroom.`,
      warnTexto: (p) =>
        `The source delivers <b>${p.margen}×</b> more voltage than the amplifier needs — only a small fraction of the volume knob’s travel gets used. The system works, with less volume resolution in the usual listening range.`,
      alertTexto: (p) =>
        `The source delivers only <b>${p.margen}×</b> the voltage the amplifier needs for its rated power — not enough. The margin the power rule calculated is no longer valid with this source connected.`,
      alertAviso: 'A source with higher output voltage helps, or check whether an intermediate preamp stage is missing.',
      fuente: (p) =>
        `<b>Headroom threshold:</b> ${p.umbral}× — a site criterion, not a published convention; verified by listening. <span class="conf">${p.confianza} confidence</span>`,
    },

    modos: {
      titulo: 'Room modes (bass)',
      verdicto: {
        'modos-distribuidos': 'Well distributed',
        'modos-agrupados': 'Clustered modes',
      },
      simple: {
        'modos-distribuidos': 'The room’s bass is reasonably even.',
        'modos-agrupados': 'Some bass frequencies will likely sound reinforced.',
      },
      eje: { ancho: 'width', largo: 'length', alto: 'height' },
      textoOk: (p) =>
        `The room's bass resonances are reasonably distributed below ${p.techo} Hz — no coincidences reinforcing a particular frequency were found.`,
      textoWarn: (p) =>
        `${p.n} mode pair(s) fall within the clustering threshold below ${p.techo} Hz — a sign of bass reinforcement at those frequencies.`,
      parAgrupado: (p) => `${p.a} (${p.frecuenciaA} Hz) and ${p.b} (${p.frecuenciaB} Hz)`,
      fuente: (p) =>
        `<b>Criterion:</b> rigid, rectangular room model, axial modes only. Clustering = two modes on different axes within ${p.umbral}% of each other, below ${p.techo} Hz — a site criterion, not a published convention; verified by measuring/listening.`,
      sugerencia:
        'Try repositioning the speakers or the listening spot, or treat those frequencies acoustically — verified by listening and measuring in the real space. A parametric filter (active EQ) centered near those frequencies can also attenuate the buildup, but tuning it well requires measuring the real room: this model doesn’t have measured amplitude or phase to propose a specific Q or dB cut.',
      curvaOrden: (p) => `order ${p.orden} (${p.frecuencia} Hz)`,
      curvasCaption:
        'Relative pressure along each affected axis — only the lowest-frequency clusters (the most audible and hardest to treat). Independent 1D curves per axis, not a combined room map.',
    },

    reverberacion: {
      titulo: 'Estimated reverberation time (RT60)',
      nombreCorto: 'Reverberation',
      verdicto: {
        'rt60-corto': 'Too dry',
        'rt60-ok': 'In range',
        'rt60-largo': 'Too live',
      },
      simple: {
        'rt60-corto': 'The room absorbs a lot — it can sound dull, airless.',
        'rt60-ok': 'The reverberation time is in a comfortable range for listening.',
        'rt60-largo': 'The room reflects a lot — it can sound echoey or smeared.',
      },
      texto: (p) =>
        `Estimated RT60: <b>${p.rt60} s</b>. The declared comfortable range for critical listening in a domestic room is ${p.min}–${p.max} s (a concert hall aims much higher, ~1.5–2.5 s, because it's a different kind of space).`,
      superficies: {
        frontal: 'Front wall',
        posterior: 'Rear wall',
        izquierdo: 'Left wall',
        derecho: 'Right wall',
        piso: 'Floor',
        techo: 'Ceiling',
      },
      calc: (p) =>
        p.filas.map((f) => `${f.nombre}: ${f.superficie} m² × ${f.alpha} = ${f.absorcion} sabins`).join('<br>') +
        `<br>Total absorption: <b>${p.absorcionTotal} sabins</b><br>` +
        `RT60 = 0.161 × ${p.volumen} / ${p.absorcionTotal} = <b>${p.rt60} s</b>`,
      fuente:
        "<b>Formula:</b> Sabine's equation, RT60 = 0.161·V/A (V = volume, A = total absorption in sabins), summed surface by surface — not a single coefficient for the whole room, not even a single \"wall\" value: each wall is oriented and declared separately. Per-material absorption coefficients are a site criterion: typical values from architectural acoustics literature (mid-band, ~500 Hz–1 kHz), not a measurement of your real room. \"Open\" uses Sabine's historical reference coefficient for an opening (α=1.0: nothing that reaches it comes back into the room). Verified by measuring with an SPL meter or an RT60 app.",
      avisoVacio: (p) =>
        `<b>Wall(s) declared open:</b> ${p.muros}. They don't reflect sound — that's why the reverberation calculated above drops, and the isometric view draws no reflection for that wall. The room modes (resonances) in the card above are <b>not adjusted</b> for an opening: they still assume rigid walls at both ends of each axis, so the resonance calculated on that wall's axis is less representative than in a closed room.`,
    },

    puntaje: {
      titulo: 'Match score',
      rotulo: 'Editorial criterion, not physics',
      componente: {
        potencia: 'Power',
        carga: 'Load',
        puente: 'Impedance bridge',
        recorrido: 'Volume headroom',
        modos: 'Room modes',
      },
      filaIncluida: (p) => `${p.nombre}: ${p.puntos}/10`,
      filaExcluida: (p) => `${p.nombre}: not enough data, excluded`,
      aviso: (p) => `Calculated over ${p.evaluados} of ${p.total} components — the rest lacked enough data and were not included (neither added nor subtracted).`,
      criterio:
        '<b>Editorial criterion, not a measured figure:</b> combines the severities above with weights this site declares — power 30% · load 25% · impedance bridge 17% · volume headroom 13% · room modes 15%. Another reasonable criterion would weigh things differently.',
    },

    resumen: {
      titulo: 'In summary',
      comportamiento: {
        ok: (p) => `The system as a whole works well: most of the evaluated aspects are resolved, with a score of ${p.puntaje}/10.`,
        warn: (p) => `The system works, but a few points are worth checking before calling it done — score ${p.puntaje}/10.`,
        alert: (p) => `The system has several points worth resolving before considering it a good match — score ${p.puntaje}/10.`,
      },
      fortalezasTitulo: 'What works well',
      debilidadesTitulo: 'What’s worth checking',
      sinDatosTitulo: 'Not enough data',
      recomendacionTitulo: 'Recommendations',
      resumenConteo: (p) => `Out of ${p.evaluados} evaluated components: ${p.fortalezas} with no concerns and ${p.debilidades} worth checking.`,
      itemFortaleza: (p) => `${p.nombre}: ${p.verdicto}`,
      itemConDetalle: (p) => `${p.nombre}: ${p.verdicto} (${p.detalle})`,
      itemSinDatos: (p) => `${p.nombre}: not evaluated — missing the manufacturer data this rule needs.`,
      sinFortalezas: 'No evaluated component came out with no concerns.',
      sinDebilidades: 'No evaluated component came out with something worth checking.',
      recomendacionConAviso: (p) => `<b>${p.nombre}:</b> ${p.aviso}`,
      recomendacionTodoOk:
        'Nothing pending among what was evaluated, given the available data. Still worth listening and measuring in the real space — the prediction doesn’t replace that check.',
    },
  },

  catalogo: {
    min: 'min',
    max: 'max',
    salida: 'output',
    confianza: { alta: 'high', media: 'medium', baja: 'low' },
  },
};
