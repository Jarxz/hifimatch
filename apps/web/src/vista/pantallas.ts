/** Las tres pantallas del sitio y el cambio entre ellas — el `go()` del prototipo. */
export type Pantalla = 'splash' | 'config' | 'results';

export function ir(pantalla: Pantalla): void {
  document.querySelectorAll<HTMLElement>('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById('s-' + pantalla)?.classList.add('active');
  window.scrollTo(0, 0);
}
