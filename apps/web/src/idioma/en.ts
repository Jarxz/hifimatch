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
    dimensionesTitulo: 'Room dimensions',
    ancho: 'Width (front)',
    largo: 'Length (depth)',
    alto: 'Height',
    nivelEscucha: 'Listening level',
    nivelModerado: 'Moderate',
    nivelAlto: 'Loud',
    nivelReferencia: 'Reference',
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
    plano: {
      titulo: 'Layout, listening position and reflections',
      texto:
        'Symmetric layout calculated from the room dimensions. The sweet spot is the apex of the triangle with the speakers; the points marked on the side walls are the first reflections worth treating.',
      leyendaTriangulo: 'listening triangle',
      leyendaReflexion: '1st reflection',
      leyendaParlante: 'speaker / listening position',
      muroFrontal: 'FRONT WALL',
      puntoDulce: 'sweet spot',
      primeraReflexionCorta: '1st refl.',
      fuente:
        'Prediction from a rigid, rectangular room geometry. It gets refined by listening and measuring in the real space; it does not replace that verification.',
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
    },

    carga: {
      titulo: 'The load the amplifier sees',
      verdicto: {
        'sin-dato': 'No data',
        'exige-corriente': 'Demands current',
        cubierto: 'Covered',
        'carga-benigna': 'Benign load',
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
      eje: { ancho: 'width', largo: 'length', alto: 'height' },
      textoOk: (p) =>
        `The room's bass resonances are reasonably distributed below ${p.techo} Hz — no coincidences reinforcing a particular frequency were found.`,
      textoWarn: (p) =>
        `${p.n} mode pair(s) fall within the clustering threshold below ${p.techo} Hz — a sign of bass reinforcement at those frequencies.`,
      filaModo: (p) => `${p.eje} · order ${p.orden} · <b>${p.frecuencia} Hz</b>`,
      parAgrupado: (p) => `${p.a} (${p.frecuenciaA} Hz) and ${p.b} (${p.frecuenciaB} Hz)`,
      fuente: (p) =>
        `<b>Criterion:</b> rigid, rectangular room model, axial modes only. Clustering = two modes on different axes within ${p.umbral}% of each other, below ${p.techo} Hz — a site criterion, not a published convention; verified by measuring/listening.`,
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
  },

  catalogo: {
    min: 'min',
    max: 'max',
    salida: 'output',
    confianza: { alta: 'high', media: 'medium', baja: 'low' },
  },
};
