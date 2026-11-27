const menu = document.querySelector('.menu');
const mobileNav = document.getElementById('mobile-nav');
const menuMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const menuBreakpoint = window.matchMedia('(max-width: 800px)');
let menuAnimation;
function setMenuOpen(open) {
  const wasHidden = mobileNav.hidden;
  const current = getComputedStyle(mobileNav);
  const from = wasHidden
    ? { clipPath: 'inset(0 0 100% 0)', transform: 'translateY(-12px)', opacity: 0 }
    : { clipPath: current.clipPath, transform: current.transform, opacity: current.opacity };
  if (menuAnimation) menuAnimation.cancel();
  menu.setAttribute('aria-expanded', String(open));
  menu.textContent = open ? 'Close −' : 'Menu +';
  mobileNav.inert = !open;
  if (menuMotion.matches || !menuBreakpoint.matches) {
    mobileNav.hidden = !open;
    return;
  }
  mobileNav.hidden = false;
  menuAnimation = mobileNav.animate([from, open
    ? { clipPath: 'inset(0 0 0% 0)', transform: 'translateY(0)', opacity: 1 }
    : { clipPath: 'inset(0 0 100% 0)', transform: 'translateY(-12px)', opacity: 0 }
  ], { duration: 280, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
  menuAnimation.onfinish = () => {
    mobileNav.hidden = !open;
    menuAnimation.cancel();
    menuAnimation = undefined;
  };
}
function closeMenu() { setMenuOpen(false); }
menu.addEventListener('click', () => setMenuOpen(menu.getAttribute('aria-expanded') !== 'true'));
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); }
});
menuBreakpoint.addEventListener('change', () => { if (!menuBreakpoint.matches) closeMenu(); });
menuMotion.addEventListener('change', () => setMenuOpen(menu.getAttribute('aria-expanded') === 'true'));
mobileNav.inert = mobileNav.hidden;

// The following section covers the sticky hero as its photo fades out.
const landingHero = document.querySelector('.landing-hero');
if (landingHero) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let scheduled = false;
  function updateHero() {
    const progress = Math.min(1, Math.max(0, window.scrollY / landingHero.offsetHeight));
    landingHero.style.setProperty('--hero-opacity', reducedMotion.matches ? 1 : 1 - progress);
    landingHero.style.setProperty('--hero-copy-opacity', reducedMotion.matches ? 1 : Math.max(0, 1 - progress * 1.8));
    // Covered content must not remain in the keyboard navigation order.
    landingHero.inert = progress >= 1;
    scheduled = false;
  }
  function scheduleHeroUpdate() {
    if (!scheduled) { scheduled = true; window.requestAnimationFrame(updateHero); }
  }
  window.addEventListener('scroll', scheduleHeroUpdate, { passive: true });
  window.addEventListener('resize', scheduleHeroUpdate);
  reducedMotion.addEventListener('change', scheduleHeroUpdate);
  updateHero();
}
