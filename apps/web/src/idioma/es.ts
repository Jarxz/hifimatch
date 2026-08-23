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
import type { CodigoAmortiguamiento } from '../../../../packages/engine/src/amortiguamiento.ts';
import type { CodigoPuenteImpedancias, CodigoRecorridoVolumen } from '../../../../packages/engine/src/ganancia.ts';
import type { CodigoModos, EjeSala } from '../../../../packages/engine/src/modos.ts';
import type { CodigoReverberacion } from '../../../../packages/engine/src/reverberacion.ts';
import type { Confianza } from '../../../../packages/engine/src/tipos.ts';
import type { CodigoContacto } from '../../../../packages/contact/src/contacto.ts';

/** Códigos que puede devolver `/api/contact.ts` — superset de
 * `CodigoContacto` (que sólo cubre lo que valida `validarContacto`, del
 * lado del formulario) con los 2 códigos que sólo puede producir el
 * propio borde HTTP (método no-POST, o un fallo real de `manejarContacto`
 * al llamar a Resend). */
type CodigoRespuestaContacto = CodigoContacto | 'metodo-invalido' | 'error-servidor';

/** Componentes con nombre de pantalla propio en `motor.componentes.nombre`
 * (los que no tienen un `nombreCorto` directo en su propia tarjeta, ver
 * `motor.amortiguamiento.nombreCorto`/`motor.reverberacion.nombreCorto`) —
 * usados por "Qué conviene hacer" y el resumen del informe (main.ts,
 * `construirSnapshot`). No es un tipo del motor: es puramente de qué
 * componentes necesitan una etiqueta acá. */
type NombreComponenteEvaluacion =
  | 'potencia'
  | 'carga'
  | 'modos'
  | 'reverberacion'
  | 'puenteStreamer'
  | 'recorridoStreamer'
  | 'puenteDac'
  | 'recorridoDac';

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

  contacto: {
    boton: 'Contacto',
    titulo: 'Contacto',
    intro: 'Agradecemos tus sugerencias y solicitudes de nuevos componentes.',
    campoNombre: 'Nombre (opcional)',
    campoEmail: 'Tu email',
    campoMensaje: 'Mensaje',
    enviar: 'Enviar',
    enviando: 'Enviando…',
    exito: 'Mensaje enviado. Gracias — lo vamos a leer.',
    error: {
      'honeypot': 'No se pudo enviar el mensaje. Vuelve a intentarlo.',
      'muy-rapido': 'Vuelve a intentarlo en un momento.',
      'email-invalido': 'Revisa el formato del email.',
      'mensaje-vacio': 'El mensaje no puede quedar vacío.',
      'mensaje-largo': 'El mensaje es demasiado largo — intenta acortarlo.',
      'metodo-invalido': 'No se pudo enviar el mensaje. Vuelve a intentarlo.',
      'error-servidor': 'No se pudo enviar el mensaje. Vuelve a intentarlo en un momento.',
    } satisfies Record<CodigoRespuestaContacto, string>,
    fallbackMailtoHtml: (p: { mailto: string }): string =>
      `Esta página está abierta como archivo local, así que no se puede enviar directo desde aquí. <a href="${p.mailto}">Abre tu cliente de correo</a> con el mensaje ya cargado.`,
  },

  splash: {
    entrarAria: 'Entrar al análisis de compatibilidad',
    subtitulo: 'análisis de compatibilidad hi-fi · basado en física',
    remate: 'tú escuchas y decides',
    cta: 'Analizar un sistema',
    proofReglas: 'reglas físicas, cada una con fórmula y umbral declarado',
    proofEquipos: 'equipos curados, con fuente y confianza por dato',
    proofAnalisis: 'análisis con datos comprobados',
    // Marca de versión, no texto de producto traducible — mismo valor en
    // es/en a propósito. V{n}.{mes}.{año}: n cuenta las actualizaciones
    // desplegadas dentro del mismo mes (vuelve a 1 al cambiar de mes),
    // mes/año son los del deploy. Se actualiza a mano en cada push.
    version: 'V18.08.26',
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
        'Todo lo que este sitio afirma pertenece a una de dos categorías, y siempre se declara cuál. <b>Capa física:</b> tiene fórmula, umbral, fuente del dato y nivel de confianza — es refutable, alguien puede discutir un umbral con argumentos. Es casi todo lo que ves (potencia, carga, puente de impedancias, modos de sala, reverberación). <b>Capa criterio editorial:</b> preferencias que este sitio declara desde su propio criterio, no una medición — hoy es el veredicto general (ver más abajo), que agrupa las severidades de arriba en tres estados con un criterio que este sitio declara (el peor eslabón de cada grupo, no un promedio). Otro sitio razonable agruparía distinto, y eso no lo haría "menos correcto": es una opinión declarada, no un dato. Las dos capas nunca se mezclan visualmente — cada tarjeta dice de cuál se trata.',
    },
    confianza: {
      titulo: 'Fuente y confianza de cada dato',
      cuerpoHtml:
        'Los fabricantes publican mal algunos datos — la impedancia de salida de streamers/DACs casi nunca está en la ficha, la sensibilidad de parlantes a veces se mide en condiciones optimistas. Por eso cada dato del catálogo lleva de dónde salió y una confianza (<b>alta/media/baja</b>): alta cuando viene de la ficha oficial o de una medición independiente que la confirma; media o baja cuando hay que inferirlo o sólo hay una fuente. <b>Un dato faltante nunca se muestra como si el equipo estuviera "bien"</b> — si falta el dato que una regla necesita, esa tarjeta se oculta del análisis principal y aparece declarada en "Sin datos suficientes", al final. Nunca se rellena un hueco con un "estándar de mercado" inventado: la dispersión real de specs entre equipos (por ejemplo, impedancia de salida de fuentes entre 10 Ω y 500 Ω) hace que cualquier valor único sea, en la práctica, un dato inventado.',
    },
    generico: {
      titulo: 'Perfiles genéricos (arquetipos): cuando el equipo real no está en el catálogo',
      cuerpoHtml:
        'Modificación agregada como <b>extra al criterio original</b> de arriba, no un reemplazo: cuando el equipo real de un usuario no está en el catálogo, elegir uno de estos 6 perfiles bajo la marca <b>Genérico (Arquetipo)</b> (3 parlantes, 3 amplificadores) permite seguir corriendo el análisis por aproximación física en vez de quedar sin evaluar. Justificación del cálculo: cada perfil declara directamente los datos que EPDR (carga) y la interacción de amortiguamiento necesitan — impedancia mínima, impedancia de pico y ángulo de fase en parlantes; factor de amortiguamiento en amplificadores — así que esas dos tarjetas calculan con la misma fórmula y el mismo umbral que usarían con un equipo real, nunca una fórmula distinta. Sensibilidad y potencia (campos que el motor exige siempre) se completan con un valor de referencia razonable para cada arquetipo, no medido: por eso todo dato sintético lleva <b>confianza baja</b> declarada, y nunca se muestra como si fuera una ficha de fabricante. No es lo mismo que "rellenar un hueco con un estándar de mercado" (la práctica que la tarjeta de arriba dice que este sitio evita): un perfil genérico es una categoría propia que el usuario elige a propósito por su nombre — nunca se sustituye en silencio dentro de los datos de un producto real.',
    },
    potencia: {
      titulo: 'Potencia frente a los picos de la sala',
      cuerpoHtml:
        'La pregunta que responde esta tarjeta: ¿el amplificador entrega el nivel de pico (SPL) que la sala pide, a la distancia real de escucha? Se calcula desde la sensibilidad del parlante, la potencia del amplificador y la distancia, sumando un refuerzo típico por par de parlantes (+6 dB) y por sala pequeña (+3 dB) — dos supuestos declarados, no datos del equipo, que se verifican midiendo. El resultado es un <b>margen en dB</b> sobre el pico objetivo del nivel de escucha elegido (moderado/alto/referencia). La frase simple de la tarjeta reexpresa ese margen como <b>% de la capacidad del amplificador</b> que exige ese pico — más intuitivo que un número en dB: si el margen es de +6 dB, el amplificador está usando apenas una fracción de lo que tiene; si el margen es negativo, exigiría más del 100% de su capacidad, es decir, recortaría la señal (clipping) en los picos.',
    },
    carga: {
      titulo: 'La carga que ve el amplificador',
      cuerpoHtml:
        'La impedancia de un parlante no es un número fijo — baja en ciertas frecuencias, y esa caída (impedancia mínima) es la que realmente exige corriente al amplificador, no la impedancia nominal de la ficha. Esta tarjeta compara esa impedancia mínima contra lo que el amplificador puede sostener: si la carga es exigente (impedancia mínima baja), el resultado depende de si el amplificador tiene <b>reserva de corriente</b> (duplica su potencia al bajar a la mitad la impedancia, señal de una fuente de alimentación robusta) o simplemente <b>potencia bruta</b> de sobra. Además, cuando el catálogo tiene (o se puede asumir de forma conservadora) el <b>ángulo de fase</b> más exigente en graves, se calcula la EPDR (resistencia equivalente de disipación de pico): un parlante reactivo exige más corriente de la que su impedancia mínima sola sugiere, y la EPDR puede marcar un problema que la sola magnitud no muestra. Cuando el fabricante no publica la impedancia mínima del parlante, la tarjeta no se muestra en el análisis principal — aparece declarada en "Sin datos suficientes".',
    },
    amortiguamiento: {
      titulo: '¿La impedancia de salida del amplificador colorea el sonido?',
      cuerpoHtml:
        'La impedancia de salida del amplificador (derivada del factor de amortiguamiento publicado, Z_out = 8/DF) forma un <b>divisor de tensión</b> con la curva de impedancia del parlante: en el pico de resonancia de graves, donde la impedancia es más alta, ese divisor deja pasar relativamente más tensión que en el mínimo — una coloración tonal real y calculable, no una intuición. Esta tarjeta no penaliza un factor de amortiguamiento bajo en sí mismo (eso descartaría sin motivo electrónica valvular, que puede sonar perfectamente bien con el parlante correcto): lo que importa es la interacción con la curva de ESE parlante, expresada en decibeles de desviación entre el pico y el mínimo de impedancia. Necesita el factor de amortiguamiento del amplificador y la impedancia mínima del parlante — si el fabricante no publica el pico de impedancia (resonancia de graves), se asume un valor típico de referencia (25 Ω), declarado como tal en la tarjeta.',
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
    veredicto: {
      titulo: 'El veredicto y los tres estados',
      cuerpoHtml:
        'El titular del resultado (Potencia / Acople eléctrico / Sala) resume las tarjetas físicas de abajo sin promediarlas: cada uno de los tres estados toma la <b>peor</b> severidad entre los componentes que agrupa — Potencia es directa; Acople eléctrico es el peor entre carga, y puente de impedancias + recorrido de volumen de streamer y/o DAC; Sala es el peor entre modos y reverberación. Promediar disolvería un problema real entre varias cosas que están bien (un amplificador que se queda corto en los picos podría promediar "aceptable" junto a una carga fácil); el peor eslabón es más honesto. Un componente sin dato suficiente no cuenta como reparo — si un estado entero queda sin ningún componente evaluable, se declara "sin datos suficientes" en gris, nunca en amarillo o rojo. El titular general es el peor de los tres estados; sigue siendo <b>capa criterio-editorial</b> (cómo se agrupa y se prioriza es una decisión de este sitio), apoyada en severidades que sí son física.',
    },
  },

  config: {
    hs: 'Configurar',
    volver: '← Volver',
    lead: 'Define la cadena',
    leadNote:
      'Elige un amplificador y un par de parlantes, e indica las medidas de la sala. El análisis calcula la potencia que el sistema pide en ese espacio y propone una disposición.',
    parlantes: 'Parlantes',
    amplificador: 'Amplificador',
    streamer: 'Streamer',
    dac: 'DAC',
    requerido: 'requerido',
    opcionalFuente: 'opcional',
    marcaPlaceholder: '— Marca —',
    modeloPlaceholder: '— Modelo —',
    modeloSinMarca: '— Elige una marca primero —',
    fuentePlaceholder: '— Ninguno (opcional) —',
    masParlantes: 'Más parlantes · próximamente',
    masAmplificadores: 'Más amplificadores · próximamente',
    masStreamers: 'Más streamers · próximamente',
    masDacs: 'Más DACs · próximamente',
    verFicha: 'Ficha del producto · próximamente',
    verDescripcion: 'Ver descripción',
    notaGenerico:
      'Perfil genérico (arquetipo): una aproximación física de referencia, no un producto real ni una medición. Conviene elegirlo sólo cuando el equipo real no aparece en el catálogo.',
    personalizarSala: 'Personalizar sala',
    resumenSala: (p: { ancho: string; largo: string; alto: string; muro: string; piso: string }): string =>
      `${p.ancho} × ${p.largo} × ${p.alto} m · ${p.muro} + ${p.piso}`,
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
    guardarPopupCuerpo: 'Pronto disponible. Esta función permitirá guardar tus análisis, compararlos entre sí y descargarlos como archivos PDF.',
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
    capaCriterioEditorial: 'Criterio editorial, no física',
    geometria: 'Geometría',
    disposicionReferencia: 'Disposición de referencia',
    verDetalle: 'Ver detalle técnico',
    recomendacionesTitulo: 'Qué conviene hacer',
    evidenciaTitulo: 'Ver evidencia técnica completa',
    fichaTitulo: 'La cadena y los datos de sala',
    fichaSubtitulo: 'Supuestos, fuentes y nivel de confianza · guardar e informe',
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
      pestanaOriginal: 'Análisis original',
      pestanaModificado: 'Modificado',
      hintArrastreHtml: 'En esta vista se puede mover los parlantes para probar otra disposición, <button type="button" id="btn-recalcular">RECALCULAR</button> y comparar con Análisis original.',
      ubicacionTitulo: 'Ubicación de referencia de los parlantes',
      ubicacion: (p: { frontalIzq: string; lateralIzq: string; frontalDer: string; lateralDer: string; separacion: string }): string =>
        `Parlante izquierdo: <b>${p.frontalIzq} m</b> de la pared frontal, <b>${p.lateralIzq} m</b> de su pared lateral. Parlante derecho: <b>${p.frontalDer} m</b> de la pared frontal, <b>${p.lateralDer} m</b> de su pared lateral. Separación entre ambos: <b>${p.separacion} m</b>. Es la disposición de referencia que usa el resto del análisis (potencia, modos, reflexiones) — se afina moviendo los parlantes y escuchando en el espacio real.`,
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

  documento: {
    hs: 'Informe (vista previa)',
    pestana1: 'Análisis 1',
    pestana2: 'Análisis 2',
    comparar: 'Comparar',
    descargarPdf: 'Descargar PDF',
    titulo: 'Informe de análisis',
    equipoTitulo: 'Equipo',
    planoTitulo: 'Plano, escucha y reflexiones (vista superior)',
    veredictoTitulo: 'Veredicto general',
    disclaimerHtml:
      'Vista previa interna de un informe exportable — reformatea los datos ya calculados de <b>Análisis 1</b>, ' +
      'sin generar un PDF real todavía. <b>Análisis 2</b>, <b>Comparar</b> y <b>Descargar PDF</b> quedan detrás ' +
      'del inicio de sesión, igual que «Guardar».',
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
      // Cuando el rango de sensibilidad (convención de medición desconocida,
      // impedancia <8 Ω) cruza un umbral de severidad, el % de capacidad
      // del pesimista solo no cuenta la historia completa — el veredicto
      // mismo es incierto por un dato de catálogo faltante. Reemplaza a
      // `simple` en ese caso puntual, no lo complementa.
      simpleRangoCruzaUmbral: (p: { codigoPesimista: string; codigoOptimista: string }): string =>
        `Según cómo esté medida la sensibilidad de este parlante, el resultado va de "${p.codigoPesimista}" a "${p.codigoOptimista}" — falta ese dato de catálogo para decidir cuál aplica.`,
      conMargen: (p: { amp: string; nivel: string; margenDb: string; distM: string }): string =>
        `El ${p.amp} entrega los picos a nivel <b>${p.nivel}</b> con <b>${p.margenDb} dB</b> de margen a ${p.distM} m. Alcanza con holgura.`,
      justoTexto: (p: { nivel: string; margenDb: string }): string =>
        `Llega a los picos a nivel <b>${p.nivel}</b>, pero con sólo <b>${p.margenDb} dB</b> de margen. En los transientes más fuertes queda al límite.`,
      insuficienteTexto: (p: { margenAbsDb: string; nivel: string; distM: string }): string =>
        `Faltan <b>${p.margenAbsDb} dB</b> para los picos a nivel <b>${p.nivel}</b> a ${p.distM} m. A ese volumen el amplificador recorta.`,
      calc: (p: { sens: string; distM: string; potenciaUsada: string; ohmUsados: string; splDb: string; nivel: string; picoDb: string; margenSigno: string }): string =>
        `SPL disponible = ${p.sens} − 20·log₁₀(${p.distM}) + 10·log₁₀(${p.potenciaUsada}) <span style="color:var(--faint)">(${p.ohmUsados} Ω)</span> + 3 <span style="color:var(--faint)">par</span> = <b>${p.splDb} dB</b><br>` +
        `objetivo en pico (${p.nivel}) = <b>${p.picoDb} dB</b><br>` +
        `margen = ${p.splDb} − ${p.picoDb} = <b>${p.margenSigno} dB</b>`,
      sensibilidadNormalizada: (p: { citada: string; efectiva: string }): string =>
        `Sensibilidad citada a 2,83V/1m (${p.citada} dB) normalizada a 1W/1m → <b>${p.efectiva} dB</b> — a esta impedancia no son la misma cifra (ver "confianza y convención" en la guía).`,
      // Sólo bajo 8 Ω la convención faltante mueve el número (2,83V y 1W
      // casi coinciden a 8 Ω): abajo de esa impedancia se muestra el rango
      // completo con magnitud y dirección; a 8 Ω o más, una nota liviana
      // que no degrada confianza — declarar la ambigüedad sin castigar un
      // dato que en la práctica no la tiene.
      sensibilidadRangoHtml: (p: { pesimista: string; optimista: string; margenOptimista: string }): string =>
        `La fuente citada no declara si la sensibilidad se midió a 2,83V o a 1W/1m — a esta impedancia sí cambia el resultado. Si es a 2,83V, la sensibilidad real es <b>${p.pesimista} dB</b> (el valor usado arriba, el caso conservador); si ya está a 1W/1m, es <b>${p.optimista} dB</b> y el margen sería <b>${p.margenOptimista} dB</b> en vez del de arriba.`,
      // Caso puntual dentro del rango de arriba: cuando los dos extremos
      // caen en códigos distintos, no es sólo "el margen cambia un poco" —
      // el veredicto mismo depende del dato que falta. Reemplaza a
      // sensibilidadRangoHtml en ese caso, no lo complementa.
      sensibilidadRangoCruzaUmbralHtml: (p: { pesimista: string; optimista: string; codigoPesimista: string; codigoOptimista: string }): string =>
        `La fuente citada no declara la convención de medición, y a esta impedancia eso cambia el veredicto, no sólo el margen: a 2,83V la sensibilidad real es <b>${p.pesimista} dB</b> ("${p.codigoPesimista}", el caso mostrado arriba); a 1W/1m ya sería <b>${p.optimista} dB</b> ("${p.codigoOptimista}"). Falta ese dato de catálogo para decidir cuál de los dos aplica.`,
      sensibilidadSinConvencionIrrelevanteHtml:
        'La fuente citada no declara si la sensibilidad se midió a 2,83V o a 1W/1m, pero a esta impedancia (8 Ω o más) las dos convenciones casi coinciden — no cambia el resultado.',
      potenciaCargaEstimadaHtml:
        'El amplificador no publica potencia a 4 Ω para este parlante — se usa la potencia a 8 Ω como aproximación de lo que realmente entrega a esta carga.',
      gananciaSalaInfo: (p: { gananciaDb: string; frecuenciaHz: string }): string =>
        `Bajo ≈${p.frecuenciaHz} Hz (el modo axial de la dimensión mayor de la sala) hay un refuerzo típico de sala pequeña de ~${p.gananciaDb} dB — no está incluido en el cálculo de arriba, que es de banda ancha.`,
      avisoRecMin: (p: { recomendadaW: string; entregadaW: string }): string =>
        `El fabricante recomienda desde ${p.recomendadaW} W para este parlante; el amplificador entrega ${p.entregadaW} W.`,
      fuente: (p: { sensFuente: string; sensNota: string; sensConf: string; potFuente: string; potConf: string; ohmUsados: string }): string =>
        `<b>Fuente sensibilidad:</b> ${p.sensFuente}${p.sensNota} <span class="conf">confianza ${p.sensConf}</span><br>` +
        `<b>Fuente potencia:</b> ${p.potFuente} (RMS, ${p.ohmUsados} Ω) <span class="conf">confianza ${p.potConf}</span>`,
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
        'epdr-critico': 'EPDR crítico',
        'epdr-ajustado': 'EPDR ajustado',
      } satisfies Record<CodigoCarga, string>,
      simple: {
        'sin-dato': 'No hay dato suficiente para evaluar esta carga.',
        'exige-corriente': 'Esta combinación pide más corriente de la que este amplificador reserva.',
        cubierto: 'El amplificador maneja bien esta carga.',
        'carga-benigna': 'Una carga fácil, sin riesgo para el amplificador.',
        'epdr-critico': 'El ángulo de fase de este parlante exige mucha más corriente de la que sugiere su impedancia mínima sola.',
        'epdr-ajustado': 'El ángulo de fase de este parlante exige algo más de corriente de la que sugiere su impedancia mínima sola.',
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
      epdrTexto: (p: { epdr: string; theta: string }): string =>
        `Con un ángulo de fase de <b>${p.theta}°</b> en el punto más exigente, la resistencia equivalente de disipación de pico (EPDR) es <b>${p.epdr} Ω</b> — más baja que la impedancia mínima sola, porque un parlante reactivo exige más corriente de la que su magnitud sugiere.`,
      epdrCalc: (p: { minZ: string; theta: string; epdr: string }): string =>
        `EPDR = ${p.minZ} / (1 + |sen(${p.theta}°)|) = <b>${p.epdr} Ω</b>`,
      epdrSupuesto:
        'Ángulo de fase no publicado: se asume <b>-45°</b>, un supuesto conservador para impedancia nominal ≤4 Ω — criterio de este sitio, no una medición de este parlante.',
      epdrFuente:
        'Ángulo de fase citado por el fabricante o una medición independiente.',
    },

    amortiguamiento: {
      titulo: '¿La impedancia de salida del amplificador colorea el sonido?',
      nombreCorto: 'Amortiguamiento',
      verdicto: {
        'sin-dato': 'Sin dato',
        optimo: 'Óptimo',
        'con-reparos': 'Con reparos',
        critico: 'Crítico',
      } satisfies Record<CodigoAmortiguamiento, string>,
      simple: {
        'sin-dato': 'No hay dato suficiente para evaluar esta interacción.',
        optimo: 'La impedancia de salida del amplificador no altera la respuesta del parlante.',
        'con-reparos': 'La impedancia de salida del amplificador colorea un poco la respuesta del parlante en graves.',
        critico: 'La impedancia de salida del amplificador altera claramente la respuesta del parlante en graves.',
      } satisfies Record<CodigoAmortiguamiento, string>,
      sinDatosTexto:
        'Falta el factor de amortiguamiento del amplificador o la impedancia mínima del parlante. Sin ambos datos no se puede estimar esta interacción.',
      sinDatosAviso: 'Un dato faltante no se cuenta como aprobado. <b>Pendiente:</b> factor de amortiguamiento publicado.',
      /**
       * 4 franjas de TEXTO (no de severidad — ver TEXTO_TIER_*_MAX_DB en
       * amortiguamiento.ts) con 4 campos cada una: `titulo` (frase corta),
       * `explicacionFisica` (qué produce el desvío y por qué), `consecuenciaMedible`
       * (dónde/cuánto se desvía, en dB/Hz — nunca cómo "suena"), y
       * `accionSugerida` (qué hacer, si aplica). Deliberadamente sin
       * juicios de carácter tonal (cálido/musical/con cuerpo) ni
       * predicciones de sinergia por género — CLAUDE.md los prohíbe sin
       * excepción; y sin atribuir mecanismos que este cálculo no mide
       * (distorsión, excursión, comportamiento térmico): sólo describe la
       * desviación de nivel que la fórmula realmente calcula.
       */
      tiers: {
        optimo: {
          titulo: 'Sin alteración medible de la respuesta.',
          explicacionFisica: (p): string =>
            `La baja impedancia de salida del amplificador (Z_out ≈ ${p.zOut} Ω) mantiene la respuesta de frecuencia del parlante dentro de la variación medida, sin un realce identificable.`,
          consecuenciaMedible: (p): string =>
            `La curva de impedancia de este parlante (mínimo ${p.zMin} Ω, pico ${p.zMax} Ω) no produce una desviación de nivel detectable en ninguna banda.`,
          accionSugerida: (_p): string => 'Ninguna acción necesaria — combinación adecuada para escucha de referencia.',
        },
        moderado: {
          titulo: 'Realce de nivel moderado en la zona de resonancia.',
          explicacionFisica: (p): string =>
            `La interacción eléctrica produce un realce de +${p.deltaDb} dB concentrado cerca del pico de impedancia del parlante (${p.zMax} Ω), por la resistencia interna del amplificador (Z_out ≈ ${p.zOut} Ω).`,
          consecuenciaMedible: (_p): string =>
            'Es una desviación de nivel acotada a la banda de resonancia de graves, no un cambio en el resto de la respuesta.',
          accionSugerida: (_p): string =>
            'Un amplificador con mayor factor de amortiguamiento reduce este realce si se busca una respuesta más plana — se verifica escuchando y, si es posible, midiendo.',
        },
        severo: {
          titulo: 'Desviación de nivel amplia en la respuesta de frecuencia.',
          explicacionFisica: (p): string =>
            `La alta impedancia de salida del amplificador (Z_out ≈ ${p.zOut} Ω) interactúa con la variación entre los ${p.zMin} Ω mínimos y los ${p.zMax} Ω máximos del parlante, produciendo una desviación de +${p.deltaDb} dB respecto a la curva publicada.`,
          consecuenciaMedible: (_p): string =>
            'La desviación ya no se limita a un realce puntual: se extiende sobre un rango de frecuencias más amplio alrededor de la resonancia.',
          accionSugerida: (_p): string =>
            'Conviene un amplificador con mayor factor de amortiguamiento, o un parlante con una curva de impedancia más plana en graves.',
        },
        critico: {
          titulo: 'Desviación de nivel fuera del rango que este modelo considera manejable.',
          explicacionFisica: (p): string =>
            `La respuesta de frecuencia se desvía +${p.deltaDb} dB de la curva publicada — la interacción entre la impedancia de salida del amplificador y la del parlante domina la forma de la curva medida en esta zona.`,
          consecuenciaMedible: (_p): string =>
            'Es una desviación de nivel grande y localizada — este cálculo mide nivel, no distorsión, excursión ni comportamiento térmico.',
          accionSugerida: (_p): string =>
            'Combinación no recomendada tal como está — conviene otro amplificador (mayor factor de amortiguamiento) o otro parlante para esta electrónica.',
        },
      } satisfies Record<
        'optimo' | 'moderado' | 'severo' | 'critico',
        {
          titulo: string;
          explicacionFisica: (p: { zOut: string; zMin: string; zMax: string; deltaDb: string }) => string;
          consecuenciaMedible: (p: { zOut: string; zMin: string; zMax: string; deltaDb: string }) => string;
          accionSugerida: (p: { zOut: string; zMin: string; zMax: string; deltaDb: string }) => string;
        }
      >,
      calc: (p: { zOut: string; zMin: string; zMax: string; deltaDb: string }): string =>
        `Z_out = 8 / DF = <b>${p.zOut} Ω</b><br>ΔdB = 20·log₁₀( (${p.zMax}·(${p.zMin}+${p.zOut})) / (${p.zMin}·(${p.zMax}+${p.zOut})) ) = <b>${p.deltaDb} dB</b>`,
      zMaxSupuesto:
        'Impedancia de pico de graves no publicada: se asume <b>25 Ω</b>, un valor típico de referencia — criterio de este sitio, no una medición de este parlante.',
      fuente:
        '<b>Fórmula:</b> Z_out = 8/DF (el factor de amortiguamiento se publica referido a 8 Ω); ΔdB = 20·log₁₀(Zmax·(Zmin+Zout) / (Zmin·(Zmax+Zout))) — la diferencia de atenuación del divisor de tensión entre el pico y el mínimo de impedancia del parlante. No penaliza un factor de amortiguamiento bajo en sí (evita descartar electrónica valvular sin motivo): sólo cuenta la interacción real con la curva de impedancia de este parlante.',
    },

    puente: {
      tituloStreamer: '¿Conectan bien el streamer y el amplificador?',
      tituloDac: '¿Conectan bien el DAC y el amplificador?',
      subtitulo: 'Puente de impedancias',
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
      tituloStreamer: '¿Vas a usar bien el dial de volumen con el streamer?',
      tituloDac: '¿Vas a usar bien el dial de volumen con el DAC?',
      subtitulo: 'Recorrido del volumen',
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
      verdictoNulo: 'Nulo en el punto de escucha',
      verdictoAmbos: 'Modos agrupados y nulo en la escucha',
      simple: {
        'modos-distribuidos': 'Los graves de la sala están razonablemente parejos.',
        'modos-agrupados': 'Hay frecuencias graves que probablemente sonarán reforzadas.',
      } satisfies Record<CodigoModos, string>,
      simpleNulo: 'Tu posición de escucha cae en el hueco de graves de un modo en particular.',
      simpleAmbos: 'Hay graves reforzados en una frecuencia y, además, un hueco en otra — conviene revisar la posición de escucha.',
      eje: { ancho: 'ancho', largo: 'largo', alto: 'alto' } satisfies Record<EjeSala, string>,
      textoOk: (p: { techo: string }): string =>
        `Las resonancias de graves de la sala están razonablemente distribuidas por debajo de ${p.techo} Hz — no se detectan coincidencias que refuercen una frecuencia en particular.`,
      textoWarn: (p: { n: string; techo: string }): string =>
        `${p.n} par(es) de modos caen dentro del umbral de agrupamiento por debajo de ${p.techo} Hz — señal de refuerzo de graves en esas frecuencias.`,
      parAgrupado: (p: { a: string; b: string; frecuenciaA: string; frecuenciaB: string }): string =>
        `${p.a} (${p.frecuenciaA} Hz) y ${p.b} (${p.frecuenciaB} Hz)`,
      fuente: (p: { techo: string; umbral: string }): string =>
        `<b>Criterio:</b> modelo de sala rígida y rectangular, sólo modos axiales. Agrupamiento = dos modos de ejes distintos a menos de ${p.umbral}% de diferencia entre sí, por debajo de ${p.techo} Hz — criterio del sitio, no una convención publicada; se verifica midiendo/escuchando.`,
      fuenteNulo: (p: { ventana: string }): string =>
        `El nulo de escucha compara el punto de escucha calculado contra el centro exacto de la sala en profundidad (L/2, el nodo de presión del modo axial de largo de orden 1), con una ventana de ±${p.ventana}% de L — criterio del sitio, no una convención publicada.`,
      nuloEscucha: (p: { frecuencia: string }): string =>
        `<b>Punto de escucha cerca del nulo modal:</b> el punto dulce cae cerca del centro exacto de la sala en profundidad — la zona donde el primer modo axial de largo (${p.frecuencia} Hz) tiene su nulo de presión. Ese modo en particular puede sonar muy débil justo ahí; se verifica escuchando, y suele bastar con mover el punto de escucha o los parlantes unos centímetros.`,
      sugerenciaNulo:
        'Conviene mover el punto de escucha (o los parlantes) unos centímetros hacia adelante o atrás para salir del nulo — se verifica escuchando, el hueco de graves de ese modo debería notarse mucho menos apenas unos centímetros afuera del centro exacto.',
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
      texto: (p: { rt60: string; min: string; max: string; fs: string }): string =>
        `RT60 estimado: <b>≈${p.rt60} s</b> (promedio de las bandas 500 Hz y 2000 Hz). El rango cómodo declarado para escucha crítica en una sala doméstica es ${p.min}–${p.max} s (una sala de concierto apunta mucho más alto, ~1,5–2,5 s, porque es otro tipo de espacio). Por encima de ≈${p.fs} Hz (la frecuencia de Schroeder de esta sala) el campo sonoro es lo bastante denso para que un tiempo de reverberación único tenga sentido; por debajo, el comportamiento está dominado por resonancias individuales — ver "Modos de sala" arriba, no por reverberación difusa. La ecuación (Sabine o Eyring según cuánto absorbe cada banda) pierde precisión igual en salas chicas — conviene leerlo como orden de magnitud, no como una cifra exacta.`,
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
        bandas: Array<{ hz: string; alphaBar: string; rt60: string; metodo: string }>;
        schroeder: string;
      }): string =>
        p.filas.map((f) => `${f.nombre}: ${f.superficie} m² × ${f.alpha} = ${f.absorcion} sabines`).join('<br>') +
        `<br>Absorción total (banda 500 Hz): <b>${p.absorcionTotal} sabines</b> — volumen: ${p.volumen} m³<br><br>` +
        `<b>Las 3 bandas:</b><br>` +
        p.bandas.map((b) => `${b.hz} Hz: ᾱ=${b.alphaBar} → RT60 = ${b.rt60} s (${b.metodo})`).join('<br>') +
        `<br><br>RT60 final (promedio 500+2000 Hz): <b>${p.rt60} s</b>` +
        `<br>Frecuencia de Schroeder: fs ≈ <b>${p.schroeder} Hz</b>`,
      fuente:
        '<b>Fórmula:</b> ecuación de Sabine (RT60 = 0,161·V/A) para bandas con absorción promedio ᾱ≤0,20; ecuación de Eyring (RT60 = 0,161·V/(−S·ln(1−ᾱ))) por encima de ese umbral, donde Sabine sobreestima el tiempo de reverberación — criterio de literatura de acústica arquitectónica, no inventado por el sitio. Se calcula por separado en 3 bandas (125/500/2000 Hz), sumando superficie por superficie en cada una — no un coeficiente único para toda la sala, ni siquiera un único valor de "muro": cada muro se orienta y se declara aparte. Los coeficientes de absorción por material y banda son criterio del sitio: valores típicos de literatura de acústica arquitectónica, no una medición de tu sala real. "Vacío" usa el coeficiente de referencia histórico de Sabine para una abertura (α=1,0 en las 3 bandas: nada de lo que llega ahí vuelve a la sala). Se verifica midiendo con un decibelímetro o una app de RT60.',
      avisoVacio: (p: { muros: string }): string =>
        `<b>Muro(s) declarado(s) abertura:</b> ${p.muros}. No reflejan sonido — por eso baja la reverberación calculada arriba, y el plano isométrico no dibuja la reflexión de ese muro. Los modos de sala (resonancias) de la tarjeta de arriba <b>no se ajustan</b> para una abertura: siguen asumiendo paredes rígidas en los dos extremos de cada eje, así que la resonancia calculada en el eje de ese muro es menos representativa que en una sala cerrada.`,
    },

    componentes: {
      nombre: {
        potencia: 'Potencia',
        carga: 'Carga',
        modos: 'Modos de sala',
        reverberacion: 'Reverberación',
        puenteStreamer: 'Puente de impedancias (Streamer)',
        recorridoStreamer: 'Recorrido de volumen (Streamer)',
        puenteDac: 'Puente de impedancias (DAC)',
        recorridoDac: 'Recorrido de volumen (DAC)',
      } satisfies Record<NombreComponenteEvaluacion, string>,
    },

    veredicto: {
      nombrePotencia: 'Potencia',
      nombreAcople: 'Acople eléctrico',
      nombreSala: 'Sala',
      tituloAlert: 'Configuración no recomendada',
      tituloWarn: 'Configuración soportada, con límites',
      tituloOk: 'Configuración totalmente compatible',
      subtextoAlert: (p: { grupos: string }): string => `Se detectaron incompatibilidades críticas en ${p.grupos}.`,
      subtextoWarn: (p: { grupos: string }): string => `El sistema funciona, pero conviene atender ${p.grupos}.`,
      subtextoOk: 'Todos los componentes operan dentro de los márgenes esperados.',
      estadoPotencia: {
        ok: 'Suficiente',
        warn: 'Ajustada',
        alert: 'Insuficiente',
      } satisfies Record<'ok' | 'warn' | 'alert', string>,
      estadoAcople: {
        ok: 'Correcto',
        warn: 'Con reparos',
        alert: 'Conflicto',
      } satisfies Record<'ok' | 'warn' | 'alert', string>,
      estadoAcopleSinDatos: 'Sin datos suficientes',
      estadoSala: {
        ok: 'En rango',
        warn: 'Con reparos',
      } satisfies Record<'ok' | 'warn', string>,
      sinDatosDetalle: 'No hay dato suficiente para evaluar este grupo.',
    },

    resumen: {
      titulo: 'En resumen',
      comportamiento: {
        ok: (p: { titulo: string }): string =>
          `El sistema en conjunto funciona bien: la mayoría de los aspectos evaluados están resueltos — ${p.titulo}.`,
        warn: (p: { titulo: string }): string =>
          `El sistema funciona, pero conviene revisar algunos puntos antes de darlo por cerrado — ${p.titulo}.`,
        alert: (p: { titulo: string }): string =>
          `El sistema tiene varios puntos que conviene resolver antes de considerarlo un buen match — ${p.titulo}.`,
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
    // Calificador del chip de sensibilidad cuando sensibilidadConvencion es
    // null — derivado de ese dato estructurado, no texto suelto por equipo.
    sinConvencion: 'sin convención',
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
