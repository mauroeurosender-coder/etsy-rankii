const API_KEY_STORAGE_KEY = 'geminiApiKey';

const input = document.getElementById('apiKey') as HTMLInputElement;
const saveButton = document.getElementById('save') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

async function load() {
  const stored = await chrome.storage.local.get(API_KEY_STORAGE_KEY);
  if (typeof stored[API_KEY_STORAGE_KEY] === 'string') {
    input.value = stored[API_KEY_STORAGE_KEY];
  }
}

async function save() {
  const value = input.value.trim();
  await chrome.storage.local.set({ [API_KEY_STORAGE_KEY]: value });
  statusEl.textContent = value ? 'Saved.' : 'Cleared.';
  setTimeout(() => {
    statusEl.textContent = '';
  }, 2000);
}

saveButton.addEventListener('click', save);
load();

export {};
