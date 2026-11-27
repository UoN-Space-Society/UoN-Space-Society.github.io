const menu = document.querySelector('.menu');
const mobileNav = document.getElementById('mobile-nav');
const menuBreakpoint = window.matchMedia('(max-width: 800px)');
// Keep the panel mounted so CSS can animate both opening and closing.
mobileNav.hidden = false;
mobileNav.inert = true;
mobileNav.setAttribute('aria-hidden', 'true');
function setMenuOpen(open) {
  menu.setAttribute('aria-expanded', String(open));
  menu.textContent = open ? 'Close −' : 'Menu +';
  mobileNav.inert = !open;
  mobileNav.setAttribute('aria-hidden', String(!open));
  mobileNav.classList.toggle('is-open', open);
  mobileNav.style.height = open ? `${mobileNav.scrollHeight}px` : '0px';
}
function closeMenu() {
  setMenuOpen(false);
}
menu.addEventListener('click', () =>
  setMenuOpen(menu.getAttribute('aria-expanded') !== 'true'),
);
mobileNav
  .querySelectorAll('a')
  .forEach((link) => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menu.focus();
  }
});
window.addEventListener('resize', () => {
  if (!menuBreakpoint.matches) closeMenu();
  else if (menu.getAttribute('aria-expanded') === 'true')
    mobileNav.style.height = `${mobileNav.scrollHeight}px`;
});

// The following section covers the sticky hero as its photo fades out.
const landingHero = document.querySelector('.landing-hero');
if (landingHero) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let scheduled = false;
  function updateHero() {
    const progress = Math.min(
      1,
      Math.max(0, window.scrollY / landingHero.offsetHeight),
    );
    landingHero.style.setProperty(
      '--hero-opacity',
      reducedMotion.matches ? 1 : 1 - progress,
    );
    landingHero.style.setProperty(
      '--hero-copy-opacity',
      reducedMotion.matches ? 1 : Math.max(0, 1 - progress * 1.8),
    );
    // Covered content must not remain in the keyboard navigation order.
    landingHero.inert = progress >= 1;
    scheduled = false;
  }
  function scheduleHeroUpdate() {
    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(updateHero);
    }
  }
  window.addEventListener('scroll', scheduleHeroUpdate, { passive: true });
  window.addEventListener('resize', scheduleHeroUpdate);
  reducedMotion.addEventListener('change', scheduleHeroUpdate);
  updateHero();
}
