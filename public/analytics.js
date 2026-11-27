(() => {
  'use strict';
  const id = window.SPACE_ANALYTICS_ID;
  if (!/^G-[A-Z0-9]+$/.test(id || '')) return;
  const key = 'spacesoc-analytics-consent-v1';
  const consentLifetime = 180 * 86400000;
  const validChoices = ['accepted', 'rejected'];
  function readChoice() {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (!saved || !validChoices.includes(saved.value)) return;
      const age = Date.now() - saved.time;
      if (Number.isFinite(saved.time) && age >= 0 && age < consentLifetime)
        return saved.value;
    } catch {
      // Storage may be blocked. Consent still works for this page.
    }
  }
  let choice = readChoice();
  let started = false;
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  function start() {
    window[`ga-disable-${id}`] = false;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    if (started) return;
    started = true;
    gtag('js', new Date());
    gtag('config', id, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      // Keep campaign attribution, but exclude arbitrary query strings and fragments.
      page_location: safeLocation(),
      page_referrer: safeReferrer(),
    });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.append(tag);
  }
  function safeLocation() {
    const url = new URL(location.href);
    const params = new URLSearchParams();
    for (const name of ['utm_source', 'utm_medium', 'utm_campaign']) {
      if (url.searchParams.has(name))
        params.set(name, url.searchParams.get(name));
    }
    return url.origin + url.pathname + (params.size ? `?${params}` : '');
  }
  function safeReferrer() {
    try {
      const url = new URL(document.referrer);
      return url.origin + url.pathname;
    } catch {
      return '';
    }
  }
  function save(value) {
    choice = value;
    try {
      localStorage.setItem(key, JSON.stringify({ value, time: Date.now() }));
    } catch {}
    if (value === 'accepted') start();
    else {
      window[`ga-disable-${id}`] = true;
      // Disable first; no cookieless pings after withdrawal.
      gtag('consent', 'update', { analytics_storage: 'denied' });
      for (const cookie of document.cookie.split(';')) {
        const name = cookie.split('=')[0].trim();
        if (name === '_ga' || name.startsWith('_ga_')) {
          document.cookie = `${name}=; Max-Age=0; path=/`;
          const parts = location.hostname.split('.');
          for (let i = 0; i < parts.length - 1; i++) {
            document.cookie = `${name}=; Max-Age=0; path=/; domain=.${parts.slice(i).join('.')}`;
          }
        }
      }
    }
    panel.hidden = true;
    settings.focus({ preventScroll: true });
  }
  const panel = document.createElement('section');
  panel.className = 'analytics-consent';
  panel.setAttribute('aria-label', 'Analytics cookies');
  panel.innerHTML = `<p>Allow Google Analytics cookies to help us improve the website? Google receives usage data if you accept. Change your choice anytime in the footer.</p><div><button type="button" data-choice="accepted">Accept analytics</button><button type="button" data-choice="rejected">Reject analytics</button></div>`;
  panel.hidden = choice === 'accepted' || choice === 'rejected';
  panel
    .querySelectorAll('button')
    .forEach((button) =>
      button.addEventListener('click', () => save(button.dataset.choice)),
    );
  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'analytics-settings';
  settings.textContent = 'Analytics settings';
  settings.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) panel.querySelector('button').focus();
  });
  document.body.append(panel);
  (document.querySelector('footer') || document.body).append(settings);
  if (choice === 'accepted') start();
  document.addEventListener('click', (event) => {
    if (choice !== 'accepted' || !started) return;
    const link = event.target.closest('a[href]');
    if (!link) return;
    const url = new URL(link.href, location.href);
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return;
    // Do not send link text, email addresses, query strings or fragments.
    gtag('event', 'site_link_click', {
      link_domain: url.protocol === 'mailto:' ? 'email' : url.hostname,
      link_path: url.protocol === 'mailto:' ? 'email' : url.pathname,
      link_placement: link.closest('header, nav')
        ? 'navigation'
        : link.closest('footer')
          ? 'footer'
          : 'content',
      link_type:
        url.protocol === 'mailto:'
          ? 'contact'
          : url.origin === location.origin
            ? 'internal'
            : 'outbound',
      transport_type: 'beacon',
    });
  });
})();
