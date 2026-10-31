const features = {
  tranquility: ['01 / SEA OF TRANQUILITY', 'One giant leap.', 'Apollo 11 landed here in 1969. Every extraordinary journey begins with a first step.'],
  tycho: ['02 / TYCHO CRATER', 'An impact worth making.', 'A young lunar crater with bright rays stretching across the surface. Curiosity leaves its mark.']
};
document.querySelectorAll('.moon-pin').forEach(button => {
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    const [index, title, description] = features[button.dataset.feature];
    document.getElementById('moon-index').textContent = index;
    document.getElementById('moon-title').textContent = title;
    document.getElementById('moon-description').textContent = description;
    document.querySelectorAll('.moon-pin').forEach(pin => pin.setAttribute('aria-pressed', String(pin === button)));
  });
});
const menu = document.querySelector('.menu');
const mobileNav = document.getElementById('mobile-nav');
function closeMenu() { menu.setAttribute('aria-expanded', 'false'); mobileNav.hidden = true; menu.textContent = 'Menu +'; }
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open)); mobileNav.hidden = !open; menu.textContent = open ? 'Close −' : 'Menu +';
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menu.focus(); } });
document.querySelectorAll('.project').forEach(project => project.addEventListener('toggle', () => {
  if (project.open) document.querySelectorAll('.project').forEach(other => { if (other !== project) other.open = false; });
}));
