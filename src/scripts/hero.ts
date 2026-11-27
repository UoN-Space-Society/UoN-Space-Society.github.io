/** Cache hero geometry and update only during the visible part of its fade. */
export function initializeHero() {
  const hero = document.querySelector<HTMLElement>('.landing-hero');
  if (!hero) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let height = hero.offsetHeight;

  const update = () => {
    frame = 0;
    const progress = Math.min(
      1,
      Math.max(0, window.scrollY / Math.max(1, height)),
    );
    hero.style.setProperty(
      '--hero-opacity',
      String(reducedMotion.matches ? 1 : 1 - progress),
    );
    hero.style.setProperty(
      '--hero-copy-opacity',
      String(reducedMotion.matches ? 1 : Math.max(0, 1 - progress * 1.8)),
    );
    hero.inert = progress >= 1;
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  // Once covered, avoid further frame callbacks until scrolling back to it.
  window.addEventListener(
    'scroll',
    () => {
      if (window.scrollY < height || !hero.inert) schedule();
    },
    { passive: true },
  );

  // Layout reads happen on resize, rather than on each scroll frame.
  new ResizeObserver(() => {
    height = hero.offsetHeight;
    schedule();
  }).observe(hero);
  reducedMotion.addEventListener('change', schedule);
  update();
}
