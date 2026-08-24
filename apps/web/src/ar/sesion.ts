/**
 * Sesión WebXR (`immersive-ar` + hit-test) — impura, no testeable con
 * `node --test` (necesita cámara + ARCore reales; ver la sección de
 * verificación del plan de AR en el historial de esta sesión). Sólo
 * mecánica de WebXR/three.js: calibración de 2 toques, anclaje, y
 * agregar la escena ya construida (`geometriaAr.ts` + `escenaThree.ts`)
 * a la sesión. No decide texto de UI — reporta transiciones de estado
 * por callback (`onCambioEstado`) para que `entrada-ar.ts`, que sí tiene
 * las referencias del DOM del overlay, escriba el texto localizado.
 *
 * Patrón de hit-test seguido: `reticulo` se actualiza una vez por frame
 * en el loop de render (posición + posición del visor XR en ese
 * instante — ver `anclaje.ts` sobre por qué es la posición del visor y
 * no su dirección de mirada); el listener de `select` de la sesión sólo
 * LEE esos valores ya calculados — no vuelve a pedir un XRFrame dentro
 * del propio evento, evita depender de si `renderer.xr.getFrame()` es
 * seguro de llamar fuera del loop de animación (no está claramente
 * documentado).
 */
import * as THREE from 'three';
import { calcularDisposicionAsientoManual } from '../../../../packages/engine/src/sala.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import type { EstadoAr } from './estadoUrl.ts';
import type { MurosVista } from '../vista/plano.ts';
import type { Vec3 } from './anclaje.ts';
import { resolverAnclaje } from './anclaje.ts';
import { construirEscenaAr, construirPlanoFrontalPreview } from './geometriaAr.ts';
import { construirGrupoThree, actualizarResolucionLineas, construirPlanoFrontalPreviewMesh, actualizarPlanoFrontalPreviewMesh } from './escenaThree.ts';

const CARACTERISTICAS_REQUERIDAS: string[] = ['hit-test', 'local-floor'];
const CARACTERISTICAS_OPCIONALES: string[] = ['dom-overlay'];

export type EstadoCalibracion = 'calibrando-1' | 'calibrando-2' | 'anclado';

export interface OpcionesSesionAr {
  estado: EstadoAr;
  idioma: Idioma;
  overlayRoot: Element;
  onCambioEstado: (paso: EstadoCalibracion) => void;
  onErrorSesion: (mensaje: string) => void;
  onFinSesion?: () => void;
}

/** El material exacto de cada muro no cambia ninguna geometría de AR —
 * `geometriaAr.ts` sólo distingue "vacío" (omite la reflexión) de "no
 * vacío" (ver estadoUrl.ts) — 'yesoCarton' es un placeholder arbitrario
 * para el caso "no vacío". */
function murosVistaDesdeEstado(e: EstadoAr): MurosVista {
  return {
    frontal: e.muroFrontalVacio ? 'vacio' : 'yesoCarton',
    posterior: e.muroPosteriorVacio ? 'vacio' : 'yesoCarton',
    izquierdo: e.muroIzquierdoVacio ? 'vacio' : 'yesoCarton',
    derecho: e.muroDerechoVacio ? 'vacio' : 'yesoCarton',
  };
}

export async function iniciarSesionAr(canvas: HTMLCanvasElement, opciones: OpcionesSesionAr): Promise<void> {
  const { estado, idioma, overlayRoot, onCambioEstado, onErrorSesion, onFinSesion } = opciones;

  // Geometría del motor — no depende del anclaje, se calcula una sola vez.
  // Siempre vía calcularDisposicionAsientoManual (mismo criterio que
  // main.ts con el candado abierto): con candado cerrado, `estado.asiento`
  // ya llega como el punto dulce simétrico derivado, así que esta única
  // llamada reproduce los dos casos sin duplicar geometría fuera de sala.ts.
  const disp = calcularDisposicionAsientoManual(estado.sala, estado.parlanteIzq, estado.parlanteDer, estado.asiento);
  const muros = murosVistaDesdeEstado(estado);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  // LineMaterial (escenaThree.ts, líneas gordas) necesita el tamaño del
  // viewport en píxeles para seguir calculando el grosor real en cada
  // resize — se guarda acá y se propaga a lo que ya esté anclado.
  const resolucionActual = { x: window.innerWidth, y: window.innerHeight };
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    resolucionActual.x = window.innerWidth;
    resolucionActual.y = window.innerHeight;
    if (grupoAnclado) actualizarResolucionLineas(grupoAnclado, resolucionActual);
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();

  // Retícula: sigue el hit-test contra el piso, feedback visual de "acá
  // vas a tocar" antes del toque real. Dorado, mismo color que las
  // reflexiones (escenaThree.ts) — asociación visual con lo que se está
  // por anclar.
  const reticuloGeometria = new THREE.RingGeometry(0.06, 0.08, 32).rotateX(-Math.PI / 2);
  const reticuloMaterial = new THREE.MeshBasicMaterial({ color: 0xc7ad7c, transparent: true, opacity: 0.9 });
  const reticulo = new THREE.Mesh(reticuloGeometria, reticuloMaterial);
  reticulo.matrixAutoUpdate = false;
  reticulo.visible = false;
  scene.add(reticulo);

  // Vista previa del muro frontal (segundo toque, ver comentario de
  // cabecera): mesh vacío desde el arranque, se llena/actualiza en el
  // loop de render mientras se espera el segundo toque, con la posición
  // ACTUAL de la retícula como "toque 2" tentativo — así el usuario ve,
  // antes de confirmar, si el muro quedaría bien orientado.
  const planoPreview = construirPlanoFrontalPreviewMesh();
  planoPreview.visible = false;
  scene.add(planoPreview);

  let referenceSpace: XRReferenceSpace | null = null;
  let hitTestSource: XRHitTestSource | null = null;
  let toque1: Vec3 | null = null;
  let posicionVisorActual: Vec3 | null = null;
  let sesionAnclada = false;
  let grupoAnclado: THREE.Group | null = null;

  function alSeleccionar(): void {
    if (sesionAnclada || !reticulo.visible) return; // sin superficie detectada bajo la retícula, el toque no cuenta
    const posicionActual: Vec3 = { x: reticulo.position.x, y: reticulo.position.y, z: reticulo.position.z };

    if (!toque1) {
      toque1 = posicionActual;
      onCambioEstado('calibrando-2');
      return;
    }
    if (!posicionVisorActual) return; // no debería pasar en la práctica — sin pose de cámara todavía

    const anclaje = resolverAnclaje(toque1, posicionActual, posicionVisorActual);
    const escenaAr = construirEscenaAr(estado.sala, disp, muros, anclaje, idioma);
    grupoAnclado = construirGrupoThree(escenaAr, resolucionActual);
    scene.add(grupoAnclado);

    sesionAnclada = true;
    hitTestSource?.cancel();
    hitTestSource = null;
    reticulo.visible = false;
    planoPreview.visible = false;
    onCambioEstado('anclado');
  }

  try {
    const session = await navigator.xr!.requestSession('immersive-ar', {
      requiredFeatures: CARACTERISTICAS_REQUERIDAS,
      optionalFeatures: CARACTERISTICAS_OPCIONALES,
      domOverlay: { root: overlayRoot },
    });

    renderer.xr.setReferenceSpaceType('local-floor');
    await renderer.xr.setSession(session);
    referenceSpace = renderer.xr.getReferenceSpace();

    const viewerSpace = await session.requestReferenceSpace('viewer');
    // requestHitTestSource está tipado como opcional por @types/webxr (el
    // método sólo existe en runtime si el módulo AR de WebXR está
    // presente) — 'hit-test' ya es requiredFeature de esta sesión, así
    // que si requestSession() resolvió, el método existe de verdad.
    hitTestSource = (await session.requestHitTestSource!({ space: viewerSpace, entityTypes: ['plane'] })) ?? null;

    session.addEventListener('select', alSeleccionar);
    session.addEventListener('end', () => {
      hitTestSource?.cancel();
      hitTestSource = null;
      onFinSesion?.();
    });

    onCambioEstado('calibrando-1');

    renderer.setAnimationLoop((_tiempo, frame) => {
      if (frame && referenceSpace) {
        // Posición del visor (cabeza/teléfono), no su dirección de mirada
        // — ver anclaje.ts sobre por qué: es una señal mucho más estable
        // para desambiguar "hacia dónde es el fondo de la sala" que hacia
        // dónde apunta la cámara en el instante exacto del toque (que al
        // tocar un punto de piso pegado a la pared, naturalmente apunta
        // hacia abajo y hacia esa pared, no hacia el fondo).
        const camaraXr = renderer.xr.getCamera();
        posicionVisorActual = { x: camaraXr.position.x, y: camaraXr.position.y, z: camaraXr.position.z };

        if (hitTestSource && !sesionAnclada) {
          const resultados = frame.getHitTestResults(hitTestSource);
          if (resultados.length > 0) {
            const pose = resultados[0]!.getPose(referenceSpace);
            if (pose) {
              reticulo.visible = true;
              reticulo.matrix.fromArray(pose.transform.matrix);
              reticulo.matrix.decompose(reticulo.position, reticulo.quaternion, reticulo.scale);
            }
          } else {
            reticulo.visible = false;
          }

          // Vista previa del muro frontal: sólo tiene sentido con el
          // toque 1 ya fijado (se está esperando el toque 2) y una
          // superficie detectada bajo la retícula ahora mismo — usa esa
          // posición como "toque 2" tentativo, sin confirmarlo todavía.
          if (toque1 && reticulo.visible && posicionVisorActual) {
            const posicionTentativa: Vec3 = { x: reticulo.position.x, y: reticulo.position.y, z: reticulo.position.z };
            const anclajeTentativo = resolverAnclaje(toque1, posicionTentativa, posicionVisorActual);
            actualizarPlanoFrontalPreviewMesh(planoPreview, construirPlanoFrontalPreview(estado.sala, anclajeTentativo));
            planoPreview.visible = true;
          } else {
            planoPreview.visible = false;
          }
        }
      }
      renderer.render(scene, camera);
    });
  } catch (err) {
    onErrorSesion(err instanceof Error ? err.message : String(err));
  }
}
