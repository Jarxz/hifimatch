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
 * en el loop de render (posición + dirección de mirada de la cámara XR
 * en ese instante); el listener de `select` de la sesión sólo LEE esos
 * valores ya calculados — no vuelve a pedir un XRFrame dentro del propio
 * evento, evita depender de si `renderer.xr.getFrame()` es seguro de
 * llamar fuera del loop de animación (no está claramente documentado).
 */
import * as THREE from 'three';
import { calcularDisposicionAsientoManual } from '../../../../packages/engine/src/sala.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import type { EstadoAr } from './estadoUrl.ts';
import type { MurosVista } from '../vista/plano.ts';
import type { Vec3 } from './anclaje.ts';
import { resolverAnclaje } from './anclaje.ts';
import { construirEscenaAr } from './geometriaAr.ts';
import { construirGrupoThree } from './escenaThree.ts';

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
  window.addEventListener('resize', () => renderer.setSize(window.innerWidth, window.innerHeight));

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

  let referenceSpace: XRReferenceSpace | null = null;
  let hitTestSource: XRHitTestSource | null = null;
  let toque1: Vec3 | null = null;
  let miradaActual: Vec3 | null = null;
  let sesionAnclada = false;

  function alSeleccionar(): void {
    if (sesionAnclada || !reticulo.visible) return; // sin superficie detectada bajo la retícula, el toque no cuenta
    const posicionActual: Vec3 = { x: reticulo.position.x, y: reticulo.position.y, z: reticulo.position.z };

    if (!toque1) {
      toque1 = posicionActual;
      onCambioEstado('calibrando-2');
      return;
    }
    if (!miradaActual) return; // no debería pasar en la práctica — sin pose de cámara todavía

    const anclaje = resolverAnclaje(toque1, posicionActual, miradaActual);
    const escenaAr = construirEscenaAr(estado.sala, disp, muros, anclaje, idioma);
    scene.add(construirGrupoThree(escenaAr));

    sesionAnclada = true;
    hitTestSource?.cancel();
    hitTestSource = null;
    reticulo.visible = false;
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

    const direccionMirada = new THREE.Vector3();
    renderer.setAnimationLoop((_tiempo, frame) => {
      if (frame && referenceSpace) {
        const camaraXr = renderer.xr.getCamera();
        camaraXr.getWorldDirection(direccionMirada);
        miradaActual = { x: direccionMirada.x, y: direccionMirada.y, z: direccionMirada.z };

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
        }
      }
      renderer.render(scene, camera);
    });
  } catch (err) {
    onErrorSesion(err instanceof Error ? err.message : String(err));
  }
}
