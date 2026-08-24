/**
 * Bootstrap de ar.html — lee idioma guardado (misma clave de
 * localStorage que index.html, mismo origen en producción), decodifica
 * el estado de la URL, corre el chequeo de soporte de WebXR (Android) o
 * de AR Quick Look (iPhone), y cablea "Entrar en AR"/el link de Quick
 * Look. Impuro (DOM real) — no testeable con `node --test`; ver la
 * sección de verificación del plan de AR.
 */
import '../estilos.css';
import { idiomaInicial, aplicarCromoEstatico, textosDe } from '../idioma/idioma.ts';
import { num } from '../formato/numeros.ts';
import { decodificarEstadoAr } from './estadoUrl.ts';
import type { EstadoAr } from './estadoUrl.ts';
import { tieneNavigatorXr, soportaArInmersiva, esUserAgentIOS } from './soporte.ts';
import { iniciarSesionAr, murosVistaDesdeEstado } from './sesion.ts';
import type { EstadoCalibracion, InfoMedicion } from './sesion.ts';
import { ANCLAJE_CANONICO } from './anclaje.ts';
import { construirEscenaAr } from './geometriaAr.ts';
import { construirGrupoMallaParaUsdz } from './escenaMalla.ts';
import { calcularDisposicionAsientoManual } from '../../../../packages/engine/src/sala.ts';
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js';

const idioma = idiomaInicial();
aplicarCromoEstatico(idioma);
// aplicarCromoEstatico ya fijó document.title con el meta.titulo del
// SITIO principal (index.html) — se pisa acá con el propio de esta
// página, sin tocar la función compartida.
document.title = textosDe(idioma).ar.titulo;

const TODOS_LOS_PANELES = ['ar-cargando', 'ar-no-soportado', 'ar-estado-invalido', 'ar-pasos', 'ar-error-sesion', 'ar-calibrando', 'ar-anclado', 'ar-quicklook'] as const;

function mostrarSolo(idVisible: (typeof TODOS_LOS_PANELES)[number]): void {
  for (const id of TODOS_LOS_PANELES) {
    document.getElementById(id)?.classList.toggle('hidden', id !== idVisible);
  }
}

/**
 * "← Volver al análisis" — antes era un link a "/" siempre, así que
 * siempre terminaba en la portada, no en el resultado del que salió
 * quien entró a AR (bug reportado). `ar.html` se llega SIEMPRE por
 * `location.href = 'ar.html?...'` desde la pantalla de resultado
 * (`irAVerEnAr()`, main.ts) — nunca en una pestaña nueva — así que hay
 * una entrada real en el historial del navegador a la que volver.
 * `history.back()` la restaura completa (equipo elegido, análisis ya
 * calculado, misma pestaña activa) vía bfcache, sin recalcular nada —
 * `location.href='/'` en cambio siempre reinicia la app desde la
 * portada. Se usa `history.back()` sólo cuando el referrer es del mismo
 * origen (se llegó navegando desde el propio sitio, no por un enlace
 * externo/marcador guardado, donde no habría nada más atrás) — si no,
 * `/` sigue siendo el respaldo seguro de siempre.
 */
function volverAlAnalisis(): void {
  let mismoOrigen = false;
  try {
    mismoOrigen = document.referrer !== '' && new URL(document.referrer).origin === location.origin;
  } catch {
    mismoOrigen = false;
  }
  if (mismoOrigen && history.length > 1) {
    history.back();
  } else {
    location.href = '/';
  }
}

document.querySelectorAll<HTMLButtonElement>('.volver-analisis').forEach((btn) => {
  btn.addEventListener('click', volverAlAnalisis);
});

/**
 * AR Quick Look (iPhone) — mismo criterio de detección que ya usa
 * `<model-viewer>` de Google (referencia externa de patrón, no un
 * paquete instalado acá): UA de iOS **combinado** con el chequeo real
 * de soporte del navegador (`relList.supports('ar')`), no uno solo —
 * evita tanto falsos negativos (UA modificado) como falsos positivos
 * (Safari de escritorio, que no tiene Quick Look pese a compartir motor).
 */
function soportaQuickLook(): boolean {
  const linkSoportaAr = document.createElement('a').relList?.supports?.('ar') ?? false;
  return esUserAgentIOS(navigator.userAgent) && linkSoportaAr;
}

/**
 * Genera el USDZ en el momento, 100% del lado del cliente
 * (`USDZExporter` de three.js, sin ningún servidor de conversión) y lo
 * deja listo en el `href` de `#link-quicklook` — la escena usa
 * `ANCLAJE_CANONICO` (no un anclaje real: Quick Look no expone
 * hit-test a la web, así que coloca/escala con sus propios gestos
 * nativos) y `construirGrupoMallaParaUsdz` (mallas, no las líneas
 * gordas/etiquetas de la versión WebXR — `USDZExporter` sólo exporta
 * objetos `.isMesh`, ver escenaMalla.ts).
 */
async function mostrarQuickLook(estado: EstadoAr): Promise<void> {
  mostrarSolo('ar-quicklook');
  const t = textosDe(idioma).ar;
  const enlace = document.getElementById('link-quicklook') as HTMLAnchorElement | null;
  const estadoTexto = document.getElementById('ql-estado');
  if (!enlace) return;

  try {
    const disp = calcularDisposicionAsientoManual(estado.sala, estado.parlanteIzq, estado.parlanteDer, estado.asiento);
    const muros = murosVistaDesdeEstado(estado);
    const escenaAr = construirEscenaAr(estado.sala, disp, muros, ANCLAJE_CANONICO, idioma);
    const grupo = construirGrupoMallaParaUsdz(escenaAr);

    const exporter = new USDZExporter();
    const datos = await exporter.parseAsync(grupo, {
      ar: { anchoring: { type: 'plane' }, planeAnchoring: { alignment: 'horizontal' } },
      quickLookCompatible: true,
    });

    const blob = new Blob([datos], { type: 'model/vnd.usdz+zip' });
    enlace.href = URL.createObjectURL(blob);
    enlace.classList.remove('hidden');
    estadoTexto?.classList.add('hidden');
  } catch (err) {
    if (estadoTexto) {
      estadoTexto.textContent = t.quickLookError;
      console.error('USDZExporter:', err);
    }
  }
}

async function arrancar(): Promise<void> {
  const estado = decodificarEstadoAr(location.search.replace(/^\?/, ''));
  if (!estado) {
    mostrarSolo('ar-estado-invalido');
    return;
  }

  if (!tieneNavigatorXr(navigator)) {
    if (soportaQuickLook()) {
      await mostrarQuickLook(estado);
      return;
    }
    mostrarSolo('ar-no-soportado');
    return;
  }
  const soportado = await soportaArInmersiva(navigator);
  if (!soportado) {
    if (soportaQuickLook()) {
      await mostrarQuickLook(estado);
      return;
    }
    mostrarSolo('ar-no-soportado');
    return;
  }

  mostrarSolo('ar-pasos');

  const canvas = document.getElementById('ar-canvas') as HTMLCanvasElement | null;
  const overlayRoot = document.getElementById('ar-overlay');
  const hudTexto = document.getElementById('ar-hud-texto');
  const errorTexto = document.getElementById('ar-error-sesion-texto');
  const btnEntrar = document.getElementById('btn-entrar-ar');
  const btnReiniciar = document.getElementById('btn-reiniciar-calibracion');
  const btnMedirAltura = document.getElementById('btn-medir-altura');
  const medicionAncho = document.getElementById('ar-medicion-ancho');
  const medicionAlto = document.getElementById('ar-medicion-alto');
  const medicionFueraDeRango = document.getElementById('ar-medicion-fuera-de-rango');
  if (!canvas || !overlayRoot || !hudTexto || !errorTexto || !btnEntrar || !btnReiniciar || !btnMedirAltura || !medicionAncho || !medicionAlto || !medicionFueraDeRango) return;

  function onCambioEstado(paso: EstadoCalibracion): void {
    const t = textosDe(idioma).ar;
    if (paso === 'calibrando-1') {
      hudTexto!.textContent = t.calibrandoPaso1;
      mostrarSolo('ar-calibrando');
    } else if (paso === 'calibrando-2') {
      hudTexto!.textContent = t.calibrandoPaso2;
      mostrarSolo('ar-calibrando');
    } else if (paso === 'midiendo-altura') {
      hudTexto!.textContent = t.calibrandoAltura;
      mostrarSolo('ar-calibrando');
    } else {
      mostrarSolo('ar-anclado');
    }
  }

  // `onMedicion` se llama 2 veces como máximo por sesión: al anclar
  // (siempre evalúa ancho, alturaMedidaM todavía null a esa altura) y,
  // si se pidió, después del 3er toque (evalúa altura). `esperandoAltura`
  // distingue esos dos momentos — sin esto, un `alturaMedidaM===null` de
  // la PRIMERA llamada (todavía no se intentó medir) se vería igual que
  // un intento real que falló, y el aviso de "fuera de rango" aparecería
  // sin haber tocado nada.
  let esperandoAltura = false;

  /** Ancho/alto medidos se muestran cuando hay valor; `null` oculta esa
   * línea en vez de mostrar un "—" sin explicar por qué. El aviso de
   * "fuera de rango" sólo se dispara cuando YA se intentó esa medición
   * en particular y no dio un valor creíble — nunca antes de intentarla. */
  function onMedicion(info: InfoMedicion): void {
    const t = textosDe(idioma).ar;
    medicionAncho!.classList.toggle('hidden', info.anchoMedidoM === null);
    if (info.anchoMedidoM !== null) {
      medicionAncho!.innerHTML = t.medicionAnchoHtml({ ancho: num(info.anchoMedidoM, 2, idioma) });
    } else if (!esperandoAltura) {
      medicionFueraDeRango!.classList.remove('hidden');
    }

    medicionAlto!.classList.toggle('hidden', info.alturaMedidaM === null);
    if (info.alturaMedidaM !== null) {
      medicionAlto!.innerHTML = t.medicionAlturaHtml({ alto: num(info.alturaMedidaM, 2, idioma) });
      medicionFueraDeRango!.classList.add('hidden');
    } else if (esperandoAltura) {
      medicionFueraDeRango!.classList.remove('hidden');
    }
    esperandoAltura = false;
  }

  function onErrorSesion(mensaje: string): void {
    errorTexto!.textContent = mensaje;
    mostrarSolo('ar-error-sesion');
  }

  btnEntrar.addEventListener('click', () => {
    void iniciarSesionAr(canvas, {
      estado,
      idioma,
      overlayRoot,
      onCambioEstado,
      onMedicion,
      onErrorSesion,
      onFinSesion: () => mostrarSolo('ar-pasos'),
    }).then((controlador) => {
      if (!controlador) return;
      btnMedirAltura.addEventListener('click', () => {
        medicionFueraDeRango!.classList.add('hidden');
        esperandoAltura = true;
        controlador.medirAlturaReal();
      });
    });
  });

  // "Volver a calibrar" (posición + orientación + ancho) sigue sin tener
  // una API de recalibración en vivo — a diferencia de la altura (botón
  // "Medir altura real", sesion.ts sí la refina sobre la marcha), volver
  // a anclar desde cero exige una sesión XR nueva. Recargar la página es
  // la forma simple y segura de terminar la sesión activa y volver a
  // "Entrar en AR" desde cero, conservando el estado de la URL (mismos
  // parámetros de sala).
  btnReiniciar.addEventListener('click', () => location.reload());
}

void arrancar();
