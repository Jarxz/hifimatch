/**
 * English translation. Must match `Textos` (the shape of `es.ts`) exactly —
 * a missing key, an extra key, or a function with a different parameter
 * shape is a compile error, not a blank string on screen.
 */
import type { Textos } from './es.ts';

export const en: Textos = {
  meta: {
    lang: 'en',
    titulo: 'The Hifi Match · hi-fi compatibility',
    descripcion: 'Analyzes whether a hi-fi system is compatible with itself and what it delivers in your room.',
  },

  comun: {
    idiomaAria: 'Change language',
    infoAria: 'View information',
    cerrarAria: 'Close',
  },

  contacto: {
    boton: 'Contact',
    titulo: 'Contact',
    intro: 'Found a spec that looks off, or have a suggestion? Write to us.',
    campoNombre: 'Name (optional)',
    campoEmail: 'Your email',
    campoMensaje: 'Message',
    enviar: 'Send',
    enviando: 'Sending…',
    exito: "Message sent. Thanks — we'll read it.",
    error: {
      'honeypot': "Couldn't send the message. Try again.",
      'muy-rapido': 'Try again in a moment.',
      'email-invalido': 'Check the email format.',
      'mensaje-vacio': "The message can't be empty.",
      'mensaje-largo': "The message is too long — try shortening it.",
      'metodo-invalido': "Couldn't send the message. Try again.",
      'error-servidor': "Couldn't send the message. Try again in a moment.",
    },
    fallbackMailtoHtml: (p) =>
      `This page is open as a local file, so it can't send directly from here. <a href="${p.mailto}">Open your email client</a> with the message already loaded.`,
  },

  splash: {
    entrarAria: 'Enter the compatibility analysis',
    subtitulo: 'hi-fi compatibility analysis',
    cta: 'Analyze a system',
    pie: 'based on physics · measured specs',
    cierreHtml: '<b>The Hifi Match</b> gives you the information.<br>You listen and decide.',
    version: 'V6.08.26',
  },

  info: {
    hs: 'Analysis guide',
    boton: 'Info',
    volver: '← Back to the analysis',
    titulo: 'How to read this analysis',
    intro:
      "This page explains what each result card means and where each number comes from — so the analysis can be read with your own judgment, not just by trusting the final verdict.",
    capas: {
      titulo: 'Two kinds of claim: physical and editorial criterion',
      cuerpoHtml:
        "Everything this site states belongs to one of two categories, and it always declares which. <b>Physical layer:</b> has a formula, a threshold, a data source, and a confidence level — it's refutable, someone can argue a threshold with evidence. It's almost everything you see (power, load, impedance bridge, room modes, reverberation). <b>Editorial-criterion layer:</b> preferences this site declares from its own judgment, not a measurement — today it's just the 1-10 score, which combines the severities above with weights this site chose. Another reasonable site would weigh things differently, and that wouldn't make it \"less correct\": it's a declared opinion, not a fact. The two layers are never mixed visually — every card states which one it is.",
    },
    confianza: {
      titulo: 'Source and confidence of every data point',
      cuerpoHtml:
        "Manufacturers publish some specs poorly — a streamer/DAC's output impedance is almost never on the spec sheet, speaker sensitivity is sometimes measured under optimistic conditions. That's why every catalog entry carries where it came from and a confidence level (<b>high/medium/low</b>): high when it comes from the official spec sheet or an independent measurement that confirms it; medium or low when it has to be inferred or only one source exists. <b>A missing data point is never shown as if the gear were \"fine\"</b> — if a rule is missing the data it needs, that card is hidden from the main analysis and listed under \"Not enough data\" at the end. A gap is never filled with an invented \"market standard\": the real spread of specs across gear (e.g. source output impedance ranging from 10 Ω to 500 Ω) means any single value would, in practice, be a made-up number.",
    },
    potencia: {
      titulo: 'Power versus the room\'s peaks',
      cuerpoHtml:
        "The question this card answers: does the amplifier deliver the peak level (SPL) the room asks for, at the real listening distance? It's calculated from speaker sensitivity, amplifier power, and distance, adding a typical boost for a stereo pair (+6 dB) and for a small room (+3 dB) — two declared assumptions, not equipment data, verified by measuring. The result is a <b>margin in dB</b> over the target peak of the chosen listening level (moderate/loud/reference). The card's short line re-expresses that margin as the <b>% of the amplifier's capacity</b> that peak demands — more intuitive than a dB figure: at +6 dB margin, the amplifier is only using a fraction of what it has; a negative margin would demand over 100% of its capacity, meaning it would clip on peaks.",
    },
    carga: {
      titulo: 'The load the amplifier sees',
      cuerpoHtml:
        "A speaker's impedance isn't one fixed number — it dips at certain frequencies, and that dip (minimum impedance) is what actually demands current from the amplifier, not the nominal impedance on the spec sheet. This card compares that minimum impedance against what the amplifier can sustain: if the load is demanding (low minimum impedance), the result depends on whether the amplifier has <b>current reserve</b> (doubles its power when impedance halves, a sign of a robust power supply) or simply has <b>raw power</b> to spare. When the manufacturer doesn't publish the speaker's minimum impedance, the card is hidden from the main analysis — it's listed under \"Not enough data\".",
    },
    ganancia: {
      titulo: 'Impedance bridge and volume headroom',
      cuerpoHtml:
        "When you pick a streamer or a DAC, there are two \"gain chain\" questions the source and the amplifier have to resolve between them. <b>Impedance bridge:</b> industry convention asks for the amplifier's input impedance to be at least 10 times the source's output impedance (ratioZ ≥ 10:1) — if that's not met, bass rolls off and channel separation suffers. <b>Volume headroom:</b> compares the source's output voltage against what the amplifier needs to reach full power — if the source delivers far more voltage than needed, the amplifier's volume control ends up \"short\", usable across only a small range before hitting the top. Streamer and DAC are each evaluated separately, in their own pair of cards.",
    },
    modos: {
      titulo: 'Room modes (bass resonances)',
      cuerpoHtml:
        "Every rectangular room reinforces certain bass frequencies based on its three dimensions — these are <b>axial modes</b>, resonances that appear because the room's width, length, and height \"fit\" certain wavelengths. When two modes on different axes land very close in frequency (within 5%, below 150 Hz — both thresholds declared by this site, not a published convention), that reinforcement stands out more: it's a frequency where the room will likely sound \"fatter\" or more resonant than the rest of the bass range. This rule never returns \"error\" severity — it's a prediction from rigid room geometry, which gets things wrong easily and always gets verified by measuring or listening in the real space.",
    },
    reverberacion: {
      titulo: 'Estimated reverberation time (RT60)',
      cuerpoHtml:
        "RT60 is how long sound takes to decay 60 dB after the source cuts off — a room with a lot of reverberation sounds \"live\", echoey; one with too little sounds \"dry\", dull. It's calculated with Sabine's equation from the room's volume and the absorption of each surface (the 4 walls separately, floor, and ceiling), each with whatever material you pick — concrete and glass reflect a lot, acoustic panel and carpet absorb a lot, and a wall declared \"open\" (a real opening) absorbs like an open window: nothing that reaches it comes back into the room. The declared comfortable range for critical listening is 0.3–0.6 seconds.",
    },
    plano: {
      titulo: 'Isometric view and early reflections',
      cuerpoHtml:
        "The diagram draws the room to scale, with the speakers' reference layout (a symmetric triangle) and the <b>sweet spot</b> — that triangle's apex, the listening position that calculation assumes. Every point marked on a wall, the ceiling, or the floor is a <b>first reflection</b>: the path sound travels from the speaker, bouncing off that surface, to the sweet spot — calculated with the mirror-image method (the same one acoustics studios use to place treatment). Each reflection shows its total distance in meters. A wall declared \"open\" draws no reflection there, because there's no wall to bounce off. The \"View\" button changes the camera angle (isometric/front/side/top) without recalculating anything — it's the same geometry, seen from another angle.",
    },
    puntaje: {
      titulo: 'Match score (1-10)',
      cuerpoHtml:
        "It's the only piece of the site that lives in the <b>editorial-criterion</b> layer, not physics — a number with one decimal place combining the severities of power, load, room modes, reverberation, and impedance bridge + volume headroom (evaluated separately for streamer and DAC, when both are chosen), with weights this site declares (power 24% · load 20% · modes 10% · reverberation 10% · bridge 10% and headroom 8% per source). A component without enough data isn't included — it neither adds nor subtracts, and the site states how many of up to 8 possible components could actually be evaluated. The number is colored (green/orange/red) so it reads at a glance, but it's still a declared opinion about how to weigh the physical findings above, not a new measured fact.",
    },
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
    marcaPlaceholder: '— Brand —',
    modeloPlaceholder: '— Model —',
    modeloSinMarca: '— Choose a brand first —',
    fuentePlaceholder: '— None (optional) —',
    masParlantes: 'More speakers · coming soon',
    masAmplificadores: 'More amplifiers · coming soon',
    masStreamers: 'More streamers · coming soon',
    masDacs: 'More DACs · coming soon',
    verFicha: 'Product page · coming soon',
    verDescripcion: 'View description',
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
    guardarBoton: 'Save',
    guardarPopupTitulo: 'You need to sign in',
    guardarPopupCuerpo: 'Coming soon. This feature will let you save your analyses, compare them against each other, and download them as PDF files.',
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
      pestanaOriginal: 'Original analysis',
      pestanaModificado: 'Modified',
      hintArrastreHtml: 'In this view you can move the speakers to try a different layout, <button type="button" id="btn-recalcular">RECALCULATE</button> and compare with Original analysis.',
      ubicacionTitulo: 'Reference speaker placement',
      ubicacion: (p: { frontalIzq: string; lateralIzq: string; frontalDer: string; lateralDer: string; separacion: string }): string =>
        `Left speaker: <b>${p.frontalIzq} m</b> from the front wall, <b>${p.lateralIzq} m</b> from its side wall. Right speaker: <b>${p.frontalDer} m</b> from the front wall, <b>${p.lateralDer} m</b> from its side wall. Distance between them: <b>${p.separacion} m</b>. This is the reference layout the rest of the analysis uses (power, modes, reflections) — it gets refined by moving the speakers and listening in the real space.`,
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

  documento: {
    hs: 'Report (preview)',
    pestana1: 'Analysis 1',
    pestana2: 'Analysis 2',
    comparar: 'Compare',
    descargarPdf: 'Download PDF',
    titulo: 'Analysis report',
    equipoTitulo: 'Equipment',
    planoTitulo: 'Layout, listening position and reflections (top view)',
    disclaimerHtml:
      'Internal preview of an exportable report — reformats data already calculated for <b>Analysis 1</b>, no ' +
      'real PDF is generated yet. <b>Analysis 2</b>, <b>Compare</b>, and <b>Download PDF</b> sit behind sign-in, ' +
      'same as "Save".',
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
        modos: 'Room modes',
        reverberacion: 'Reverberation',
        puenteStreamer: 'Impedance bridge (Streamer)',
        recorridoStreamer: 'Volume headroom (Streamer)',
        puenteDac: 'Impedance bridge (DAC)',
        recorridoDac: 'Volume headroom (DAC)',
      },
      filaIncluida: (p) => `${p.nombre}: ${p.puntos}/10`,
      filaExcluida: (p) => `${p.nombre}: not enough data, excluded`,
      aviso: (p) => `Calculated over ${p.evaluados} of ${p.total} components — the rest lacked enough data and were not included (neither added nor subtracted).`,
      criterio:
        '<b>Editorial criterion, not a measured figure:</b> combines the severities above with weights this site declares — power 24% · load 20% · room modes 10% · reverberation 10% · impedance bridge 10% and volume headroom 8% per source chosen (streamer and/or DAC, evaluated separately). Another reasonable criterion would weigh things differently.',
      notaRecalculo:
        'This score already recalculated power with the new listening distance. The other components (load, room modes, reverberation, bridge/headroom) do not depend on where the speakers are, so the number may stay the same if the power margin remains in the same category.',
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
