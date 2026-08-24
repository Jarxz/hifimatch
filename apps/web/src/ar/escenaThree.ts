/**
 * Único módulo de `apps/web/src/ar` que importa `three` — construye un
 * `THREE.Group` a partir de una `EscenaAr` ya anclada (`geometriaAr.ts`,
 * puro). Reusa la misma paleta que ya usa `vista/plano.ts` para el plano
 * isométrico 2D (consistencia visual entre las dos representaciones del
 * mismo dato): dorado `#C7AD7C` para reflexiones, `#ECECEE` para
 * parlantes/punto dulce, blanco translúcido para las aristas de la sala.
 *
 * Sin materiales PBR, sin sombras, sin geometría sólida: mismo principio
 * "wireframe honesto, sin fingir opacidad" que ya declara la cabecera de
 * `plano.ts` — sólo líneas y esferas chicas, nada que sugiera una
 * superficie resuelta que este modelo no calcula. No es testeable con
 * `node --test` (necesita `document.createElement('canvas')` para las
 * etiquetas de texto) — ver la sección de verificación del plan de AR.
 *
 * Líneas "gordas" (Line2/LineMaterial de three/addons, no
 * THREE.LineBasicMaterial): el `linewidth` de un material de línea
 * estándar de WebGL lo ignora la enorme mayoría de plataformas (todo lo
 * que usa ANGLE en desktop, prácticamente todo Android/Chrome/ARCore) —
 * queda fijo en 1px de verdad sin importar el valor puesto, así que en
 * el hardware al que apunta esta función (Android/Chrome) el grosor
 * pedido no se vería. Line2 dibuja la línea como una malla de cintas con
 * un shader propio, con grosor real controlado por `resolution`
 * (tamaño del viewport en píxeles) — por eso `construirGrupoThree` pide
 * ese dato como parámetro en vez de asumirlo.
 */
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { EscenaAr, SegmentoAr, PuntoAr } from './geometriaAr.ts';

const COLOR_ARISTA = 0xffffff;
const OPACIDAD_ARISTA = 0.55;
const GROSOR_ARISTA_PX = 3.5;
const COLOR_TRIANGULO = 0xffffff;
const OPACIDAD_TRIANGULO = 0.6;
const GROSOR_TRIANGULO_PX = 2;
const COLOR_REFLEXION = 0xc7ad7c;
const OPACIDAD_REFLEXION = 0.75;
const GROSOR_REFLEXION_PX = 2.5;
const COLOR_PARLANTE = 0xececee;
const COLOR_DULCE = 0xececee;

/** Radio de la esfera que marca cada punto — chico a propósito, es una
 * marca de posición, no un objeto que pretenda representar un volumen
 * físico (a diferencia de la caja de alambre de parlante en plano.ts,
 * que sí es ilustrativa de un tamaño típico). */
const RADIO_PUNTO_M = 0.03;

export interface Resolucion {
  x: number;
  y: number;
}

function lineasDeTipo(segmentos: SegmentoAr[], tipo: SegmentoAr['tipo'], color: number, opacidad: number, grosorPx: number, resolucion: Resolucion): LineSegments2 | null {
  const filtrados = segmentos.filter((s) => s.tipo === tipo);
  if (filtrados.length === 0) return null;
  const posiciones = new Float32Array(filtrados.length * 6);
  filtrados.forEach((s, i) => {
    posiciones[i * 6 + 0] = s.a.x;
    posiciones[i * 6 + 1] = s.a.y;
    posiciones[i * 6 + 2] = s.a.z;
    posiciones[i * 6 + 3] = s.b.x;
    posiciones[i * 6 + 4] = s.b.y;
    posiciones[i * 6 + 5] = s.b.z;
  });
  const geometria = new LineSegmentsGeometry();
  geometria.setPositions(posiciones);
  const material = new LineMaterial({ color, transparent: true, opacity: opacidad, linewidth: grosorPx });
  material.resolution.set(resolucion.x, resolucion.y);
  const lineas = new LineSegments2(geometria, material);
  lineas.computeLineDistances();
  return lineas;
}

function colorDePunto(tipo: PuntoAr['tipo']): number {
  return tipo === 'reflexion' ? COLOR_REFLEXION : tipo === 'punto-dulce' ? COLOR_DULCE : COLOR_PARLANTE;
}

function esferaDePunto(p: PuntoAr): THREE.Mesh {
  const geometria = new THREE.SphereGeometry(RADIO_PUNTO_M, 12, 8);
  const material = new THREE.MeshBasicMaterial({ color: colorDePunto(p.tipo), transparent: true, opacity: 0.85 });
  const esfera = new THREE.Mesh(geometria, material);
  esfera.position.set(p.p.x, p.p.y, p.p.z);
  return esfera;
}

/**
 * Etiqueta de texto (canvas 2D como textura de un `THREE.Sprite`, que
 * siempre encara a cámara por comportamiento nativo — no hay geometría
 * de texto 3D real que orientar). `depthTest:false` para que la etiqueta
 * nunca quede tapada por una línea/esfera cercana — es información
 * (la distancia calculada), no debe poder desaparecer detrás del propio
 * wireframe.
 */
function etiquetaSprite(p: PuntoAr): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const ESCALA_SUPERSAMPLE = 4;
  const fontSize = 32 * ESCALA_SUPERSAMPLE;
  const fuente = `${fontSize}px ui-monospace, Menlo, Consolas, monospace`;
  ctx.font = fuente;
  const anchoTexto = ctx.measureText(p.etiqueta).width;
  canvas.width = Math.ceil(anchoTexto + 24 * ESCALA_SUPERSAMPLE);
  canvas.height = Math.ceil(fontSize * 1.5);
  // Cambiar el tamaño del canvas resetea el contexto — el font hay que
  // volver a fijarlo después de asignar width/height, no antes.
  ctx.font = fuente;
  ctx.fillStyle = p.tipo === 'reflexion' ? '#C7AD7C' : '#ECECEE';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.etiqueta, 12 * ESCALA_SUPERSAMPLE, canvas.height / 2);

  const textura = new THREE.CanvasTexture(canvas);
  textura.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: textura, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  const ALTURA_MUNDO_M = 0.06; // legible sin dominar la escena a distancia de sala
  const anchoMundoM = ALTURA_MUNDO_M * (canvas.width / canvas.height);
  sprite.scale.set(anchoMundoM, ALTURA_MUNDO_M, 1);
  sprite.position.set(p.p.x, p.p.y + 0.05, p.p.z);
  return sprite;
}

export function construirGrupoThree(escena: EscenaAr, resolucion: Resolucion): THREE.Group {
  const grupo = new THREE.Group();

  const aristas = lineasDeTipo(escena.segmentos, 'arista-sala', COLOR_ARISTA, OPACIDAD_ARISTA, GROSOR_ARISTA_PX, resolucion);
  if (aristas) grupo.add(aristas);
  const triangulo = lineasDeTipo(escena.segmentos, 'triangulo', COLOR_TRIANGULO, OPACIDAD_TRIANGULO, GROSOR_TRIANGULO_PX, resolucion);
  if (triangulo) grupo.add(triangulo);
  const reflexiones = lineasDeTipo(escena.segmentos, 'reflexion', COLOR_REFLEXION, OPACIDAD_REFLEXION, GROSOR_REFLEXION_PX, resolucion);
  if (reflexiones) grupo.add(reflexiones);

  for (const p of escena.puntos) {
    grupo.add(esferaDePunto(p));
    grupo.add(etiquetaSprite(p));
  }

  return grupo;
}

/** El shader de `LineMaterial` necesita el tamaño del viewport en cada
 * resize para seguir calculando el grosor en píxeles reales — se
 * recorre el grupo en vez de guardar una lista aparte de materiales,
 * así `sesion.ts` no tiene que llevar su propia contabilidad de qué
 * objetos son líneas gordas. */
export function actualizarResolucionLineas(grupo: THREE.Object3D, resolucion: Resolucion): void {
  grupo.traverse((obj) => {
    if (obj instanceof LineSegments2 || obj instanceof Line2) {
      (obj.material as LineMaterial).resolution.set(resolucion.x, resolucion.y);
    }
  });
}

const COLOR_PREVIEW_MURO = 0xc7ad7c;
const OPACIDAD_PREVIEW_MURO = 0.22;

/**
 * Plano del muro frontal, vista previa en vivo durante el segundo toque
 * de calibración (ver `sesion.ts`) — geometría vacía al crearse, se llena
 * cuadro a cuadro con `actualizarPlanoFrontalPreviewMesh` en vez de
 * reconstruirse (evita alocar un mesh nuevo por frame mientras el
 * usuario todavía está apuntando). `DoubleSide` porque la cámara puede
 * terminar de cualquier lado del plano según hacia dónde mire;
 * `depthWrite:false` para que no tape after-the-fact al propio retículo
 * o al resto de la escena aún no anclada.
 */
export function construirPlanoFrontalPreviewMesh(): THREE.Mesh {
  const geometria = new THREE.BufferGeometry();
  const posiciones = new Float32Array(6 * 3); // 2 triángulos, 6 vértices
  geometria.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  const material = new THREE.MeshBasicMaterial({ color: COLOR_PREVIEW_MURO, transparent: true, opacity: OPACIDAD_PREVIEW_MURO, side: THREE.DoubleSide, depthWrite: false });
  return new THREE.Mesh(geometria, material);
}

/** Actualiza los 6 vértices (2 triángulos) del mesh de vista previa a
 * partir de las 4 esquinas ancladas del muro frontal — mismo orden que
 * `construirPlanoFrontalPreview` en geometriaAr.ts: origen(0,0,0),
 * (W,0,0), (W,0,H), (0,0,H). */
export function actualizarPlanoFrontalPreviewMesh(mesh: THREE.Mesh, esquinas: readonly [{ x: number; y: number; z: number }, { x: number; y: number; z: number }, { x: number; y: number; z: number }, { x: number; y: number; z: number }]): void {
  const [a, b, c, d] = esquinas;
  const orden = [a, b, c, a, c, d];
  const posicion = (mesh.geometry as THREE.BufferGeometry).attributes.position as THREE.BufferAttribute;
  orden.forEach((v, i) => posicion.setXYZ(i, v.x, v.y, v.z));
  posicion.needsUpdate = true;
  (mesh.geometry as THREE.BufferGeometry).computeBoundingSphere();
}
