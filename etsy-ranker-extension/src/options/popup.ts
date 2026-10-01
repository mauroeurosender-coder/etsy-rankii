const statusEl = document.getElementById('status') as HTMLDivElement;
const settingsButton = document.getElementById('settings') as HTMLButtonElement;

const LISTING_PATTERN = /^https:\/\/www\.etsy\.com\/(?:[a-z]{2}\/)?listing\//;

async function checkActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isListing = !!tab?.url && LISTING_PATTERN.test(tab.url);
  statusEl.textContent = isListing ? 'Active on this listing' : 'Not an Etsy listing page';
  statusEl.className = `status ${isListing ? 'active' : 'inactive'}`;
}

settingsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());
checkActiveTab();

export {};
