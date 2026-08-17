/** Las pantallas del sitio y el cambio entre ellas — el `go()` del prototipo. */
export type Pantalla = 'splash' | 'config' | 'results' | 'info';

export function ir(pantalla: Pantalla): void {
  const cambiar = (): void => {
    document.querySelectorAll<HTMLElement>('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('s-' + pantalla)?.classList.add('active');
    window.scrollTo(0, 0);
  };
  if (typeof document.startViewTransition === 'function') {
    const transicion = document.startViewTransition(cambiar);
    /* Navegar de nuevo mientras la transición anterior sigue en curso la
     * aborta (AbortError: "Transition was skipped") — comportamiento
     * esperado de la API, no un error real; sin este catch queda como
     * promise rejection sin manejar en la consola. */
    transicion.ready.catch(() => {});
  } else {
    cambiar();
  }
}
