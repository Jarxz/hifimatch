/**
 * Filtro geográfico para el proveedor de búsqueda web (Gemini). Los
 * términos de servicio de Google declaran, textual: "You may use only
 * Paid Services when making API Clients available to users in the
 * European Economic Area, Switzerland, or the United Kingdom." — este
 * sitio usa el plan gratuito, así que a un visitante de esas regiones
 * nunca se le ofrece la búsqueda web (cae directo a la ficha manual).
 *
 * El filtro correcto es la GEOGRAFÍA del visitante, no si tiene cuenta
 * registrada: la cláusula habla de dónde está el usuario, y una cuenta
 * no prueba ubicación. Archivo separado de buscador.ts (no lo importa,
 * ni lo importan entre sí) — cada uno lo consume directo `api/*`, así
 * que no hay ningún import relativo interno entre archivos de este
 * paquete que pueda repetir el problema ya documentado en
 * packages/contact/src/contacto.ts.
 *
 * ADVERTENCIA (declarada en el plan, no un detalle menor): esto es una
 * lectura de buena fe de la cláusula, no asesoría legal, y la
 * geolocalización por IP falla con VPN o clasificación errónea de la
 * base de datos de geo-IP.
 */

/** EEE (27 UE + Islandia, Liechtenstein, Noruega) + Suiza + Reino Unido —
 * exactamente las tres jurisdicciones que nombra la cláusula, más los
 * países de la UE que integran el EEE. Códigos ISO 3166-1 alfa-2. */
const PAISES_RESTRINGIDOS = new Set([
  // Unión Europea (27)
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // EEE fuera de la UE
  'IS', 'LI', 'NO',
  // nombradas aparte en la cláusula
  'CH', 'GB',
]);

/**
 * `true` si hay que bloquear la ruta de búsqueda web para este país.
 * Un país ausente/desconocido (header de geolocalización sin valor, o
 * un valor que no es un código ISO reconocible) se trata como
 * restringido — la lectura conservadora es la correcta cuando lo que
 * está en juego es cumplir un término de servicio, no una experiencia
 * de usuario.
 */
export function paisRestringido(codigoPais: string | null | undefined): boolean {
  if (!codigoPais) return true;
  const normalizado = codigoPais.trim().toUpperCase();
  if (normalizado.length !== 2) return true;
  return PAISES_RESTRINGIDOS.has(normalizado);
}
