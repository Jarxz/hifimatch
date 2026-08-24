/**
 * Sesión WebXR (`immersive-ar` + hit-test) — impura, no testeable con
 * `node --test` (necesita cámara + ARCore reales; ver la sección de
 * verificación del plan de AR en el historial de esta sesión). Sólo
 * mecánica de WebXR/three.js: calibración de 2 toques (piso, esquinas
 * real izquierda y derecha), medición de ancho automática desde esos
 * mismos 2 toques, un 3er toque OPCIONAL para medir la altura real, y
 * agregar la escena ya construida (`geometriaAr.ts` + `escenaThree.ts`)
 * a la sesión. No decide texto de UI — reporta transiciones de estado
 * y mediciones por callback (`onCambioEstado`/`onMedicion`) para que
 * `entrada-ar.ts`, que sí tiene las referencias del DOM del overlay,
 * escriba el texto localizado.
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
import type { Sala, DisposicionSala } from '../../../../packages/engine/src/sala.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import type { EstadoAr } from './estadoUrl.ts';
import type { MurosVista } from '../vista/plano.ts';
import type { Anclaje, Vec3 } from './anclaje.ts';
import { resolverAnclaje, medirAnchoM, medirAlturaM, anchoMedidoValido, alturaMedidaValida } from './anclaje.ts';
import { construirEscenaAr, construirPlanoFrontalPreview } from './geometriaAr.ts';
import { construirGrupoThree, actualizarResolucionLineas, construirPlanoFrontalPreviewMesh, actualizarPlanoFrontalPreviewMesh } from './escenaThree.ts';

const CARACTERISTICAS_REQUERIDAS: string[] = ['hit-test', 'local-floor'];
const CARACTERISTICAS_OPCIONALES: string[] = ['dom-overlay'];

export type EstadoCalibracion = 'calibrando-1' | 'calibrando-2' | 'anclado' | 'midiendo-altura';

export interface InfoMedicion {
  /** `null` si el segundo toque no cayó dentro del rango de sanidad —
   * ver `anchoMedidoValido` en anclaje.ts — y se mantuvo el ancho
   * tipeado en la web en vez de aplicar un número sin sentido. */
  anchoMedidoM: number | null;
  /** `null` hasta que se complete (o falle) el 3er toque opcional. */
  alturaMedidaM: number | null;
}

export interface OpcionesSesionAr {
  estado: EstadoAr;
  idioma: Idioma;
  overlayRoot: Element;
  onCambioEstado: (paso: EstadoCalibracion) => void;
  onMedicion: (info: InfoMedicion) => void;
  onErrorSesion: (mensaje: string) => void;
  onFinSesion?: () => void;
}

/** Devuelto sólo si la sesión arrancó bien — `entrada-ar.ts` lo usa para
 * cablear el botón "Medir altura real" sin que `sesion.ts` tenga que
 * conocer ningún id del DOM. */
export interface ControladorSesionAr {
  medirAlturaReal: () => void;
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

export async function iniciarSesionAr(canvas: HTMLCanvasElement, opciones: OpcionesSesionAr): Promise<ControladorSesionAr | undefined> {
  const { estado, idioma, overlayRoot, onCambioEstado, onMedicion, onErrorSesion, onFinSesion } = opciones;

  const muros = murosVistaDesdeEstado(estado);
  // Sala/disposición "actuales" — arrancan con las medidas tipeadas en
  // la web y se refinan con mediciones reales a medida que se completan
  // (ancho: automático, con el 2do toque; alto: con el 3er toque
  // opcional) — ver reconstruirEscena(). Siempre vía
  // calcularDisposicionAsientoManual (mismo criterio que main.ts con el
  // candado abierto): con candado cerrado, estado.asiento ya llega como
  // el punto dulce simétrico derivado, así que esta única llamada
  // reproduce los dos casos sin duplicar geometría fuera de sala.ts.
  let salaActual: Sala = estado.sala;
  let dispActual: DisposicionSala = calcularDisposicionAsientoManual(salaActual, estado.parlanteIzq, estado.parlanteDer, estado.asiento);

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

  // Retícula: sigue el hit-test contra el piso/pared, feedback visual de
  // "acá vas a tocar" antes del toque real. Dorado, mismo color que las
  // reflexiones (escenaThree.ts) — asociación visual con lo que se está
  // por anclar o medir.
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
  let anclajeActual: Anclaje | null = null;
  let posicionVisorActual: Vec3 | null = null;
  let sesionAnclada = false;
  let midiendoAltura = false;
  let grupoAnclado: THREE.Group | null = null;

  /** Reemplaza el wireframe anclado por uno nuevo, construido con
   * `salaActual`/`dispActual`/`anclajeActual` — se llama después de
   * anclar por primera vez y de nuevo si el 3er toque mide una altura
   * válida. No dispone la geometría/materiales del grupo anterior
   * explícitamente: es como mucho una reconstrucción por sesión, el
   * costo de dejarlo para el recolector de basura del navegador al
   * cerrar la sesión es despreciable frente a la complejidad de
   * disponer un THREE.Group mixto (Line2 + Mesh + Sprite) a mano. */
  function reconstruirEscena(): void {
    if (!anclajeActual) return;
    if (grupoAnclado) scene.remove(grupoAnclado);
    const escenaAr = construirEscenaAr(salaActual, dispActual, muros, anclajeActual, idioma);
    grupoAnclado = construirGrupoThree(escenaAr, resolucionActual);
    scene.add(grupoAnclado);
  }

  function medirAlturaReal(): void {
    if (!sesionAnclada || midiendoAltura) return;
    midiendoAltura = true;
    reticulo.visible = false;
    onCambioEstado('midiendo-altura');
  }

  function alSeleccionar(): void {
    if (!reticulo.visible) return; // sin superficie detectada bajo la retícula, el toque no cuenta
    const posicionActual: Vec3 = { x: reticulo.position.x, y: reticulo.position.y, z: reticulo.position.z };

    if (!toque1) {
      toque1 = posicionActual;
      onCambioEstado('calibrando-2');
      return;
    }

    if (!sesionAnclada) {
      if (!posicionVisorActual) return; // no debería pasar en la práctica — sin pose de cámara todavía

      anclajeActual = resolverAnclaje(toque1, posicionActual, posicionVisorActual);

      // Ancho real, gratis, de los mismos 2 toques — con la condición de
      // que toque2 sea la esquina real (no "cualquier punto de la
      // pared", instrucción vieja) esta distancia significa algo. Fuera
      // de rango: se mantiene el ancho tipeado en la web, declarado como
      // tal en InfoMedicion (anchoMedidoM: null) — nunca un número sin
      // sentido aplicado en silencio.
      const anchoMedido = medirAnchoM(toque1, posicionActual);
      const anchoValido = anchoMedidoValido(anchoMedido);
      salaActual = anchoValido ? { ...estado.sala, anchoM: anchoMedido } : estado.sala;
      dispActual = calcularDisposicionAsientoManual(salaActual, estado.parlanteIzq, estado.parlanteDer, estado.asiento);
      reconstruirEscena();

      sesionAnclada = true;
      reticulo.visible = false;
      planoPreview.visible = false;
      onMedicion({ anchoMedidoM: anchoValido ? anchoMedido : null, alturaMedidaM: null });
      onCambioEstado('anclado');
      return;
    }

    if (midiendoAltura) {
      midiendoAltura = false;
      reticulo.visible = false;
      const alturaMedida = medirAlturaM(toque1, posicionActual);
      const alturaValida = alturaMedidaValida(alturaMedida);
      if (alturaValida) {
        salaActual = { ...salaActual, altoM: alturaMedida };
        dispActual = calcularDisposicionAsientoManual(salaActual, estado.parlanteIzq, estado.parlanteDer, estado.asiento);
        reconstruirEscena();
      }
      onMedicion({ anchoMedidoM: salaActual.anchoM !== estado.sala.anchoM ? salaActual.anchoM : null, alturaMedidaM: alturaValida ? alturaMedida : null });
      onCambioEstado('anclado');
    }
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

        // El hit-test sigue corriendo en segundo plano incluso después de
        // anclar (no se cancela hasta que termina la sesión) — así el 3er
        // toque opcional de altura puede reusarlo sin volver a pedirlo.
        // Sólo se reacciona a sus resultados (retícula/vista previa)
        // mientras hace falta: antes de anclar, o mientras se espera ese
        // 3er toque.
        if (hitTestSource && (!sesionAnclada || midiendoAltura)) {
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
          // toque 1 ya fijado y todavía sin anclar (se está esperando el
          // toque 2) — usa la retícula como "toque 2" tentativo, sin
          // confirmarlo todavía. No se muestra durante la medición de
          // altura (ahí la referencia útil ya es el wireframe anclado,
          // no este plano).
          if (toque1 && !sesionAnclada && reticulo.visible && posicionVisorActual) {
            const posicionTentativa: Vec3 = { x: reticulo.position.x, y: reticulo.position.y, z: reticulo.position.z };
            const anclajeTentativo = resolverAnclaje(toque1, posicionTentativa, posicionVisorActual);
            actualizarPlanoFrontalPreviewMesh(planoPreview, construirPlanoFrontalPreview(salaActual, anclajeTentativo));
            planoPreview.visible = true;
          } else {
            planoPreview.visible = false;
          }
        }
      }
      renderer.render(scene, camera);
    });

    return { medirAlturaReal };
  } catch (err) {
    onErrorSesion(err instanceof Error ? err.message : String(err));
    return undefined;
  }
}
