import { createRoot, type Root } from 'react-dom/client';
import { scrapeListingPage } from '../lib/etsyScrape';
import { Panel } from './Panel';
import { PANEL_STYLES } from './panelStyles';

const HOST_ID = 'etsyranker-ai-host';
const LISTING_PATH_PATTERN = /\/(?:[a-z]{2}\/)?listing\//;

let root: Root | null = null;
let lastUrl = '';

function unmount() {
  const existing = document.getElementById(HOST_ID);
  if (existing) {
    root?.unmount();
    root = null;
    existing.remove();
  }
}

function mount() {
  if (!LISTING_PATH_PATTERN.test(location.pathname)) {
    unmount(); // navigated away from a listing page (e.g. back to search) — don't leave a stale panel up
    return;
  }

  const listing = scrapeListingPage(document);
  if (!listing.title) return; // not actually a product page despite matching the URL pattern

  unmount(); // clear any panel left over from a previously viewed listing before mounting fresh

  const host = document.createElement('div');
  host.id = HOST_ID;
  // Positioning is set directly on the light-DOM host, not inside the shadow root's
  // CSS: a `position: fixed` element deep inside Etsy's page can silently render in
  // the wrong place (or invisibly off-screen) if any ancestor has a `transform`,
  // `filter`, or `contain` property, since that ancestor becomes its containing block
  // instead of the viewport. Keeping the host itself as the one fixed, zero-size
  // anchor — appended directly under <html>, past most of Etsy's own wrapper divs —
  // and letting the visible panel be `position: absolute` *within* it (see
  // panelStyles.ts) sidesteps that failure mode.
  host.style.cssText =
    'all: initial; position: fixed; inset: auto 0 0 auto; width: 0; height: 0; z-index: 2147483647; pointer-events: none;';
  document.documentElement.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = PANEL_STYLES;
  shadowRoot.appendChild(style);

  const container = document.createElement('div');
  shadowRoot.appendChild(container);

  root = createRoot(container);
  root.render(<Panel listing={listing} />);
}

function checkForNavigation() {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    mount();
  }
}

/**
 * Etsy can navigate from one listing to another (or to a search page and back) via the
 * History API without a full page reload, which would otherwise leave this content
 * script running against a stale DOM/URL and the panel showing the wrong listing's
 * data — or not appearing at all after leaving and returning to a listing page.
 * Patching pushState/replaceState plus a popstate listener catches that; the interval
 * is a low-cost fallback for any navigation path that uses neither.
 */
function patchHistoryMethod(methodName: 'pushState' | 'replaceState') {
  const original = history[methodName];
  history[methodName] = function (this: History, ...args: Parameters<History['pushState']>) {
    original.apply(this, args);
    checkForNavigation();
  };
}

lastUrl = location.href;
mount();
patchHistoryMethod('pushState');
patchHistoryMethod('replaceState');
window.addEventListener('popstate', checkForNavigation);
setInterval(checkForNavigation, 1000);
