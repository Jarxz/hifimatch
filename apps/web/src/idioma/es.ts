/**
 * Español — la fuente de verdad del esquema de textos. `Textos` (en.ts) se
 * infiere de `typeof es` sin `as const`: los valores se ensanchan a
 * `string`, así que `en` puede tener otro texto pero no otra forma. Una
 * clave faltante o una función con otra firma en en.ts es error de `tsc`,
 * no un texto vacío en pantalla.
 *
 * Los parámetros de las funciones son siempre `string` ya formateado (por
 * `formato/numeros.ts`, según el idioma activo) — el diccionario nunca
 * formatea números, sólo redacta. Evita el bug clásico de "traduje el
 * texto pero se me quedó la coma decimal del otro idioma".
 */
import type { CodigoPotencia } from '../../../../packages/engine/src/potencia.ts';
import type { CodigoCarga } from '../../../../packages/engine/src/carga.ts';
import type { CodigoPuenteImpedancias, CodigoRecorridoVolumen } from '../../../../packages/engine/src/ganancia.ts';
import type { CodigoModos, EjeSala } from '../../../../packages/engine/src/modos.ts';
import type { CodigoReverberacion } from '../../../../packages/engine/src/reverberacion.ts';
import type { ComponentePuntaje } from '../../../../packages/engine/src/puntaje.ts';
import type { Confianza } from '../../../../packages/engine/src/tipos.ts';

export const es = {
  meta: {
    lang: 'es-CL',
    titulo: 'The Hifi Match · compatibilidad hi-fi',
    descripcion: 'Analiza si un sistema hi-fi es compatible entre sí y qué entrega en tu sala.',
  },

  comun: {
    idiomaAria: 'Cambiar idioma',
    infoAria: 'Ver información',
    cerrarAria: 'Cerrar',
  },

  splash: {
    entrarAria: 'Entrar al análisis de compatibilidad',
    subtitulo: 'análisis de compatibilidad hi-fi',
    cta: 'Analizar un sistema',
    pie: 'basado en física · specs medidos',
    cierreHtml: '<b>The Hifi Match</b> te da la información.<br>Tú escuchas y decides.',
  },

  info: {
    hs: 'Guía del análisis',
    boton: 'Info',
    volver: '← Volver al análisis',
    titulo: 'Cómo leer este análisis',
    intro:
      'Esta página explica qué significa cada tarjeta del resultado y de dónde sale cada número — para que el análisis se pueda leer con criterio propio, no sólo confiando en el veredicto final.',
    capas: {
      titulo: 'Dos tipos de afirmación: física y criterio editorial',
      cuerpoHtml:
        'Todo lo que este sitio afirma pertenece a una de dos categorías, y siempre se declara cuál. <b>Capa física:</b> tiene fórmula, umbral, fuente del dato y nivel de confianza — es refutable, alguien puede discutir un umbral con argumentos. Es casi todo lo que ves (potencia, carga, puente de impedancias, modos de sala, reverberación). <b>Capa criterio editorial:</b> preferencias que este sitio declara desde su propio criterio, no una medición — hoy es sólo el puntaje 1-10, que combina las severidades de arriba con pesos que este sitio eligió. Otro sitio razonable pesaría distinto, y eso no lo haría "menos correcto": es una opinión declarada, no un dato. Las dos capas nunca se mezclan visualmente — cada tarjeta dice de cuál se trata.',
    },
    confianza: {
      titulo: 'Fuente y confianza de cada dato',
      cuerpoHtml:
        'Los fabricantes publican mal algunos datos — la impedancia de salida de streamers/DACs casi nunca está en la ficha, la sensibilidad de parlantes a veces se mide en condiciones optimistas. Por eso cada dato del catálogo lleva de dónde salió y una confianza (<b>alta/media/baja</b>): alta cuando viene de la ficha oficial o de una medición independiente que la confirma; media o baja cuando hay que inferirlo o sólo hay una fuente. <b>Un dato faltante nunca se muestra como si el equipo estuviera "bien"</b> — si falta el dato que una regla necesita, esa tarjeta se oculta del análisis principal y aparece declarada en "Sin datos suficientes", al final. Nunca se rellena un hueco con un "estándar de mercado" inventado: la dispersión real de specs entre equipos (por ejemplo, impedancia de salida de fuentes entre 10 Ω y 500 Ω) hace que cualquier valor único sea, en la práctica, un dato inventado.',
    },
    potencia: {
      titulo: 'Potencia frente a los picos de la sala',
      cuerpoHtml:
        'La pregunta que responde esta tarjeta: ¿el amplificador entrega el nivel de pico (SPL) que la sala pide, a la distancia real de escucha? Se calcula desde la sensibilidad del parlante, la potencia del amplificador y la distancia, sumando un refuerzo típico por par de parlantes (+6 dB) y por sala pequeña (+3 dB) — dos supuestos declarados, no datos del equipo, que se verifican midiendo. El resultado es un <b>margen en dB</b> sobre el pico objetivo del nivel de escucha elegido (moderado/alto/referencia). La frase simple de la tarjeta reexpresa ese margen como <b>% de la capacidad del amplificador</b> que exige ese pico — más intuitivo que un número en dB: si el margen es de +6 dB, el amplificador está usando apenas una fracción de lo que tiene; si el margen es negativo, exigiría más del 100% de su capacidad, es decir, recortaría la señal (clipping) en los picos.',
    },
    carga: {
      titulo: 'La carga que ve el amplificador',
      cuerpoHtml:
        'La impedancia de un parlante no es un número fijo — baja en ciertas frecuencias, y esa caída (impedancia mínima) es la que realmente exige corriente al amplificador, no la impedancia nominal de la ficha. Esta tarjeta compara esa impedancia mínima contra lo que el amplificador puede sostener: si la carga es exigente (impedancia mínima baja), el resultado depende de si el amplificador tiene <b>reserva de corriente</b> (duplica su potencia al bajar a la mitad la impedancia, señal de una fuente de alimentación robusta) o simplemente <b>potencia bruta</b> de sobra. Cuando el fabricante no publica la impedancia mínima del parlante, la tarjeta no se muestra en el análisis principal — aparece declarada en "Sin datos suficientes".',
    },
    ganancia: {
      titulo: 'Puente de impedancias y recorrido de volumen',
      cuerpoHtml:
        'Cuando eliges un streamer o un DAC, hay dos preguntas de "cadena de ganancia" que la fuente y el amplificador tienen que resolver entre sí. <b>Puente de impedancias:</b> la convención de la industria pide que la impedancia de entrada del amplificador sea al menos 10 veces la impedancia de salida de la fuente (ratioZ ≥ 10:1) — si no se cumple, se pierden graves y se satura el estéreo separación de canales. <b>Recorrido de volumen:</b> compara el voltaje de salida de la fuente contra lo que el amplificador necesita para llegar a máxima potencia — si la fuente entrega mucho más voltaje del necesario, el control de volumen del amplificador queda "corto", usable en un rango muy chico antes de llegar al tope. Streamer y DAC se evalúan cada uno por separado, en su propio par de tarjetas.',
    },
    modos: {
      titulo: 'Modos de sala (resonancias de graves)',
      cuerpoHtml:
        'Toda sala rectangular refuerza ciertas frecuencias graves según sus tres dimensiones — son los <b>modos axiales</b>, resonancias que aparecen porque el ancho, el largo y el alto de la sala "encajan" con ciertas longitudes de onda. Cuando dos modos de ejes distintos caen muy cerca en frecuencia (menos de 5%, por debajo de 150 Hz — ambos umbrales declarados por este sitio, no una convención publicada), ese refuerzo se nota más: es una frecuencia donde la sala probablemente sonará más "gorda" o resonante que el resto del rango grave. Esta regla nunca da severidad "error" — es una predicción desde geometría de sala rígida, que se equivoca fácil y siempre se verifica midiendo o escuchando en el espacio real.',
    },
    reverberacion: {
      titulo: 'Tiempo de reverberación estimado (RT60)',
      cuerpoHtml:
        'El RT60 es cuánto tarda el sonido en apagarse 60 dB después de que la fuente se corta — una sala con mucha reverberación suena "viva", con eco; una con muy poca suena "seca", apagada. Se calcula con la ecuación de Sabine a partir del volumen de la sala y la absorción de cada superficie (los 4 muros por separado, piso y techo), cada una con el material que elijas — hormigón y vidrio reflejan mucho, panel acústico y alfombra absorben mucho, y un muro declarado "vacío" (una abertura real) absorbe como una ventana abierta: nada de lo que llega ahí vuelve a la sala. El rango cómodo declarado para escucha crítica es 0,3–0,6 segundos.',
    },
    plano: {
      titulo: 'Vista isométrica y reflexiones tempranas',
      cuerpoHtml:
        'El diagrama dibuja la sala a escala, con la disposición de referencia de los parlantes (triángulo simétrico) y el <b>punto dulce</b> — el vértice de ese triángulo, la posición de escucha que ese cálculo asume. Cada punto marcado sobre una pared, el techo o el piso es una <b>primera reflexión</b>: el camino que recorre el sonido desde el parlante, rebotando en esa superficie, hasta llegar al punto dulce — calculado con el método de imagen especular (el mismo que usan los estudios de acústica para ubicar puntos de tratamiento). Cada reflexión muestra su distancia total en metros. Un muro declarado "vacío" no dibuja su reflexión, porque no hay pared de la que rebotar. El botón "Vista" cambia el ángulo de cámara (isométrica/frontal/lateral/superior) sin recalcular nada — es la misma geometría, mirada desde otro lado.',
    },
    puntaje: {
      titulo: 'Puntaje del match (1-10)',
      cuerpoHtml:
        'Es la única pieza del sitio que vive en la capa de <b>criterio editorial</b>, no física — un número con un decimal que combina las severidades de potencia, carga, modos de sala, reverberación, y puente de impedancias + recorrido de volumen (evaluados por separado para streamer y para DAC, cuando hay ambos elegidos), con pesos que este sitio declara (potencia 24% · carga 20% · modos 10% · reverberación 10% · puente 10% y recorrido 8% por cada fuente). Un componente sin dato suficiente no se incluye — ni suma ni resta, y el sitio declara cuántos de hasta 8 componentes posibles sí se pudieron evaluar. El número lleva color (verde/naranjo/rojo) para que se lea de un vistazo, pero sigue siendo una opinión declarada sobre cómo ponderar los hallazgos físicos de arriba, no un dato medido nuevo.',
    },
  },

  config: {
    hs: 'Configurar',
    volver: '← Volver',
    lead: 'Define la cadena',
    leadNote:
      'Elige un amplificador y un par de parlantes, y dale las medidas de la sala. El análisis calcula la potencia que el sistema pide en ese espacio y propone una disposición.',
    parlantes: 'Parlantes',
    amplificador: 'Amplificador',
    streamer: 'Streamer',
    dac: 'DAC',
    requerido: 'requerido',
    opcionalFuente: 'opcional',
    selectPlaceholder: '— Selecciona —',
    fuentePlaceholder: '— Ninguno (opcional) —',
    masParlantes: 'Más parlantes · próximamente',
    masAmplificadores: 'Más amplificadores · próximamente',
    masStreamers: 'Más streamers · próximamente',
    masDacs: 'Más DACs · próximamente',
    verFicha: 'Ficha del producto · próximamente',
    verDescripcion: 'Ver descripción',
    dimensionesTitulo: 'Dimensiones de la sala',
    ancho: 'Ancho (frente)',
    largo: 'Largo (fondo)',
    alto: 'Alto',
    materialesTitulo: 'Materiales de la sala',
    muroFrontal: 'Muro frontal',
    muroPosterior: 'Muro posterior',
    muroIzquierdo: 'Muro izquierdo',
    muroDerecho: 'Muro derecho',
    piso: 'Material del piso',
    techo: 'Material del cielo',
    materiales: {
      hormigon: 'Hormigón',
      vidrio: 'Vidrio / ventanal',
      madera: 'Madera',
      yesoCarton: 'Placa yeso cartón',
      panelAcustico: 'Panel acústico',
      vacio: 'Vacío (abertura)',
      maderaLaminado: 'Madera laminado',
      porcelanato: 'Porcelanato',
      alfombra: 'Alfombra',
    },
    nivelEscucha: 'Nivel de escucha',
    nivelModerado: 'Moderado',
    nivelAlto: 'Alto',
    nivelReferencia: 'Referencia',
    genero: 'Género musical',
    generoRockPop: 'Rock/Pop',
    generoJazzVocal: 'Jazz/Vocal',
    generoClasica: 'Clásica',
    distanciaResultante: 'Distancia de escucha resultante',
    volumenPrefix: 'volumen',
    proximamente: 'Próximamente',
    subwoofer: 'Subwoofer',
    cables: 'Cables',
    faltaElegir: (p: { que: string }): string => `Falta elegir ${p.que}`,
    faltaParlantes: 'parlantes',
    faltaAmplificador: 'amplificador',
    faltaY: ' y ',
    analizar: 'Analizar',
  },

  resultado: {
    hs: 'Resultado',
    volver: '← Cambiar sistema',
    guardarBoton: 'Guardar',
    guardarPopupTitulo: 'Debe iniciar sesión',
    guardarPopupCuerpo: 'Pronto disponible.',
    cadena: 'La cadena',
    itemParlantes: 'Parlantes',
    itemAmplificador: 'Amplificador',
    itemStreamer: 'Streamer',
    itemDac: 'DAC',
    sala: 'Sala',
    anchoLargo: 'Ancho × largo',
    alto: 'Alto',
    distanciaEscucha: 'Distancia escucha',
    nivel: 'Nivel',
    picoObjetivo: 'Pico objetivo',
    evaluacion: 'Evaluación',
    capaFisica: 'Capa física',
    geometria: 'Geometría',
    disposicionReferencia: 'Disposición de referencia',
    verDetalle: 'Ver detalle técnico',
    plano: {
      titulo: 'Vista isométrica, escucha y reflexiones',
      texto:
        'Disposición simétrica calculada desde las medidas de la sala, en un cubo de alambre a escala. El punto dulce es el vértice del triángulo con los parlantes; cada punto marcado sobre una superficie es una primera reflexión (lateral, trasera, techo o piso), con la distancia total del camino parlante→superficie→escucha. Un muro declarado "vacío" no dibuja su reflexión — el sonido no vuelve, se escapa.',
      leyendaTriangulo: 'triángulo de escucha',
      leyendaReflexion: 'reflexión (con distancia)',
      leyendaParlante: 'parlante / escucha',
      muroFrontalCorto: 'FRONTAL',
      muroPosteriorCorto: 'POSTERIOR',
      muroIzquierdoCorto: 'IZQUIERDO',
      muroDerechoCorto: 'DERECHO',
      aberturaSufijo: ' (abierto)',
      puntoDulce: 'punto dulce',
      fuente:
        'Predicción desde geometría de sala rígida y rectangular, método de imagen especular. Las reflexiones de techo y piso asumen parlante y oído a la misma altura (1,0 m, criterio del sitio) — no una medición de tu instalación real. Se afina escuchando y midiendo en el espacio real; no reemplaza esa verificación.',
      vista: 'Vista',
      vistaIsometrica: 'Isométrica',
      vistaFrontal: 'Frontal',
      vistaLateral: 'Lateral',
      vistaSuperior: 'Superior',
      ubicacionTitulo: 'Ubicación de referencia de los parlantes',
      ubicacion: (p: { frontal: string; lateral: string; separacion: string }): string =>
        `Distancia a la pared frontal: <b>${p.frontal} m</b>. Distancia a cada pared lateral: <b>${p.lateral} m</b>. Separación entre parlantes: <b>${p.separacion} m</b>. Es la disposición de referencia que usa el resto del análisis (potencia, modos, reflexiones) — se afina moviendo los parlantes y escuchando en el espacio real.`,
    },
    footer: {
      html:
        '<b>Análisis basado en física publicada.</b> Cada dato lleva su fuente y su nivel de confianza. ' +
        'El cálculo de potencia asume suma de par (+6&nbsp;dB) y ganancia de sala (+3&nbsp;dB), que se ' +
        'verifican midiendo. No se emiten juicios de timbre, escena ni sinergia sonora: eso no se calcula.<br>' +
        'Si se agrega una fuente digital (streamer o DAC), el puente de impedancias usa la convención de 10:1 ' +
        'de la industria; el umbral de recorrido de volumen (10×) es un criterio del sitio, pensado para ' +
        'verificarse escuchando.<br>' +
        'Base de datos inicial de equipos populares y bien medidos. Cuando la sensibilidad de fábrica se mide ' +
        'en media-espacio y sobreestima, se usa la medición anecoica independiente.',
    },
  },

  motor: {
    potencia: {
      titulo: 'Potencia frente a los picos de la sala',
      escalaInsuficiente: 'insuficiente',
      escalaEje: 'margen sobre el pico (dB)',
      escalaSobra: 'de sobra',
      verdicto: {
        'con-margen': 'Con margen',
        justo: 'Justo',
        insuficiente: 'Insuficiente',
      } satisfies Record<CodigoPotencia, string>,
      simple: {
        'con-margen': (p: { porcentaje: string }): string =>
          `Potencia superior a la necesaria: a este nivel, el amplificador usa sólo el ${p.porcentaje}% de su capacidad — queda margen de sobra para picos fuertes sin distorsión.`,
        justo: (p: { porcentaje: string }): string =>
          `Potencia ajustada: a este nivel, el amplificador ya usa cerca del ${p.porcentaje}% de su capacidad — los pasajes más dinámicos quedan al límite.`,
        insuficiente: (p: { porcentaje: string }): string =>
          `Potencia insuficiente: alcanzar este pico exigiría el ${p.porcentaje}% de la capacidad del amplificador, más de lo que tiene disponible — riesgo de recorte (clipping) en los picos.`,
      } satisfies Record<CodigoPotencia, (p: { porcentaje: string }) => string>,
      conMargen: (p: { amp: string; nivel: string; margenDb: string; distM: string }): string =>
        `El ${p.amp} entrega los picos a nivel <b>${p.nivel}</b> con <b>${p.margenDb} dB</b> de margen a ${p.distM} m. Alcanza con holgura.`,
      justoTexto: (p: { nivel: string; margenDb: string }): string =>
        `Llega a los picos a nivel <b>${p.nivel}</b>, pero con sólo <b>${p.margenDb} dB</b> de margen. En los transientes más fuertes queda al límite.`,
      insuficienteTexto: (p: { margenAbsDb: string; nivel: string; distM: string }): string =>
        `Faltan <b>${p.margenAbsDb} dB</b> para los picos a nivel <b>${p.nivel}</b> a ${p.distM} m. A ese volumen el amplificador recorta.`,
      calc: (p: { sens: string; distM: string; p8: string; splDb: string; nivel: string; picoDb: string; margenSigno: string }): string =>
        `SPL disponible = ${p.sens} − 20·log₁₀(${p.distM}) + 10·log₁₀(${p.p8}) + 6 <span style="color:var(--faint)">par</span> + 3 <span style="color:var(--faint)">sala</span> = <b>${p.splDb} dB</b><br>` +
        `objetivo en pico (${p.nivel}) = <b>${p.picoDb} dB</b><br>` +
        `margen = ${p.splDb} − ${p.picoDb} = <b>${p.margenSigno} dB</b>`,
      avisoRecMin: (p: { recomendadaW: string; entregadaW: string }): string =>
        `El fabricante recomienda desde ${p.recomendadaW} W para este parlante; el amplificador entrega ${p.entregadaW} W.`,
      fuente: (p: { sensFuente: string; sensNota: string; sensConf: string; potFuente: string; potConf: string }): string =>
        `<b>Fuente sensibilidad:</b> ${p.sensFuente}${p.sensNota} <span class="conf">confianza ${p.sensConf}</span><br>` +
        `<b>Fuente potencia:</b> ${p.potFuente} (RMS, 8 Ω) <span class="conf">confianza ${p.potConf}</span>`,
      crestFactor: (p: { genero: string; crestFactorDb: string; nivelPromedio: string }): string =>
        `Con el crest factor típico de <b>${p.genero}</b> (~${p.crestFactorDb} dB pico-promedio), el pico de arriba implica escuchar en promedio alrededor de <b>${p.nivelPromedio} dB</b>. Es un valor típico del género, no de la grabación puntual que estés escuchando.`,
    },

    carga: {
      titulo: 'La carga que ve el amplificador',
      verdicto: {
        'sin-dato': 'Sin dato',
        'exige-corriente': 'Exige corriente',
        cubierto: 'Cubierto',
        'carga-benigna': 'Carga benigna',
      } satisfies Record<CodigoCarga, string>,
      simple: {
        'sin-dato': 'No hay dato suficiente para evaluar esta carga.',
        'exige-corriente': 'Esta combinación pide más corriente de la que este amplificador reserva.',
        cubierto: 'El amplificador maneja bien esta carga.',
        'carga-benigna': 'Una carga fácil, sin riesgo para el amplificador.',
      } satisfies Record<CodigoCarga, string>,
      sinDatosTexto:
        'No hay una medición precisa de la impedancia mínima de este parlante. Las mediciones independientes no reportan caídas críticas, pero <b>sin el dato no se afirma que sea una carga fácil</b>.',
      sinDatosAviso: 'Un dato faltante no se cuenta como aprobado. <b>Pendiente:</b> curva de impedancia medida.',
      sinDatosFuente: (p: { nomZ: string }): string =>
        `<b>Fuente:</b> impedancia nominal ${p.nomZ} Ω (fábrica). Mínima: sin medición. <span class="conf">confianza baja</span>`,
      warnTexto: (p: { minZ: string }): string =>
        `La impedancia baja a <b>${p.minZ} Ω</b>, justo donde el bajo pide más corriente. Con un amplificador de potencia modesta puede sentirse el grave blando o sin control.`,
      warnAviso:
        'Conviene un amplificador que <b>doble su potencia al bajar de 8 a 4 Ω</b> (reserva ≥1,7×) o que entregue <b>60 W o más</b> en 8 Ω — señal de buena entrega de corriente.',
      duroPrefix: (p: { minZ: string }): string =>
        `La impedancia baja a <b>${p.minZ} Ω</b>, una carga exigente, pero este amplificador `,
      duroClauseConReserva: 'tiene reserva de corriente (casi dobla su potencia a 4 Ω) y la controla.',
      duroClauseConDatoP4: (p: { ratio: string }): string =>
        `aunque su reserva a 4 Ω (${p.ratio}×) no llega al umbral de 1,7×, entrega suficiente potencia (≥60 W en 8 Ω) como para controlarla.`,
      duroClauseSinDatoP4:
        'no hay dato de cuánto sube su potencia a 4 Ω, pero entrega suficiente potencia (≥60 W en 8 Ω) como para controlarla.',
      benignaTexto: 'La impedancia se mantiene alta; es una carga fácil para cualquier amplificador.',
      fuente: (p: { nomZ: string; minZ: string }): string =>
        `<b>Fuente:</b> impedancia nominal ${p.nomZ} Ω, mínima ${p.minZ} Ω (fábrica / medición). <span class="conf">confianza media</span>`,
    },

    puente: {
      tituloStreamer: 'Puente de impedancias: streamer → amplificador',
      tituloDac: 'Puente de impedancias: DAC → amplificador',
      verdicto: {
        'sin-dato': 'Sin dato',
        'puente-correcto': 'Puente correcto',
        'puente-ajustado': 'Puente ajustado',
        'puente-insuficiente': 'Puente insuficiente',
      } satisfies Record<CodigoPuenteImpedancias, string>,
      simple: {
        'sin-dato': 'Falta dato para evaluar este empalme.',
        'puente-correcto': 'La señal pasa bien de la fuente al amplificador.',
        'puente-ajustado': 'El empalme funciona, pero con menos margen del ideal.',
        'puente-insuficiente': 'Se pierde señal entre la fuente y el amplificador.',
      } satisfies Record<CodigoPuenteImpedancias, string>,
      sinDatosTexto: (p: { fuente: string; amp: string }): string =>
        `Falta la impedancia de salida de <b>${p.fuente}</b> o la de entrada de <b>${p.amp}</b>. Sin ambos datos no se afirma que el puente sea correcto.`,
      sinDatosAviso:
        'Un dato faltante no se cuenta como aprobado. <b>Pendiente:</b> impedancia de salida de la fuente o de entrada del amplificador.',
      calc: (p: { amp: string; fuente: string; inZ: string; outZ: string; ratio: string }): string =>
        `ratioZ = Z entrada(${p.amp}) / Z salida(${p.fuente}) = ${p.inZ} / ${p.outZ} = <b>${p.ratio}×</b>`,
      okTexto: (p: { ratio: string; umbral: number }): string =>
        `La entrada del amplificador es <b>${p.ratio}×</b> la impedancia de salida de la fuente — sobre la convención de ${p.umbral}:1 para transferir la señal sin pérdida perceptible.`,
      warnTexto: (p: { ratio: string; umbral: number }): string =>
        `La entrada del amplificador es sólo <b>${p.ratio}×</b> la impedancia de salida de la fuente — bajo la convención de ${p.umbral}:1. Con cables largos o de alta capacitancia puede haber pérdida de nivel o de graves medible.`,
      warnAviso: 'Conviene una fuente con menor impedancia de salida, o cables de interconexión cortos y de baja capacitancia.',
      alertTexto: (p: { ratio: string }): string =>
        `La impedancia de entrada del amplificador es menor que la de salida de la fuente (<b>${p.ratio}×</b>) — la fuente no tiene margen para manejar esa entrada. Pérdida de nivel significativa.`,
      alertAviso:
        'Esta combinación no transfiere la señal correctamente. Conviene otra fuente o un preamplificador intermedio con baja impedancia de salida.',
      fuente: (p: { umbral: number; confianza: string }): string =>
        `<b>Convención:</b> puente de voltaje ≥${p.umbral}:1 (Rane «Sound System Interconnection»; Whitlock / Jensen Transformers) — no es un dato del equipo, es una convención de ingeniería de audio. <span class="conf">confianza ${p.confianza}</span>`,
    },

    recorrido: {
      tituloStreamer: 'Recorrido del volumen: streamer',
      tituloDac: 'Recorrido del volumen: DAC',
      verdicto: {
        'sin-dato': 'Sin dato',
        insuficiente: 'Insuficiente',
        'recorrido-sano': 'Recorrido de volumen sano',
        'recorrido-corto': 'Recorrido corto',
      } satisfies Record<CodigoRecorridoVolumen, string>,
      simple: {
        'sin-dato': 'Falta dato para evaluar el recorrido de volumen.',
        insuficiente: 'El volumen no va a alcanzar el nivel necesario.',
        'recorrido-sano': 'Vas a usar un rango cómodo del dial de volumen.',
        'recorrido-corto': 'Vas a mover el volumen en un rango muy chico del dial.',
      } satisfies Record<CodigoRecorridoVolumen, string>,
      sinDatosTexto: (p: { fuente: string; amp: string }): string =>
        `Falta el voltaje de salida de <b>${p.fuente}</b> o la sensibilidad de entrada de <b>${p.amp}</b>.`,
      sinDatosAviso:
        'Un dato faltante no se cuenta como aprobado. <b>Pendiente:</b> voltaje de salida de la fuente o sensibilidad de entrada del amplificador.',
      calc: (p: { fuente: string; amp: string; salidaV: string; sensV: string; margen: string }): string =>
        `margenV = salidaV(${p.fuente}) / sensEntrada(${p.amp}) = ${p.salidaV} / ${p.sensV} = <b>${p.margen}×</b>`,
      okTexto: (p: { margen: string }): string =>
        `La fuente entrega <b>${p.margen}×</b> la tensión que el amplificador necesita para su potencia nominal — recorrido de volumen sano.`,
      warnTexto: (p: { margen: string }): string =>
        `La fuente entrega <b>${p.margen}×</b> de sobra la tensión que necesita el amplificador — se usa sólo una fracción baja del recorrido del potenciómetro. El sistema funciona, con menos resolución de volumen en el rango de escucha habitual.`,
      alertTexto: (p: { margen: string }): string =>
        `La fuente entrega sólo <b>${p.margen}×</b> la tensión que el amplificador necesita para su potencia nominal — no alcanza. El margen que calculó la regla de potencia deja de ser válido con esta fuente conectada.`,
      alertAviso: 'Conviene una fuente con mayor tensión de salida, o revisar si hay una etapa de preamplificación intermedia.',
      fuente: (p: { umbral: number; confianza: string }): string =>
        `<b>Umbral de recorrido:</b> ${p.umbral}× — criterio del sitio, no una convención publicada; se verifica escuchando. <span class="conf">confianza ${p.confianza}</span>`,
    },

    modos: {
      titulo: 'Modos de sala (graves)',
      verdicto: {
        'modos-distribuidos': 'Bien distribuidos',
        'modos-agrupados': 'Modos agrupados',
      } satisfies Record<CodigoModos, string>,
      simple: {
        'modos-distribuidos': 'Los graves de la sala están razonablemente parejos.',
        'modos-agrupados': 'Hay frecuencias graves que probablemente sonarán reforzadas.',
      } satisfies Record<CodigoModos, string>,
      eje: { ancho: 'ancho', largo: 'largo', alto: 'alto' } satisfies Record<EjeSala, string>,
      textoOk: (p: { techo: string }): string =>
        `Las resonancias de graves de la sala están razonablemente distribuidas por debajo de ${p.techo} Hz — no se detectan coincidencias que refuercen una frecuencia en particular.`,
      textoWarn: (p: { n: string; techo: string }): string =>
        `${p.n} par(es) de modos caen dentro del umbral de agrupamiento por debajo de ${p.techo} Hz — señal de refuerzo de graves en esas frecuencias.`,
      parAgrupado: (p: { a: string; b: string; frecuenciaA: string; frecuenciaB: string }): string =>
        `${p.a} (${p.frecuenciaA} Hz) y ${p.b} (${p.frecuenciaB} Hz)`,
      fuente: (p: { techo: string; umbral: string }): string =>
        `<b>Criterio:</b> modelo de sala rígida y rectangular, sólo modos axiales. Agrupamiento = dos modos de ejes distintos a menos de ${p.umbral}% de diferencia entre sí, por debajo de ${p.techo} Hz — criterio del sitio, no una convención publicada; se verifica midiendo/escuchando.`,
      sugerencia:
        'Conviene reposicionar los parlantes o el punto de escucha, o tratar acústicamente esas frecuencias — se verifica escuchando y midiendo en el espacio real. Un filtro paramétrico (EQ activo) centrado cerca de esas frecuencias también puede atenuar el refuerzo, pero ajustarlo bien exige medir la sala real: este modelo no tiene la amplitud ni la fase medidas como para proponer un Q o una atenuación en dB.',
      curvaOrden: (p: { orden: string; frecuencia: string }): string => `orden ${p.orden} (${p.frecuencia} Hz)`,
      curvasCaption:
        'Presión relativa a lo largo de cada eje afectado — sólo los agrupamientos de menor frecuencia (los más audibles y difíciles de tratar). Curvas 1D independientes por eje, no un mapa combinado de la sala.',
    },

    reverberacion: {
      titulo: 'Tiempo de reverberación estimado (RT60)',
      nombreCorto: 'Reverberación',
      verdicto: {
        'rt60-corto': 'Muy seca',
        'rt60-ok': 'En rango',
        'rt60-largo': 'Muy viva',
      } satisfies Record<CodigoReverberacion, string>,
      simple: {
        'rt60-corto': 'La sala absorbe mucho — puede sonar apagada, sin aire.',
        'rt60-ok': 'El tiempo de reverberación está en un rango cómodo para escuchar.',
        'rt60-largo': 'La sala refleja mucho — puede sonar con eco o poco definida.',
      } satisfies Record<CodigoReverberacion, string>,
      texto: (p: { rt60: string; min: string; max: string }): string =>
        `RT60 estimado: <b>${p.rt60} s</b>. El rango cómodo declarado para escucha crítica en una sala doméstica es ${p.min}–${p.max} s (una sala de concierto apunta mucho más alto, ~1,5–2,5 s, porque es otro tipo de espacio).`,
      superficies: {
        frontal: 'Muro frontal',
        posterior: 'Muro posterior',
        izquierdo: 'Muro izquierdo',
        derecho: 'Muro derecho',
        piso: 'Piso',
        techo: 'Techo',
      },
      calc: (p: {
        filas: Array<{ nombre: string; superficie: string; alpha: string; absorcion: string }>;
        absorcionTotal: string;
        volumen: string;
        rt60: string;
      }): string =>
        p.filas.map((f) => `${f.nombre}: ${f.superficie} m² × ${f.alpha} = ${f.absorcion} sabines`).join('<br>') +
        `<br>Absorción total: <b>${p.absorcionTotal} sabines</b><br>` +
        `RT60 = 0,161 × ${p.volumen} / ${p.absorcionTotal} = <b>${p.rt60} s</b>`,
      fuente:
        '<b>Fórmula:</b> ecuación de Sabine, RT60 = 0,161·V/A (V = volumen, A = absorción total en sabines), sumada superficie por superficie — no un coeficiente único para toda la sala, ni siquiera un único valor de "muro": cada muro se orienta y se declara aparte. Los coeficientes de absorción por material son criterio del sitio: valores típicos de literatura de acústica arquitectónica (banda media, ~500 Hz–1 kHz), no una medición de tu sala real. "Vacío" usa el coeficiente de referencia histórico de Sabine para una abertura (α=1,0: nada de lo que llega ahí vuelve a la sala). Se verifica midiendo con un decibelímetro o una app de RT60.',
      avisoVacio: (p: { muros: string }): string =>
        `<b>Muro(s) declarado(s) abertura:</b> ${p.muros}. No reflejan sonido — por eso baja la reverberación calculada arriba, y el plano isométrico no dibuja la reflexión de ese muro. Los modos de sala (resonancias) de la tarjeta de arriba <b>no se ajustan</b> para una abertura: siguen asumiendo paredes rígidas en los dos extremos de cada eje, así que la resonancia calculada en el eje de ese muro es menos representativa que en una sala cerrada.`,
    },

    puntaje: {
      titulo: 'Puntaje del match',
      rotulo: 'Criterio editorial, no física',
      componente: {
        potencia: 'Potencia',
        carga: 'Carga',
        modos: 'Modos de sala',
        reverberacion: 'Reverberación',
        puenteStreamer: 'Puente de impedancias (Streamer)',
        recorridoStreamer: 'Recorrido de volumen (Streamer)',
        puenteDac: 'Puente de impedancias (DAC)',
        recorridoDac: 'Recorrido de volumen (DAC)',
      } satisfies Record<ComponentePuntaje['nombre'], string>,
      filaIncluida: (p: { nombre: string; puntos: string }): string => `${p.nombre}: ${p.puntos}/10`,
      filaExcluida: (p: { nombre: string }): string => `${p.nombre}: sin dato suficiente, no cuenta`,
      aviso: (p: { evaluados: string; total: string }): string =>
        `Calculado sobre ${p.evaluados} de ${p.total} componentes — el resto no tenía dato suficiente y no se incluyó (ni suma ni resta).`,
      criterio:
        '<b>Criterio editorial, no un dato medido:</b> combina las severidades de arriba con pesos que este sitio declara — potencia 24 % · carga 20 % · modos de sala 10 % · reverberación 10 % · puente de impedancias 10 % y recorrido de volumen 8 % por cada fuente elegida (streamer y/o DAC, evaluados por separado). Otro criterio razonable pesaría distinto.',
    },

    resumen: {
      titulo: 'En resumen',
      comportamiento: {
        ok: (p: { puntaje: string }): string =>
          `El sistema en conjunto funciona bien: la mayoría de los aspectos evaluados están resueltos, con un puntaje de ${p.puntaje}/10.`,
        warn: (p: { puntaje: string }): string =>
          `El sistema funciona, pero conviene revisar algunos puntos antes de darlo por cerrado — puntaje ${p.puntaje}/10.`,
        alert: (p: { puntaje: string }): string =>
          `El sistema tiene varios puntos que conviene resolver antes de considerarlo un buen match — puntaje ${p.puntaje}/10.`,
      },
      fortalezasTitulo: 'Lo que funciona bien',
      debilidadesTitulo: 'Lo que conviene revisar',
      sinDatosTitulo: 'Sin datos suficientes',
      recomendacionTitulo: 'Recomendaciones',
      resumenConteo: (p: { evaluados: string; fortalezas: string; debilidades: string }): string =>
        `De ${p.evaluados} componentes evaluados: ${p.fortalezas} sin observaciones y ${p.debilidades} con algo para revisar.`,
      itemFortaleza: (p: { nombre: string; verdicto: string }): string => `${p.nombre}: ${p.verdicto}`,
      itemConDetalle: (p: { nombre: string; verdicto: string; detalle: string }): string =>
        `${p.nombre}: ${p.verdicto} (${p.detalle})`,
      itemSinDatos: (p: { nombre: string }): string => `${p.nombre}: no se evaluó — falta el dato del fabricante que esta regla necesita.`,
      sinFortalezas: 'Ningún componente evaluado quedó sin observaciones.',
      sinDebilidades: 'Ningún componente evaluado quedó con algo para revisar.',
      recomendacionConAviso: (p: { nombre: string; aviso: string }): string => `<b>${p.nombre}:</b> ${p.aviso}`,
      recomendacionTodoOk:
        'No hay ningún punto pendiente entre lo evaluado, con los datos disponibles. Igual conviene escuchar y medir en el espacio real: la predicción no reemplaza esa verificación.',
    },
  },

  catalogo: {
    min: 'mín',
    max: 'máx',
    salida: 'salida',
    // Confianza ('alta'|'media'|'baja') es un código interno del motor,
    // igual en los dos idiomas — sólo esta tabla lo convierte a palabra
    // visible. Usarla siempre que se muestre una Confianza real del
    // catálogo; las menciones de confianza fijas/editoriales (ej. "sin
    // medición, confianza baja" en la regla de carga) van como texto
    // literal en cada plantilla, no pasan por acá.
    confianza: { alta: 'alta', media: 'media', baja: 'baja' } satisfies Record<Confianza, string>,
  },
};

export type Textos = typeof es;
