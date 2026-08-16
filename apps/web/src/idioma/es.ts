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
import type { ComponentePuntaje } from '../../../../packages/engine/src/puntaje.ts';
import type { Confianza } from '../../../../packages/engine/src/tipos.ts';

export const es = {
  meta: {
    lang: 'es-CL',
    titulo: 'Cadena · compatibilidad hi-fi',
    descripcion: 'Analiza si un sistema hi-fi es compatible entre sí y qué entrega en tu sala.',
  },

  comun: {
    idiomaAria: 'Cambiar idioma',
  },

  splash: {
    entrarAria: 'Entrar al análisis de compatibilidad',
    subtitulo: 'análisis de compatibilidad hi-fi',
    cta: 'Analizar un sistema',
    pie: 'basado en física · specs medidos · sin opiniones de gusto',
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
    dimensionesTitulo: 'Dimensiones de la sala',
    ancho: 'Ancho (frente)',
    largo: 'Largo (fondo)',
    alto: 'Alto',
    nivelEscucha: 'Nivel de escucha',
    nivelModerado: 'Moderado',
    nivelAlto: 'Alto',
    nivelReferencia: 'Referencia',
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
    plano: {
      titulo: 'Plano, escucha y reflexiones',
      texto:
        'Disposición simétrica calculada desde las medidas de la sala. El punto dulce es el vértice del triángulo con los parlantes; los puntos marcados en los muros laterales son las primeras reflexiones que conviene tratar.',
      leyendaTriangulo: 'triángulo de escucha',
      leyendaReflexion: '1ª reflexión',
      leyendaParlante: 'parlante / escucha',
      muroFrontal: 'MURO FRONTAL',
      puntoDulce: 'punto dulce',
      primeraReflexionCorta: '1ª refl.',
      fuente:
        'Predicción desde geometría de sala rígida y rectangular. Se afina escuchando y midiendo en el espacio real; no reemplaza esa verificación.',
    },
    footer: {
      html:
        '<b>Análisis basado en física publicada.</b> Cada dato lleva su fuente y su nivel de confianza. ' +
        'El cálculo de potencia asume suma de par (+6&nbsp;dB) y ganancia de sala (+3&nbsp;dB), que se ' +
        'verifican midiendo. No se emiten juicios de timbre, escena ni sinergia sonora: eso no se calcula.<br>' +
        'Si agregás una fuente digital (streamer o DAC), el puente de impedancias usa la convención de 10:1 ' +
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
        'con-margen': 'Sobra potencia para tocar fuerte sin esfuerzo.',
        justo: 'Llega justo — sin margen para los pasajes más dinámicos.',
        insuficiente: 'No alcanza la potencia para el volumen que pediste.',
      } satisfies Record<CodigoPotencia, string>,
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
        insuficiente: 'El volumen no va a alcanzar el nivel que necesitás.',
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
        'Probá reposicionar los parlantes o el punto de escucha, o tratar acústicamente esas frecuencias — se verifica escuchando y midiendo en el espacio real.',
      curvaOrden: (p: { orden: string; frecuencia: string }): string => `orden ${p.orden} (${p.frecuencia} Hz)`,
      curvasCaption:
        'Presión relativa a lo largo de cada eje afectado — sólo los agrupamientos de menor frecuencia (los más audibles y difíciles de tratar). Curvas 1D independientes por eje, no un mapa combinado de la sala.',
    },

    puntaje: {
      titulo: 'Puntaje del match',
      rotulo: 'Criterio editorial, no física',
      componente: {
        potencia: 'Potencia',
        carga: 'Carga',
        puente: 'Puente de impedancias',
        recorrido: 'Recorrido de volumen',
        modos: 'Modos de sala',
      } satisfies Record<ComponentePuntaje['nombre'], string>,
      filaIncluida: (p: { nombre: string; puntos: string }): string => `${p.nombre}: ${p.puntos}/10`,
      filaExcluida: (p: { nombre: string }): string => `${p.nombre}: sin dato suficiente, no cuenta`,
      aviso: (p: { evaluados: string; total: string }): string =>
        `Calculado sobre ${p.evaluados} de ${p.total} componentes — el resto no tenía dato suficiente y no se incluyó (ni suma ni resta).`,
      criterio:
        '<b>Criterio editorial, no un dato medido:</b> combina las severidades de arriba con pesos que este sitio declara — potencia 30 % · carga 25 % · puente de impedancias 17 % · recorrido de volumen 13 % · modos de sala 15 %. Otro criterio razonable pesaría distinto.',
    },

    resumen: {
      titulo: 'En resumen',
      fortalezasTitulo: 'Lo que funciona bien',
      debilidadesTitulo: 'Lo que conviene revisar',
      recomendacionTitulo: 'Recomendación',
      itemFortaleza: (p: { nombre: string; verdicto: string }): string => `${p.nombre}: ${p.verdicto}`,
      itemDebilidad: (p: { nombre: string; verdicto: string }): string => `${p.nombre}: ${p.verdicto}`,
      sinFortalezas: 'Ningún componente evaluado quedó en verde.',
      sinDebilidades: 'Ningún componente evaluado quedó en amarillo o rojo.',
      recomendacionConAviso: (p: { nombre: string; aviso: string }): string => `Por <b>${p.nombre}</b>: ${p.aviso}`,
      recomendacionTodoOk:
        'No hay ningún punto pendiente entre lo evaluado — el sistema calza bien con los datos disponibles. Igual conviene escuchar y medir en el espacio real.',
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
