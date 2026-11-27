/** Enhance native details navigation; links and the toggle work without JS. */
export function initializeNavigation() {
  const menu = document.querySelector<HTMLDetailsElement>('.mobile-menu');
  const toggle = menu?.querySelector<HTMLElement>('summary');
  if (!menu || !toggle) return;

  menu.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) {
      menu.open = false;
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      toggle.focus();
    }
  });

  const desktop = window.matchMedia('(min-width: 1101px)');
  desktop.addEventListener('change', (event) => {
    if (event.matches) menu.open = false;
  });
}
