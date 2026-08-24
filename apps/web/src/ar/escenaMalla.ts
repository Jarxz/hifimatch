/**
 * Escena de MALLAS (no líneas gordas ni sprites) — usada sólo para
 * exportar a USDZ (`entrada-ar.ts`, flujo de Quick Look en iPhone).
 * `three/addons/exporters/USDZExporter.js` sólo procesa objetos
 * `.isMesh` (confirmado leyendo su código fuente) — el wireframe de
 * `escenaThree.ts` (Line2/LineSegments2 + THREE.Sprite, para WebXR en
 * Android) no exporta a USD en absoluto. Cada segmento del mismo
 * `EscenaAr` puro (`geometriaAr.ts`, sin cambios — no le importa cómo
 * lo renderice el consumidor) se convierte acá en un tubo delgado
 * (`THREE.CylinderGeometry` orientado entre los dos puntos), la única
 * forma de que una "línea" exista como malla exportable.
 *
 * Sin etiquetas de distancia en esta primera versión — convertirlas a
 * planos con textura es posible pero es una mejora aparte, no
 * bloqueante para tener el wireframe navegable en AR.
 *
 * No es testeable en su totalidad con `node --test`: construir
 * `THREE.Mesh`/`Geometry`/`Material` no necesita DOM y corre bien bajo
 * Node, así que sólo `parametrosTubo()` (la cuenta pura de longitud y
 * centro) se separa y testea aparte — el resto (orientación via
 * cuaternión, armado del `THREE.Group`) se verifica junto con el resto
 * del flujo de Quick Look, sin hardware iOS real disponible para
 * confirmar el resultado final en el visor de Apple.
 */
import * as THREE from 'three';
import type { EscenaAr, SegmentoAr, PuntoAr } from './geometriaAr.ts';
import type { Vec3 } from './anclaje.ts';

// Arista y triángulo comparten color (blanco) — se distinguen por
// grosor de tubo (radioDeSegmento), no por color, mismo criterio que
// escenaThree.ts.
const COLOR_ARISTA = 0xffffff;
const COLOR_REFLEXION = 0xc7ad7c;
const COLOR_PARLANTE = 0xececee;
const COLOR_DULCE = 0xececee;

/** Radios de tubo por tipo de segmento — mismo criterio de énfasis que
 * `escenaThree.ts` (aristas más gruesas que triángulo/reflexión), acá
 * expresado como grosor de malla real en vez de píxeles de línea. */
const RADIO_TUBO_ARISTA_M = 0.015;
const RADIO_TUBO_TRIANGULO_M = 0.008;
const RADIO_TUBO_REFLEXION_M = 0.01;
/** Radio de esfera levemente mayor que en la versión WebXR (0,03 m):
 * ahí la escena la enmarca la cámara real y una retícula de referencia;
 * acá no hay ningún otro elemento de escala en pantalla más que el
 * modelo mismo. */
const RADIO_ESFERA_M = 0.035;

export interface ParametrosTubo {
  longitudM: number;
  centro: Vec3;
}

/** Longitud y punto medio del tubo entre dos puntos — puro, testeable.
 * La orientación (cuaternión) se resuelve directo con `THREE.Quaternion`
 * en `tuboMesh()`, no hace falta duplicar esa cuenta acá. */
export function parametrosTubo(a: Vec3, b: Vec3): ParametrosTubo {
  return {
    longitudM: Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z),
    centro: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 },
  };
}

const EJE_Y = new THREE.Vector3(0, 1, 0);

/** `emissive` además de `color`: Quick Look ilumina con su propio
 * entorno, sin garantía de que sea parejo — sin algo de luz propia el
 * wireframe podría verse casi negro en un entorno con poca luz
 * ambiente reflejada. */
function materialParaColor(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.7, metalness: 0 });
}

function tuboMesh(a: Vec3, b: Vec3, radioM: number, color: number): THREE.Mesh | null {
  const { longitudM, centro } = parametrosTubo(a, b);
  if (longitudM < 1e-6) return null; // segmento degenerado — no hay tubo real que dibujar
  const geometria = new THREE.CylinderGeometry(radioM, radioM, longitudM, 10);
  const mesh = new THREE.Mesh(geometria, materialParaColor(color));
  mesh.position.set(centro.x, centro.y, centro.z);
  const direccion = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z).normalize();
  mesh.quaternion.setFromUnitVectors(EJE_Y, direccion);
  return mesh;
}

function colorDeSegmento(tipo: SegmentoAr['tipo']): number {
  return tipo === 'reflexion' ? COLOR_REFLEXION : COLOR_ARISTA;
}

function radioDeSegmento(tipo: SegmentoAr['tipo']): number {
  if (tipo === 'arista-sala') return RADIO_TUBO_ARISTA_M;
  if (tipo === 'triangulo') return RADIO_TUBO_TRIANGULO_M;
  return RADIO_TUBO_REFLEXION_M;
}

function colorDePunto(tipo: PuntoAr['tipo']): number {
  return tipo === 'reflexion' ? COLOR_REFLEXION : tipo === 'punto-dulce' ? COLOR_DULCE : COLOR_PARLANTE;
}

function esferaMesh(p: PuntoAr): THREE.Mesh {
  const geometria = new THREE.SphereGeometry(RADIO_ESFERA_M, 12, 8);
  const mesh = new THREE.Mesh(geometria, materialParaColor(colorDePunto(p.tipo)));
  mesh.position.set(p.p.x, p.p.y, p.p.z);
  return mesh;
}

export function construirGrupoMallaParaUsdz(escena: EscenaAr): THREE.Group {
  const grupo = new THREE.Group();
  for (const s of escena.segmentos) {
    const tubo = tuboMesh(s.a, s.b, radioDeSegmento(s.tipo), colorDeSegmento(s.tipo));
    if (tubo) grupo.add(tubo);
  }
  for (const p of escena.puntos) {
    grupo.add(esferaMesh(p));
  }
  return grupo;
}
