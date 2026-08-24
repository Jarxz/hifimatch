/**
 * Bootstrap de ar.html — lee idioma guardado (misma clave de
 * localStorage que index.html, mismo origen en producción), decodifica
 * el estado de la URL, corre el chequeo de soporte de WebXR, y cablea
 * "Entrar en AR" a sesion.ts. Impuro (DOM real) — no testeable con
 * `node --test`; ver la sección de verificación del plan de AR.
 */
import '../estilos.css';
import { idiomaInicial, aplicarCromoEstatico, textosDe } from '../idioma/idioma.ts';
import { num } from '../formato/numeros.ts';
import { decodificarEstadoAr } from './estadoUrl.ts';
import { tieneNavigatorXr, soportaArInmersiva } from './soporte.ts';
import { iniciarSesionAr } from './sesion.ts';
import type { EstadoCalibracion, InfoMedicion } from './sesion.ts';

const idioma = idiomaInicial();
aplicarCromoEstatico(idioma);
// aplicarCromoEstatico ya fijó document.title con el meta.titulo del
// SITIO principal (index.html) — se pisa acá con el propio de esta
// página, sin tocar la función compartida.
document.title = textosDe(idioma).ar.titulo;

const TODOS_LOS_PANELES = ['ar-cargando', 'ar-no-soportado', 'ar-estado-invalido', 'ar-pasos', 'ar-error-sesion', 'ar-calibrando', 'ar-anclado'] as const;

function mostrarSolo(idVisible: (typeof TODOS_LOS_PANELES)[number]): void {
  for (const id of TODOS_LOS_PANELES) {
    document.getElementById(id)?.classList.toggle('hidden', id !== idVisible);
  }
}

async function arrancar(): Promise<void> {
  const estado = decodificarEstadoAr(location.search.replace(/^\?/, ''));
  if (!estado) {
    mostrarSolo('ar-estado-invalido');
    return;
  }

  if (!tieneNavigatorXr(navigator)) {
    mostrarSolo('ar-no-soportado');
    return;
  }
  const soportado = await soportaArInmersiva(navigator);
  if (!soportado) {
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
