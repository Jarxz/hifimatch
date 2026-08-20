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
    version: 'V17.08.26',
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
        "Everything this site states belongs to one of two categories, and it always declares which. <b>Physical layer:</b> has a formula, a threshold, a data source, and a confidence level — it's refutable, someone can argue a threshold with evidence. It's almost everything you see (power, load, impedance bridge, room modes, reverberation). <b>Editorial-criterion layer:</b> preferences this site declares from its own judgment, not a measurement — today it's the overall verdict (see below), which groups the severities above into three states with a criterion this site declares (the worst link of each group, not an average). Another reasonable site would group things differently, and that wouldn't make it \"less correct\": it's a declared opinion, not a fact. The two layers are never mixed visually — every card states which one it is.",
    },
    confianza: {
      titulo: 'Source and confidence of every data point',
      cuerpoHtml:
        "Manufacturers publish some specs poorly — a streamer/DAC's output impedance is almost never on the spec sheet, speaker sensitivity is sometimes measured under optimistic conditions. That's why every catalog entry carries where it came from and a confidence level (<b>high/medium/low</b>): high when it comes from the official spec sheet or an independent measurement that confirms it; medium or low when it has to be inferred or only one source exists. <b>A missing data point is never shown as if the gear were \"fine\"</b> — if a rule is missing the data it needs, that card is hidden from the main analysis and listed under \"Not enough data\" at the end. A gap is never filled with an invented \"market standard\": the real spread of specs across gear (e.g. source output impedance ranging from 10 Ω to 500 Ω) means any single value would, in practice, be a made-up number.",
    },
    generico: {
      titulo: 'Generic profiles (archetypes): when the real equipment isn\'t in the catalog',
      cuerpoHtml:
        'Added as an <b>extra on top of the original criteria</b> above, not a replacement: when a user\'s real equipment isn\'t in the catalog, picking one of these 6 profiles under the brand <b>Generic (Archetype)</b> (3 speakers, 3 amplifiers) lets the analysis keep running by physical approximation instead of going unevaluated. Calculation justification: each profile directly declares the data EPDR (load) and the damping interaction need — minimum impedance, peak impedance, and phase angle for speakers; damping factor for amplifiers — so those two cards calculate with the same formula and the same threshold they\'d use with real equipment, never a different one. Sensitivity and power (fields the engine always requires) are filled with a reasonable reference value per archetype, not measured: that\'s why every synthetic figure carries a declared <b>low confidence</b>, and is never shown as if it were a manufacturer spec sheet. This isn\'t the same as "filling a gap with a market standard" (the practice the card above says this site avoids): a generic profile is its own category the user picks on purpose, by name — never silently substituted into a real product\'s data.',
    },
    potencia: {
      titulo: 'Power versus the room\'s peaks',
      cuerpoHtml:
        "The question this card answers: does the amplifier deliver the peak level (SPL) the room asks for, at the real listening distance? It's calculated from speaker sensitivity, amplifier power, and distance, adding a typical boost for a stereo pair (+6 dB) and for a small room (+3 dB) — two declared assumptions, not equipment data, verified by measuring. The result is a <b>margin in dB</b> over the target peak of the chosen listening level (moderate/loud/reference). The card's short line re-expresses that margin as the <b>% of the amplifier's capacity</b> that peak demands — more intuitive than a dB figure: at +6 dB margin, the amplifier is only using a fraction of what it has; a negative margin would demand over 100% of its capacity, meaning it would clip on peaks.",
    },
    carga: {
      titulo: 'The load the amplifier sees',
      cuerpoHtml:
        "A speaker's impedance isn't one fixed number — it dips at certain frequencies, and that dip (minimum impedance) is what actually demands current from the amplifier, not the nominal impedance on the spec sheet. This card compares that minimum impedance against what the amplifier can sustain: if the load is demanding (low minimum impedance), the result depends on whether the amplifier has <b>current reserve</b> (doubles its power when impedance halves, a sign of a robust power supply) or simply has <b>raw power</b> to spare. On top of that, when the catalog has (or can conservatively assume) the most demanding <b>phase angle</b> in the bass region, EPDR (equivalent peak dissipation resistance) is calculated: a reactive speaker demands more current than its minimum impedance alone suggests, and EPDR can reveal a problem the magnitude alone wouldn't show. When the manufacturer doesn't publish the speaker's minimum impedance, the card is hidden from the main analysis — it's listed under \"Not enough data\".",
    },
    amortiguamiento: {
      titulo: 'Does the amplifier’s output impedance color the sound?',
      cuerpoHtml:
        "The amplifier's output impedance (derived from the published damping factor, Z_out = 8/DF) forms a <b>voltage divider</b> with the speaker's impedance curve: at the bass-resonance peak, where impedance is highest, that divider lets through relatively more voltage than at the minimum — a real, calculable tonal coloration, not a hunch. This card doesn't penalize a low damping factor by itself (that would unfairly dismiss tube electronics, which can sound perfectly good with the right speaker): what matters is the interaction with THAT speaker's curve, expressed in decibels of deviation between the impedance peak and minimum. It needs the amplifier's damping factor and the speaker's minimum impedance — if the manufacturer doesn't publish the impedance peak (bass resonance), a typical reference value (25 Ω) is assumed, declared as such on the card.",
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
    veredicto: {
      titulo: 'The verdict and the three states',
      cuerpoHtml:
        "The result's headline (Power / Electrical match / Room) summarizes the physical cards below without averaging them: each of the three states takes the <b>worst</b> severity among the components it groups — Power is direct; Electrical match is the worst of load, and impedance bridge + volume headroom for streamer and/or DAC; Room is the worst of modes and reverberation. Averaging would dissolve a real problem among several things that are fine (an amplifier falling short on peaks could still average out \"acceptable\" next to an easy load); the worst link is more honest. A component without enough data doesn't count as a caveat — if an entire state has no evaluable component, it's declared \"not enough data\" in gray, never amber or red. The overall headline is the worst of the three states; it's still <b>editorial-criterion layer</b> (how it's grouped and prioritized is this site's own decision), resting on severities that are physics.",
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
    notaGenerico:
      "Generic profile (archetype): a reference physical approximation, not a real product or a measurement. Best used only when the real equipment isn't in the catalog.",
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
    capaCriterioEditorial: 'Editorial criterion, not physics',
    geometria: 'Geometry',
    disposicionReferencia: 'Reference layout',
    verDetalle: 'View technical detail',
    recomendacionesTitulo: 'What to do next',
    evidenciaTitulo: 'See full technical evidence',
    fichaTitulo: 'The chain and room data',
    fichaSubtitulo: 'Assumptions, sources and confidence level · save & report',
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
    veredictoTitulo: 'Overall verdict',
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
        'epdr-critico': 'EPDR critical',
        'epdr-ajustado': 'EPDR tight',
      },
      simple: {
        'sin-dato': 'Not enough data to assess this load.',
        'exige-corriente': 'This pairing demands more current than this amplifier has in reserve.',
        cubierto: 'The amplifier handles this load well.',
        'carga-benigna': 'An easy load, no risk to the amplifier.',
        'epdr-critico': 'This speaker’s phase angle demands far more current than its minimum impedance alone suggests.',
        'epdr-ajustado': 'This speaker’s phase angle demands somewhat more current than its minimum impedance alone suggests.',
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
      epdrTexto: (p) =>
        `With a phase angle of <b>${p.theta}°</b> at the most demanding point, the equivalent peak dissipation resistance (EPDR) is <b>${p.epdr} Ω</b> — lower than the minimum impedance alone, because a reactive speaker demands more current than its modulus suggests.`,
      epdrCalc: (p) => `EPDR = ${p.minZ} / (1 + |sin(${p.theta}°)|) = <b>${p.epdr} Ω</b>`,
      epdrSupuesto:
        'Phase angle not published: <b>-45°</b> is assumed, a conservative assumption for nominal impedance ≤4 Ω — a site criterion, not a measurement of this speaker.',
      epdrFuente: 'Phase angle cited by the manufacturer or an independent measurement.',
    },

    amortiguamiento: {
      titulo: 'Does the amplifier’s output impedance color the sound?',
      nombreCorto: 'Damping',
      verdicto: {
        'sin-dato': 'No data',
        optimo: 'Optimal',
        'con-reparos': 'Has caveats',
        critico: 'Critical',
      },
      simple: {
        'sin-dato': 'Not enough data to assess this interaction.',
        optimo: 'The amplifier’s output impedance does not alter the speaker’s response.',
        'con-reparos': 'The amplifier’s output impedance slightly colors the speaker’s bass response.',
        critico: 'The amplifier’s output impedance clearly alters the speaker’s bass response.',
      },
      sinDatosTexto:
        'The amplifier’s damping factor or the speaker’s minimum impedance is missing. Without both data points, this interaction can’t be estimated.',
      sinDatosAviso: 'A missing data point does not count as approved. <b>Pending:</b> published damping factor.',
      tiers: {
        optimo: {
          titulo: 'No measurable alteration of the response.',
          explicacionFisica: (p) =>
            `The amplifier's low output impedance (Z_out ≈ ${p.zOut} Ω) keeps the speaker's frequency response within the measured variation, with no identifiable boost.`,
          consecuenciaMedible: (p) =>
            `This speaker's impedance curve (minimum ${p.zMin} Ω, peak ${p.zMax} Ω) doesn't produce a detectable level deviation in any band.`,
          accionSugerida: () => 'No action needed — a good match for reference listening.',
        },
        moderado: {
          titulo: 'Moderate level boost in the resonance zone.',
          explicacionFisica: (p) =>
            `The electrical interaction produces a +${p.deltaDb} dB boost concentrated near the speaker's impedance peak (${p.zMax} Ω), from the amplifier's internal resistance (Z_out ≈ ${p.zOut} Ω).`,
          consecuenciaMedible: () => 'It’s a level deviation confined to the bass-resonance band, not a change across the rest of the response.',
          accionSugerida: () =>
            'An amplifier with a higher damping factor reduces this boost if a flatter response is the goal — verified by listening and, if possible, measuring.',
        },
        severo: {
          titulo: 'Wide level deviation in the frequency response.',
          explicacionFisica: (p) =>
            `The amplifier's high output impedance (Z_out ≈ ${p.zOut} Ω) interacts with the speaker's swing between ${p.zMin} Ω minimum and ${p.zMax} Ω maximum, producing a +${p.deltaDb} dB deviation from the published curve.`,
          consecuenciaMedible: () => 'The deviation is no longer confined to a single boost: it spreads over a wider frequency range around the resonance.',
          accionSugerida: () => 'An amplifier with a higher damping factor helps, or a speaker with a flatter bass impedance curve.',
        },
        critico: {
          titulo: 'Level deviation outside the range this model considers manageable.',
          explicacionFisica: (p) =>
            `The frequency response deviates +${p.deltaDb} dB from the published curve — the interaction between the amplifier's and the speaker's impedance dominates the measured curve's shape in this zone.`,
          consecuenciaMedible: () => 'It’s a large, localized level deviation — this calculation measures level, not distortion, excursion, or thermal behavior.',
          accionSugerida: () => 'Not a recommended pairing as-is — a different amplifier (higher damping factor) or a different speaker suits this electronics better.',
        },
      },
      calc: (p) =>
        `Z_out = 8 / DF = <b>${p.zOut} Ω</b><br>ΔdB = 20·log₁₀( (${p.zMax}·(${p.zMin}+${p.zOut})) / (${p.zMin}·(${p.zMax}+${p.zOut})) ) = <b>${p.deltaDb} dB</b>`,
      zMaxSupuesto:
        'Bass-resonance peak impedance not published: <b>25 Ω</b> is assumed, a typical reference value — a site criterion, not a measurement of this speaker.',
      fuente:
        '<b>Formula:</b> Z_out = 8/DF (damping factor is published referred to 8 Ω); ΔdB = 20·log₁₀(Zmax·(Zmin+Zout) / (Zmin·(Zmax+Zout))) — the voltage-divider attenuation difference between the speaker’s impedance peak and minimum. Doesn’t penalize a low damping factor by itself (avoids dismissing tube electronics without cause): it only counts the real interaction with this speaker’s impedance curve.',
    },

    puente: {
      tituloStreamer: 'Do the streamer and amplifier connect well?',
      tituloDac: 'Do the DAC and amplifier connect well?',
      subtitulo: 'Impedance bridge',
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
      tituloStreamer: 'Will you get good use of the volume dial with the streamer?',
      tituloDac: 'Will you get good use of the volume dial with the DAC?',
      subtitulo: 'Volume headroom',
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
      verdictoNulo: 'Null at the listening spot',
      verdictoAmbos: 'Clustered modes and a null at the listening spot',
      simple: {
        'modos-distribuidos': 'The room’s bass is reasonably even.',
        'modos-agrupados': 'Some bass frequencies will likely sound reinforced.',
      },
      simpleNulo: 'Your listening position sits in the bass null of one particular mode.',
      simpleAmbos: 'Bass is reinforced at one frequency and, on top of that, there’s a null at another — worth checking the listening position.',
      eje: { ancho: 'width', largo: 'length', alto: 'height' },
      textoOk: (p) =>
        `The room's bass resonances are reasonably distributed below ${p.techo} Hz — no coincidences reinforcing a particular frequency were found.`,
      textoWarn: (p) =>
        `${p.n} mode pair(s) fall within the clustering threshold below ${p.techo} Hz — a sign of bass reinforcement at those frequencies.`,
      parAgrupado: (p) => `${p.a} (${p.frecuenciaA} Hz) and ${p.b} (${p.frecuenciaB} Hz)`,
      fuente: (p) =>
        `<b>Criterion:</b> rigid, rectangular room model, axial modes only. Clustering = two modes on different axes within ${p.umbral}% of each other, below ${p.techo} Hz — a site criterion, not a published convention; verified by measuring/listening.`,
      fuenteNulo: (p) =>
        `The listening null check compares the calculated listening spot against the room's exact depth-wise center (L/2, the pressure node of the first-order axial length mode), with a ±${p.ventana}% of L window — a site criterion, not a published convention.`,
      nuloEscucha: (p) =>
        `<b>Listening spot near a modal null:</b> the sweet spot sits close to the room's exact depth-wise center — the zone where the first axial length mode (${p.frecuencia} Hz) has its pressure null. That particular mode can sound very weak right there; verified by listening, and usually just moving the listening spot or the speakers a few centimeters is enough.`,
      sugerenciaNulo:
        'Try moving the listening spot (or the speakers) a few centimeters forward or back to get out of the null — verified by listening; that mode\'s bass dip should be much less noticeable just a few centimeters off the exact center.',
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
        `Estimated RT60: <b>≈${p.rt60} s</b> (average of the 500 Hz and 2000 Hz bands). The declared comfortable range for critical listening in a domestic room is ${p.min}–${p.max} s (a concert hall aims much higher, ~1.5–2.5 s, because it's a different kind of space). Above ≈${p.fs} Hz (this room's Schroeder frequency) the sound field is dense enough for a single reverberation time to make sense; below it, behavior is dominated by individual resonances — see "Room modes" above, not diffuse reverberation. The equation (Sabine or Eyring depending on how much each band absorbs) still loses accuracy in small rooms — read this as an order of magnitude, not an exact figure.`,
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
        `<br>Total absorption (500 Hz band): <b>${p.absorcionTotal} sabins</b> — volume: ${p.volumen} m³<br><br>` +
        `<b>All 3 bands:</b><br>` +
        p.bandas.map((b) => `${b.hz} Hz: ᾱ=${b.alphaBar} → RT60 = ${b.rt60} s (${b.metodo})`).join('<br>') +
        `<br><br>Final RT60 (500+2000 Hz average): <b>${p.rt60} s</b>` +
        `<br>Schroeder frequency: fs ≈ <b>${p.schroeder} Hz</b>`,
      fuente:
        "<b>Formula:</b> Sabine's equation (RT60 = 0.161·V/A) for bands with average absorption ᾱ≤0.20; Eyring's equation (RT60 = 0.161·V/(−S·ln(1−ᾱ))) above that threshold, where Sabine overestimates reverberation time — a criterion from architectural acoustics literature, not invented by the site. Computed separately in 3 bands (125/500/2000 Hz), summed surface by surface in each — not a single coefficient for the whole room, not even a single \"wall\" value: each wall is oriented and declared separately. Per-material, per-band absorption coefficients are a site criterion: typical values from architectural acoustics literature, not a measurement of your real room. \"Open\" uses Sabine's historical reference coefficient for an opening (α=1.0 in all 3 bands: nothing that reaches it comes back into the room). Verified by measuring with an SPL meter or an RT60 app.",
      avisoVacio: (p) =>
        `<b>Wall(s) declared open:</b> ${p.muros}. They don't reflect sound — that's why the reverberation calculated above drops, and the isometric view draws no reflection for that wall. The room modes (resonances) in the card above are <b>not adjusted</b> for an opening: they still assume rigid walls at both ends of each axis, so the resonance calculated on that wall's axis is less representative than in a closed room.`,
    },

    componentes: {
      nombre: {
        potencia: 'Power',
        carga: 'Load',
        modos: 'Room modes',
        reverberacion: 'Reverberation',
        puenteStreamer: 'Impedance bridge (Streamer)',
        recorridoStreamer: 'Volume headroom (Streamer)',
        puenteDac: 'Impedance bridge (DAC)',
        recorridoDac: 'Volume headroom (DAC)',
      },
    },

    veredicto: {
      nombrePotencia: 'Power',
      nombreAcople: 'Electrical match',
      nombreSala: 'Room',
      tituloAlert: 'Not a recommended match',
      tituloWarn: 'Workable match, with limits',
      tituloOk: 'Fully compatible match',
      subtextoAlert: (p) => `Critical incompatibilities found in ${p.grupos}.`,
      subtextoWarn: (p) => `The system works, but it's worth addressing ${p.grupos}.`,
      subtextoOk: 'Every component operates within the expected margins.',
      estadoPotencia: {
        ok: 'Sufficient',
        warn: 'Tight',
        alert: 'Insufficient',
      },
      estadoAcople: {
        ok: 'Correct',
        warn: 'Has caveats',
        alert: 'Conflict',
      },
      estadoAcopleSinDatos: 'Not enough data',
      estadoSala: {
        ok: 'In range',
        warn: 'Has caveats',
      },
      sinDatosDetalle: 'Not enough data to evaluate this group.',
    },

    resumen: {
      titulo: 'In summary',
      comportamiento: {
        ok: (p) => `The system as a whole works well: most of the evaluated aspects are resolved — ${p.titulo}.`,
        warn: (p) => `The system works, but a few points are worth checking before calling it done — ${p.titulo}.`,
        alert: (p) => `The system has several points worth resolving before considering it a good match — ${p.titulo}.`,
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
