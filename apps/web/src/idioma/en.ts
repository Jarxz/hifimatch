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
    acercaDe: 'About',
    privacidad: 'Privacy',
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
    subtitulo: 'hi-fi compatibility analysis · based on physics',
    remate: 'you listen and decide',
    cta: 'Analyze a system',
    proofReglas: 'physical rules, each with a declared formula and threshold',
    proofEquipos: 'curated pieces of gear, each spec sourced and confidence-rated',
    proofAnalisis: 'analysis built on verified data',
    version: 'V20.08.26',
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
        'Every rectangular room reinforces certain bass frequencies based on its three dimensions — these are <b>axial modes</b>, resonances that appear because the room\'s width, length, and height "fit" certain wavelengths. The card marks it "clustered" when at least one pair of modes on different axes lands within 1% of each other (a near-exact overlap, the worst case, counts on its own), or when there are two or more pairs within 2% — both thresholds, below 150 Hz, declared by this site, not a published convention. A sweep of thousands of rooms showed a single 5% threshold flagged 86% of them — a traffic light that almost never changes; this two-condition rule flags a much more informative 37%. This rule never returns "error" severity — it\'s a prediction from rigid room geometry, which gets things wrong easily and always gets verified by measuring or listening in the real space.',
    },
    filtroPeine: {
      titulo: 'Comb filtering from reflections',
      cuerpoHtml:
        'Every early reflection (frontal —behind the speaker—, side, rear, ceiling, and floor) reaches the ear a little after the direct sound, and that path difference (Δ) makes the direct and reflected sound cancel and reinforce frequencies in a "comb" pattern: the first null falls at c/(2Δ), the first reinforcement at c/Δ. This card calculates all 10 combinations (5 reflections × 2 channels) and only flags one when its first null lands in the most audible zone for timbre (200-2000 Hz, presence/definition of voices and instruments) <b>and</b> the surface producing that reflection reflects more than it absorbs there — without that absorption weighting, this rule would flag almost any room, because there are always reflections. Same as the rest of the room block: rigid geometry, first order, verified by listening and, if needed, treating that surface.',
    },
    triangulo: {
      titulo: 'Listening triangle',
      cuerpoHtml:
        'Two questions about the SHAPE of the triangle the speakers and the listening spot form, beyond distance alone. <b>Asymmetry:</b> compares the path of each reflection —and the direct path— between the two channels; with the speakers in different positions (or the seat unlocked with the padlock, see the layout card) one side can end up closer than the other, and that time difference pulls the stereo image toward the nearer speaker. <b>Angle:</b> the one the two speakers subtend as seen from the listening spot, compared against two references — the stereo equilateral-triangle convention (60°, not invented by the site) and this site\'s own criterion (~45°, what its automatic layout gives by design, declared as such instead of forced to match the convention) — an angle that differs from either isn\'t an error (some people prefer a narrower or wider soundstage on purpose), but this card flags it when it falls outside a reasonable range that accounts for both references, so it\'s a conscious choice rather than an undeclared side effect. Same caveat as always: rigid room geometry, verified by listening.',
    },
    reverberacion: {
      titulo: 'Estimated reverberation time (RT60)',
      cuerpoHtml:
        'RT60 is how long sound takes to decay 60 dB after the source cuts off — a room with a lot of reverberation sounds "live", echoey; one with too little sounds "dry", dull. It\'s calculated with Sabine\'s equation from the room\'s volume and the absorption of each surface (the 4 walls separately, floor, and ceiling), each with whatever material you pick — concrete and glass reflect a lot, acoustic panel and carpet absorb a lot, and a wall declared "open" (a real opening) absorbs like an open window: nothing that reaches it comes back into the room. This card no longer gives an ok/needs-work verdict: with just the six bare surfaces, the model overestimated reverberation in nearly any room; adding assumed furniture flips the result completely. Instead of picking an arbitrary middle point, both extremes are shown — empty room and furnished room — as a declared range, neither one an actual measurement. Sabine and Eyring both assume a diffuse sound field (many bounces, not one or two); in a very absorbent or very open room that stops holding well before absorption reaches its mathematical maximum, so past that point the card simply shows no number at all — still calculating there would produce a figure that no longer describes the room, not a conservative estimate. Of the whole analysis, RT60 is the one thing you can verify yourself with a phone app in a few minutes.',
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
    personalizarSala: 'Customize the room',
    resumenSala: (p) => `${p.ancho} × ${p.largo} × ${p.alto} m · ${p.muro} + ${p.piso}`,
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
    notaSinDatos: (p) => `<b>Data the manufacturer doesn't publish:</b> ${p.items}. This isn't a problem with your system — it's information the catalog doesn't have yet.`,
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
      candadoAria: 'Listening-spot padlock',
      candadoCerrado: 'Padlock locked',
      candadoAbierto: 'Padlock open',
      hintAsiento: 'Padlock open: the listening spot can also be dragged, independently of the speakers.',
      candadoComparadorAviso:
        'Original analysis and Modified use a different method for the listening spot (padlock locked/open) — a difference between the two may come from that, not only from position.',
      referenciaSimetrica: 'symmetric reference position',
      verLasDiez: 'See the ten',
      verEnArBoton: 'View in AR',
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

  ar: {
    titulo: 'The Hifi Match · AR',
    pasosTitulo: 'How calibration works',
    paso1: 'Point the phone at the room floor and tap the real corner where the front wall meets the left wall.',
    paso2: 'Without moving away from inside the room, tap the real front-right corner (where that same wall meets the right wall) — the distance between the two taps measures the room’s real width.',
    paso3: 'Once anchored, an OPTIONAL third tap at the top of that same corner (where the wall meets the ceiling) also measures the real height.',
    avisoSoloAndroidChrome: 'This only works in Chrome for Android with ARCore support. It is not available on iPhone, on desktop computers, or in other Android browsers.',
    botonEntrar: 'Enter AR',
    calibrandoPaso1: 'Point at the floor and tap the real front-left corner of the room.',
    calibrandoPaso2: 'Without moving away from the room, tap the real front-right corner, on the floor.',
    calibrandoAltura: 'Tap the top of that same corner, where the wall meets the ceiling.',
    anclado: 'Anchored. The calculated geometry stays fixed at this point — walk around the room to see it from other angles.',
    medirAlturaBoton: 'Measure real height',
    medicionAnchoHtml: (p: { ancho: string }): string => `Width measured in your room: <b>${p.ancho} m</b>.`,
    medicionAlturaHtml: (p: { alto: string }): string => `Height measured in your room: <b>${p.alto} m</b>.`,
    medicionFueraDeRango: 'The measurement did not come out as a believable value — the width/height entered on the site was kept.',
    avisoAlturaSupuesta: 'Speaker and ear height is assumed at 1.0 m (site criterion) — not a measurement of the real installation.',
    avisoWireframeAproximado:
      'The room’s depth uses the measurement entered on the site, not a real measurement — if it doesn’t match, the wireframe won’t line up exactly with the back wall; that is not a calculation error. Width (and height, if measured) can be real — see above.',
    reiniciarCalibracion: 'Recalibrate',
    noSoportadoTitulo: 'AR not available in this browser',
    noSoportadoCuerpo:
      'This feature uses WebXR with surface detection (hit-test), supported today only by Chrome on Android with ARCore. It is not available on iPhone/Safari, on desktop computers, or in other Android browsers.',
    estadoInvalido: 'The room data could not be read. Go back to the analysis and try again from the "View in AR" button.',
    volverAlAnalisis: '← Back to analysis',
    quickLookAviso:
      'On iPhone, "View in AR" places a model of the calculated room using the measurements already entered on the site — it does not measure the real room the way the Android version does. Position and scale are adjusted with AR Quick Look’s own gestures (drag, pinch), without any extra calibration from this site.',
    quickLookPreparando: 'Preparing the model…',
    quickLookError: 'The AR model could not be prepared. Go back to the analysis and try again.',
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
      simpleRangoCruzaUmbral: (p) =>
        `Depending on how this speaker's sensitivity was measured, the result ranges from "${p.codigoPesimista}" to "${p.codigoOptimista}" — that catalog data point is missing to decide which one applies.`,
      conMargen: (p) =>
        `The ${p.amp} delivers the peaks at <b>${p.nivel}</b> level with <b>${p.margenDb} dB</b> of margin at ${p.distM} m. Plenty of headroom.`,
      justoTexto: (p) =>
        `It reaches the peaks at <b>${p.nivel}</b> level, but with only <b>${p.margenDb} dB</b> of margin. On the strongest transients it's at the limit.`,
      insuficienteTexto: (p) =>
        `It's <b>${p.margenAbsDb} dB</b> short of the peaks at <b>${p.nivel}</b> level at ${p.distM} m. At that volume the amplifier clips.`,
      calc: (p) =>
        `Available SPL = ${p.sens} − 20·log₁₀(${p.distM}) + 10·log₁₀(${p.potenciaUsada}) <span style="color:var(--faint)">(${p.ohmUsados} Ω)</span> + 3 <span style="color:var(--faint)">pair</span> = <b>${p.splDb} dB</b><br>` +
        `peak target (${p.nivel}) = <b>${p.picoDb} dB</b><br>` +
        `margin = ${p.splDb} − ${p.picoDb} = <b>${p.margenSigno} dB</b>`,
      sensibilidadNormalizada: (p) =>
        `Sensitivity cited at 2.83V/1m (${p.citada} dB) normalized to 1W/1m → <b>${p.efectiva} dB</b> — at this impedance those aren't the same figure (see "confidence and convention" in the guide).`,
      sensibilidadRangoHtml: (p) =>
        `The cited source doesn't state whether sensitivity was measured at 2.83V or at 1W/1m — at this impedance that does change the result. If it's at 2.83V, real sensitivity is <b>${p.pesimista} dB</b> (the value used above, the conservative case); if it's already at 1W/1m, it's <b>${p.optimista} dB</b> and the margin would be <b>${p.margenOptimista} dB</b> instead of the one above.`,
      sensibilidadRangoCruzaUmbralHtml: (p) =>
        `The cited source doesn't state the measurement convention, and at this impedance that changes the verdict, not just the margin: at 2.83V real sensitivity is <b>${p.pesimista} dB</b> ("${p.codigoPesimista}", the case shown above); at 1W/1m it would be <b>${p.optimista} dB</b> ("${p.codigoOptimista}"). That catalog data point is missing to decide which one applies.`,
      sensibilidadSinConvencionIrrelevanteHtml:
        "The cited source doesn't state whether sensitivity was measured at 2.83V or at 1W/1m, but at this impedance (8 Ω or more) the two conventions nearly coincide — it doesn't change the result.",
      potenciaCargaEstimadaHtml:
        "The amplifier doesn't publish power into 4 Ω for this speaker — its 8 Ω power figure is used as an approximation of what it actually delivers into this load.",
      gananciaSalaInfo: (p) =>
        `Below ≈${p.frecuenciaHz} Hz (the axial mode of the room's largest dimension) there's a typical small-room reinforcement of ~${p.gananciaDb} dB — not included in the wideband calculation above.`,
      avisoRecMin: (p) =>
        `The manufacturer recommends ${p.recomendadaW} W or more for this speaker; the amplifier delivers ${p.entregadaW} W.`,
      fuente: (p) =>
        `<b>Sensitivity source:</b> ${p.sensFuente}${p.sensNota} <span class="conf">${p.sensConf} confidence</span><br>` +
        `<b>Power source:</b> ${p.potFuente} (RMS, ${p.ohmUsados} Ω) <span class="conf">${p.potConf} confidence</span>`,
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
      verdictoAcoplamiento: 'Speaker sitting in a pressure node',
      verdictoVarios: (p) => `${p.n} mode problems at once`,
      simple: {
        'modos-distribuidos': 'The room’s bass is reasonably even.',
        'modos-agrupados': 'Some bass frequencies will likely sound reinforced.',
      },
      simpleNulo: 'Your listening position sits in the bass null of one particular mode.',
      simpleAmbos: 'Bass is reinforced at one frequency and, on top of that, there’s a null at another — worth checking the listening position.',
      simpleAcoplamiento: 'The speaker sits where it barely excites one of the room’s bass modes.',
      simpleVarios: 'More than one bass problem is happening at once in this layout — check the technical detail.',
      eje: { ancho: 'width', largo: 'length', alto: 'height' },
      textoOk: (p) =>
        `The room's bass resonances are reasonably distributed below ${p.techo} Hz — no coincidences reinforcing a particular frequency were found.`,
      textoWarn: (p) =>
        `${p.n} mode pair(s) fall within the clustering threshold below ${p.techo} Hz — a sign of bass reinforcement at those frequencies.`,
      parAgrupado: (p) => `${p.a} (${p.frecuenciaA} Hz) and ${p.b} (${p.frecuenciaB} Hz)`,
      fuente: (p) =>
        `<b>Criterion:</b> rigid, rectangular room model, axial modes only. "Clustered" = at least one pair of modes on different axes within ${p.umbralExacto}% of each other, or ${p.minPares} or more pairs within ${p.umbral}% — a near-exact overlap already counts on its own; several looser pairs are needed for the same verdict. Both thresholds (below ${p.techo} Hz) are a site criterion, not a published convention; verified by measuring/listening.`,
      fuenteNulo: (p) =>
        `The listening null check compares the calculated listening spot against the room's exact depth-wise center (L/2, the pressure node of the first-order axial length mode), with a ±${p.ventana}% of L window — a site criterion, not a published convention.`,
      nuloEscucha: (p) =>
        `<b>Listening spot near a modal null:</b> the sweet spot sits close to the room's exact depth-wise center — the zone where the first axial length mode (${p.frecuencia} Hz) has its pressure null. That particular mode can sound very weak right there; verified by listening, and usually just moving the listening spot or the speakers a few centimeters is enough.`,
      sugerenciaNulo:
        'Try moving the listening spot (or the speakers) a few centimeters forward or back to get out of the null — verified by listening; that mode\'s bass dip should be much less noticeable just a few centimeters off the exact center.',
      sugerencia:
        'Try repositioning the speakers or the listening spot, or treat those frequencies acoustically — verified by listening and measuring in the real space. A parametric filter (active EQ) centered near those frequencies can also attenuate the buildup, but tuning it well requires measuring the real room: this model doesn’t have measured amplitude or phase to propose a specific Q or dB cut.',
      acoplamientoAlto: (p) =>
        `<b>Speaker sitting in a pressure node:</b> at the current position, the speaker excites only ${p.productoPct}% of the axial length mode order ${p.orden} (${p.frecuencia} Hz) — the source sits near a spot where that mode barely gets generated, so that particular resonance can sound much weaker than expected.`,
      sugerenciaAcoplamiento:
        'Try moving the speaker (forward/back in the room) a few centimeters to get out of that mode\'s pressure node — verified by listening: the reinforcement at that frequency should become more noticeable just a bit off the exact spot.',
      fuenteAcoplamiento: (p) =>
        `<b>Modal coupling:</b> same cos(nπy/L) shape as the listening null, applied to the speaker position instead of the listener's — a speaker sitting in a mode's pressure node barely excites it, whatever that mode's real amplitude (which this model doesn't measure). "High" when the speaker×listener product of any order (1-3) exceeds ${p.umbral}% — a site criterion.`,
      curvaOrden: (p) => `order ${p.orden} (${p.frecuencia} Hz)`,
      curvasCaption:
        'Relative pressure along each affected axis — only the lowest-frequency clusters (the most audible and hardest to treat). Independent 1D curves per axis, not a combined room map.',
    },

    filtroPeine: {
      titulo: 'Comb filtering from reflections',
      verdictoOk: 'No nulls in audible zone',
      verdictoWarn: 'Comb null in audible zone',
      simpleOk: 'No nearby reflection arrives just in time to cancel a frequency in the zone where voices are most noticeable, against a surface that doesn’t absorb it.',
      simpleWarn: 'At least one nearby reflection arrives just in time to partly cancel a frequency in the zone where voices are most noticeable — a narrow dip in tone, not in overall volume — against a surface that barely absorbs it.',
      textoOk:
        'Each early reflection (front, side, rear, ceiling, floor) interferes with the direct sound and cancels/reinforces frequencies in a comb pattern, starting at the first null (c/2Δ, with Δ = path difference). None of the calculated first nulls falls, at the same time, inside the most audible zone (200-2000 Hz) and against a surface that reflects more than it absorbs there.',
      textoWarn: (p) =>
        `Each early reflection interferes with the direct sound and cancels/reinforces frequencies in a comb pattern, starting at the first null (c/2Δ). ${p.n} of the 10 combinations (5 reflections × 2 channels) has its first null inside the most audible zone (200-2000 Hz) AND against a surface that reflects more than it absorbs there — see the technical detail for which ones.`,
      nombreReflexion: {
        frontal: 'Front (behind the speaker)',
        lateral: 'Side',
        trasera: 'Rear (behind the listener)',
        piso: 'Floor',
        techo: 'Ceiling',
      },
      // "left/right speaker", not "left/right side": the channel names
      // which speaker the reflected path comes from, never a side of
      // the surface — floor and ceiling have no side, and showing just
      // "(left)" there raised the question of whether it actually meant
      // a wall. Reported by the user.
      canalIzq: 'left speaker',
      canalDer: 'right speaker',
      severidadOk: 'out of zone / absorbed',
      severidadWarn: 'in audible zone, reflective',
      fila: (p) => `${p.nombre}: Δ=${p.deltaM} m → 1st null ${p.nuloHz} Hz, 1st reinforcement ${p.refuerzoHz} Hz (α≈${p.alpha}) — ${p.severidad}`,
      filaDegenerada: (p) => `${p.nombre}: degenerate geometry (speaker ~on the surface) — no finite null to report`,
      sinNulos: 'None of the 10 combinations (5 reflections × 2 channels) falls in a problematic zone — see "the ten" for the full detail.',
      // Self-contained on purpose: this text also shows up on its own,
      // without the simpleHtml/textoHtml above as context, inside "What
      // to check" (top of the page, modeloRecomendacionesTop) — it has
      // to make sense without the user having opened the full card.
      avisoFila: (p) =>
        `<b>${p.nombre}:</b> the reflection arrives just in time to cancel part of the direct sound near ${p.nuloHz} Hz — a narrow dip in tone there, most noticeable on voices and instruments, not a loss of overall volume.`,
      sugerencia:
        'Treating that surface acoustically (an absorbent panel at the first reflection point) helps, or repositioning speakers/listening spot to change the path difference — verified by listening and, if possible, measuring.',
      fuente: (p) =>
        `<b>Criterion:</b> rigid room geometry, point source, first order — same model as the rest of the room block. "Audible zone" = ${p.rangoMin}-${p.rangoMax} Hz (presence/definition of voices and instruments), and "reflective" = an absorption coefficient below ${p.alphaMax} in the null's band — both a site criterion. Without weighting by absorption, this rule would flag almost any room; with it, only surfaces that genuinely return the reflection. It's not summed with the other reflections into a combined curve: each one answers a narrow question.`,
    },

    triangulo: {
      titulo: 'Listening triangle',
      categoriaDirecto: 'Direct path',
      nombreReflexion: {
        frontal: 'Front reflection',
        lateral: 'Side reflection',
        trasera: 'Rear reflection',
        piso: 'Floor reflection',
        techo: 'Ceiling reflection',
      },
      verdictoOk: 'Symmetric triangle',
      verdictoAsimetria: 'Asymmetric triangle',
      verdictoAngulo: {
        'angulo-estrecho': 'Narrow angle',
        'angulo-ok': 'Angle within range',
        'angulo-amplio': 'Wide angle',
      },
      verdictoAmbos: 'Asymmetric triangle and angle out of range',
      simpleOk: 'Both speakers sit at the same distance from the listening spot, with an angle inside the declared range.',
      simpleAsimetria: 'One speaker ends up noticeably closer to the listening spot than the other — the stereo image can pull toward that side.',
      simpleAngulo: {
        'angulo-estrecho': 'The angle the speakers subtend as seen from the listening spot is narrower than the declared range — a narrow soundstage.',
        'angulo-ok': 'The angle the speakers subtend as seen from the listening spot is within the declared range.',
        'angulo-amplio': 'The angle the speakers subtend as seen from the listening spot is wider than the declared range — it can leave a central phase gap.',
      },
      simpleAmbos: 'The triangle is asymmetric and, on top of that, the angle falls outside the declared range.',
      texto: (p) =>
        `The angle the two speakers subtend as seen from the listening spot is <b>${p.angulo}°</b>. This site's reference layout aims, by design, for <b>~${p.referencia}°</b> — a narrower soundstage than the stereo equilateral-triangle convention (<b>${p.convencion}°</b>), cited here as the other possible reference point, not as a target this analysis has to meet. Neither angle is "wrong" — a narrower or wider soundstage is a legitimate preference —; the flag trips outside a declared range that accounts for both values, so falling outside it is a conscious choice rather than an undeclared side effect of the automatic layout.`,
      calcAngulo: (p) => `angle = ${p.angulo}° (declared range: ${p.min}°-${p.max}°)`,
      filaAsimetria: (p) => `${p.nombre}: Δ = ${p.deltaM} m (${p.deltaUs} µs) between channels`,
      diferenciaNivel: (p) =>
        `Level difference between channels (direct path, two decorrelated sources): ${p.db} dB — the same distance asymmetry above, expressed as level instead of time.`,
      avisoAsimetria: (p) =>
        `<b>Asymmetry above the threshold in:</b> ${p.items}. With well-calibrated cables/channels, this comes from positioning, not the electronics — worth checking that both speakers and the listening spot are where the layout shows them.`,
      avisoAnguloEstrecho: 'A wider angle (speakers further apart, or the listening spot closer) opens up the stereo image — at the cost of a less defined center if overdone.',
      avisoAnguloAmplio: 'A narrower angle (speakers closer together, or the listening spot further back) closes the central phase gap between the speakers.',
      fuente: (p) =>
        `<b>Criterion:</b> asymmetry — homologous-path difference between channels greater than ${p.umbralM} m (≈145 µs at 343 m/s), a site criterion. Angle — stereo equilateral-triangle convention (${p.convencion}°, not invented by the site) and the site's own reference (~${p.referencia}°, what the automatic layout gives due to the 1.2 factor in the listening row — declared, not corrected); the declared range ${p.min}°-${p.max}° before flagging it is a site criterion, chosen to account for both values. Rigid room geometry, first order, no directivity — verified by listening.`,
    },

    reverberacion: {
      titulo: 'Estimated reverberation time (RT60)',
      verdicto: {
        'rt60-estimado': 'Estimated, not measured',
        'rt60-fuera-de-dominio': 'Cannot be estimated',
      },
      simple: {
        'rt60-estimado': "It's an estimated range, not a measurement of your room — verify with a phone app.",
        'rt60-fuera-de-dominio': "This room is outside what this model can calculate — it needs measuring.",
      },
      texto: (p) =>
        `Estimated RT60 between <b>≈${p.rtAmoblado} s</b> (furnished room, with typical furniture/curtains) and <b>≈${p.rtVacio} s</b> (empty room, bare surfaces only) — two declared scenarios with an assumed content term (see "View technical detail"), neither is a measurement of your actual room. With bare surfaces alone this model overestimates almost any domestic room; with an assumed furnishing it can swing to the opposite result depending on how much furniture is assumed — that's why it no longer builds a single-number traffic light: the range is the honest answer. Above ≈${p.fs} Hz (the Schroeder frequency of the furnished scenario) the sound field is dense enough for a single reverberation time to make sense; below it, behavior is dominated by individual resonances — see "Room modes" above. Of everything in this analysis, RT60 is the one thing you can measure yourself in a few minutes with a phone app — that number will be more reliable than either of the two you see here.`,
      textoFueraDeDominio:
        'With the materials chosen, this room absorbs (or is open enough) that sound dies out in one or two bounces, not many — the "diffuse sound field" condition that both Sabine and Eyring need for averaging to make sense no longer holds here. That\'s why this card shows no number at all: still calculating with those formulas would produce a figure that no longer describes the real room, not a conservative estimate. This is exactly what you can measure yourself with a phone app — the model has nothing better to offer here than that measurement.',
      superficies: {
        frontal: 'Front wall',
        posterior: 'Rear wall',
        izquierdo: 'Left wall',
        derecho: 'Right wall',
        piso: 'Floor',
        techo: 'Ceiling',
      },
      calc: (p) => {
        const filaBanda = (b: { hz: string; alphaBar: string; rt60: string | null; metodo: string }): string =>
          b.rt60 !== null
            ? `${b.hz} Hz: ᾱ=${b.alphaBar} → RT60 = ${b.rt60} s (${b.metodo})`
            : `${b.hz} Hz: ᾱ=${b.alphaBar} → outside the Sabine/Eyring domain (no number applies)`;
        return (
          p.filas.map((f) => `${f.nombre}: ${f.superficie} m² × ${f.alpha} = ${f.absorcion} sabins`).join('<br>') +
          `<br>Structure (500 Hz band): <b>${p.absorcionEstructura} sabins</b> + assumed content (furnished scenario): <b>${p.absorcionContenido} sabins</b> — volume: ${p.volumen} m³<br><br>` +
          `<b>Furnished scenario (realistic) — all 3 bands:</b><br>` +
          p.bandasAmoblado.map(filaBanda).join('<br>') +
          `<br><br><b>Empty scenario (bare room) — all 3 bands:</b><br>` +
          p.bandasVacio.map(filaBanda).join('<br>') +
          (p.rtAmoblado !== null && p.rtVacio !== null
            ? `<br><br>Final RT60 (500+2000 Hz average): <b>${p.rtAmoblado} s</b> (furnished) — <b>${p.rtVacio} s</b> (empty)`
            : `<br><br>Final RT60: not averaged — at least one of the 500/2000 Hz bands fell outside the model's domain (see above)`) +
          (p.schroeder !== null
            ? `<br>Schroeder frequency (furnished scenario): fs ≈ <b>${p.schroeder} Hz</b>`
            : `<br>Schroeder frequency: cannot be calculated without a valid 500 Hz RT60`)
        );
      },
      fuente:
        "<b>Formula:</b> Sabine's equation (RT60 = 0.161·V/A) for bands with average absorption ᾱ≤0.20; Eyring's equation (RT60 = 0.161·V/(−S·ln(1−ᾱ))) between that threshold and ᾱ=0.80, where Sabine overestimates reverberation time — a criterion from architectural acoustics literature, not invented by the site. Above ᾱ=0.80, neither formula still describes the room — both assume a diffuse sound field (many bounces, not one or two) that stops existing at that absorption — so that band reports no number. Computed separately in 3 bands (125/500/2000 Hz), summed surface by surface in each — not a single coefficient for the whole room, not even a single \"wall\" value: each wall is oriented and declared separately. Per-material, per-band absorption coefficients are a site criterion: typical values from architectural acoustics literature, not a measurement of your real room. Content (furniture, curtains, bookshelves) is added as sabins per m² of floor, in two scenarios — empty (zero) and furnished — also a site criterion, not a published table: the order of magnitude is consistent with the literature, but it doesn't replace measuring. \"Open\" on a wall also uses Sabine's historical reference coefficient for an opening (α=1.0 in all 3 bands: nothing that reaches it comes back into the room). Verified by measuring with an SPL meter or an RT60 app.",
      avisoVacio: (p) =>
        `<b>Wall(s) declared open:</b> ${p.muros}. They don't reflect sound — that's why this calculation gives more absorption (a shorter RT60) than if those walls were real surfaces, and the isometric view draws no reflection for that wall. The room modes (resonances) in the section above are <b>not adjusted</b> for an opening: they still assume rigid walls at both ends of each axis, so the resonance calculated on that wall's axis is less representative than in a closed room.`,
    },

    componentes: {
      nombre: {
        potencia: 'Power',
        carga: 'Load',
        modos: 'Room modes',
        filtroPeine: 'Comb filtering',
        trianguloEscucha: 'Listening triangle',
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
    sinConvencion: 'no convention',
    confianza: { alta: 'high', media: 'medium', baja: 'low' },
  },
};
