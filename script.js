const menu = document.querySelector(".menu");
const mobileNav = document.getElementById("mobile-nav");
function closeMenu() {
  menu.setAttribute("aria-expanded", "false");
  mobileNav.hidden = true;
  menu.textContent = "Menu +";
}
menu.addEventListener("click", () => {
  const open = menu.getAttribute("aria-expanded") !== "true";
  menu.setAttribute("aria-expanded", String(open));
  mobileNav.hidden = !open;
  menu.textContent = open ? "Close −" : "Menu +";
});
mobileNav
  .querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !mobileNav.hidden) {
    closeMenu();
    menu.focus();
  }
});

// The following section covers the sticky hero as its photo fades out.
const landingHero = document.querySelector(".landing-hero");
if (landingHero) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let scheduled = false;
  function updateHero() {
    const progress = Math.min(
      1,
      Math.max(0, window.scrollY / landingHero.offsetHeight),
    );
    landingHero.style.setProperty(
      "--hero-opacity",
      reducedMotion.matches ? 1 : 1 - progress,
    );
    landingHero.style.setProperty(
      "--hero-copy-opacity",
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
  window.addEventListener("scroll", scheduleHeroUpdate, { passive: true });
  window.addEventListener("resize", scheduleHeroUpdate);
  reducedMotion.addEventListener("change", scheduleHeroUpdate);
  updateHero();
}
