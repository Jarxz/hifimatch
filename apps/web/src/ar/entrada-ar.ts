/**
 * Bootstrap de ar.html — lee idioma guardado (misma clave de
 * localStorage que index.html, mismo origen en producción), decodifica
 * el estado de la URL, corre el chequeo de soporte de WebXR, y cablea
 * "Entrar en AR" a sesion.ts. Impuro (DOM real) — no testeable con
 * `node --test`; ver la sección de verificación del plan de AR.
 */
import '../estilos.css';
import { idiomaInicial, aplicarCromoEstatico, textosDe } from '../idioma/idioma.ts';
import { decodificarEstadoAr } from './estadoUrl.ts';
import { tieneNavigatorXr, soportaArInmersiva } from './soporte.ts';
import { iniciarSesionAr } from './sesion.ts';
import type { EstadoCalibracion } from './sesion.ts';

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
  if (!canvas || !overlayRoot || !hudTexto || !errorTexto || !btnEntrar || !btnReiniciar) return;

  function onCambioEstado(paso: EstadoCalibracion): void {
    const t = textosDe(idioma).ar;
    if (paso === 'calibrando-1') {
      hudTexto!.textContent = t.calibrandoPaso1;
      mostrarSolo('ar-calibrando');
    } else if (paso === 'calibrando-2') {
      hudTexto!.textContent = t.calibrandoPaso2;
      mostrarSolo('ar-calibrando');
    } else {
      mostrarSolo('ar-anclado');
    }
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
      onErrorSesion,
      onFinSesion: () => mostrarSolo('ar-pasos'),
    });
  });

  // "Volver a calibrar": no hay una API de recalibración en vivo dentro
  // de la misma sesión WebXR (sesion.ts arma la escena una sola vez, al
  // segundo toque) — recargar la página es la forma simple y segura de
  // terminar la sesión activa y volver a "Entrar en AR" desde cero,
  // conservando el estado de la URL (mismos parámetros de sala).
  btnReiniciar.addEventListener('click', () => location.reload());
}

void arrancar();
