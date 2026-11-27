import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../public/analytics.js', import.meta.url),
  'utf8',
);
const now = Date.now();
const day = 86400000;

// A small browser boundary: tests exercise user choices and outgoing commands.
function browser({ id = 'G-TEST123', saved = null, blocked = false } = {}) {
  const elements = [];
  const tags = [];
  const listeners = {};
  const stored = new Map([
    ['spacesoc-analytics-consent-v1', JSON.stringify(saved)],
  ]);
  function element() {
    return {
      hidden: false,
      handlers: {},
      addEventListener(name, handler) {
        this.handlers[name] = handler;
      },
      click() {
        this.handlers.click();
      },
      focus() {},
      setAttribute() {},
    };
  }
  const buttons = ['accepted', 'rejected'].map((value) =>
    Object.assign(element(), { dataset: { choice: value } }),
  );
  const panel = Object.assign(element(), {
    querySelectorAll: () => buttons,
    querySelector: () => buttons[0],
  });
  const settings = element();
  const document = {
    cookie: '',
    referrer: 'https://example.org/start?email=private#secret',
    head: { append: (tag) => tags.push(tag) },
    body: { append: (...nodes) => elements.push(...nodes) },
    createElement: (name) =>
      name === 'section' ? panel : name === 'button' ? settings : element(),
    addEventListener: (name, handler) => {
      listeners[name] = handler;
    },
  };
  const window = { SPACE_ANALYTICS_ID: id };
  vm.runInNewContext(source, {
    window,
    document,
    URL,
    URLSearchParams,
    Date,
    location: new URL(
      'https://uon-space-society.github.io/projects/helia.html?email=private&utm_source=instagram#secret',
    ),
    localStorage: {
      getItem(key) {
        if (blocked) throw Error('Blocked');
        return stored.get(key);
      },
      setItem(key, value) {
        if (blocked) throw Error('Blocked');
        stored.set(key, value);
      },
    },
  });
  return {
    window,
    tags,
    panel,
    elements,
    buttons,
    settings,
    commands: () => window.dataLayer || [],
    clickLink(href, placement = 'content') {
      listeners.click({
        target: {
          closest: () => ({
            href,
            closest: (selector) => (selector.includes(placement) ? {} : null),
          }),
        },
      });
    },
  };
}

test('missing configuration disables tracking and consent UI', () => {
  const page = browser({ id: '' });
  assert.equal(page.elements.length, 0);
  assert.equal(page.tags.length, 0);
});

test('no tag before consent or after rejection', () => {
  const page = browser();
  assert.equal(page.tags.length, 0);
  page.buttons[1].click();
  assert.equal(page.tags.length, 0);
  assert.equal(page.panel.hidden, true);
});

test('acceptance loads one tag and sanitizes page and referrer URLs', () => {
  const page = browser();
  page.buttons[0].click();
  page.buttons[0].click();
  assert.equal(page.tags.length, 1);
  const config = page.commands().find((command) => command[0] === 'config')[2];
  assert.equal(
    config.page_location,
    'https://uon-space-society.github.io/projects/helia.html?utm_source=instagram',
  );
  assert.equal(config.page_referrer, 'https://example.org/start');
  assert.equal(config.allow_google_signals, false);
});

test('restores a recent valid choice but prompts after expiry', () => {
  assert.equal(
    browser({ saved: { value: 'accepted', time: now } }).tags.length,
    1,
  );
  assert.equal(
    browser({ saved: { value: 'rejected', time: now } }).panel.hidden,
    true,
  );
  const expired = browser({
    saved: { value: 'accepted', time: now - 181 * day },
  });
  assert.equal(expired.tags.length, 0);
  assert.equal(expired.panel.hidden, false);
});

test('future-dated stored consent must not silently enable tracking', () => {
  const page = browser({ saved: { value: 'accepted', time: now + day } });
  assert.equal(page.tags.length, 0);
  assert.equal(page.panel.hidden, false);
});

test('blocked storage still allows a choice on the current page', () => {
  const page = browser({ blocked: true });
  page.buttons[0].click();
  assert.equal(page.tags.length, 1);
  page.settings.click();
  assert.equal(page.panel.hidden, false);
});

test('clicks redact email addresses and destination query strings', () => {
  const page = browser();
  page.clickLink('https://example.org/before');
  assert.equal(
    page.commands().filter((command) => command[0] === 'event').length,
    0,
  );
  page.buttons[0].click();
  page.clickLink('mailto:private@example.org');
  page.clickLink('https://example.org/join?token=secret#private', 'footer');
  const events = page.commands().filter((command) => command[0] === 'event');
  assert.equal(events[0][2].link_path, 'email');
  assert.equal(events[1][2].link_path, '/join');
  assert.equal(events[1][2].link_placement, 'footer');
  assert.ok(!JSON.stringify(events).includes('private'));
  page.buttons[1].click();
  page.clickLink('https://example.org/after');
  assert.equal(
    page.commands().filter((command) => command[0] === 'event').length,
    2,
  );
  assert.equal(page.window['ga-disable-G-TEST123'], true);
});

test('connected configuration uses the measurement ID from the society web stream', () => {
  const window = {};
  vm.runInNewContext(
    readFileSync(
      new URL('../public/analytics-config.js', import.meta.url),
      'utf8',
    ),
    { window },
  );
  assert.equal(window.SPACE_ANALYTICS_ID, 'G-5678YGQX46');
});

test('Google tag commands use the documented arguments-object queue', () => {
  const page = browser();
  assert.equal(
    Object.prototype.toString.call(page.commands()[0]),
    '[object Arguments]',
  );
});

test('malformed stored choices prompt again without loading Google', () => {
  for (const saved of [
    { value: 'accepted', time: String(now) },
    { value: 'unknown', time: now },
    { value: 'accepted' },
  ]) {
    const page = browser({ saved });
    assert.equal(page.tags.length, 0);
    assert.equal(page.panel.hidden, false);
  }
});
