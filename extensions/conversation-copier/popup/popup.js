// Recurate Copier popup: Copy, Download and Export from the toolbar.
// Works when in-page buttons are missing, on tabs opened before an update,
// and on Copilot addresses the content script is not declared for: in those
// cases it injects the same files into the current tab under activeTab.

'use strict';

// Keep in step with manifest.json content_scripts.js (a test checks it).
const CONTENT_FILES = [
  'lib/jszip.min.js',
  'lib/turndown.js',
  'lib/turndown-plugin-gfm.js',
  'core/model.js',
  'core/names.js',
  'core/markdown.js',
  'platforms/claude.js',
  'platforms/chatgpt.js',
  'platforms/grok.js',
  'platforms/gemini.js',
  'platforms/copilot.js',
  'content.js',
];

const SUPPORTED = [
  /^https:\/\/claude\.ai\/chat\/[0-9a-f-]{36}/i,
  /^https:\/\/(chatgpt\.com|chat\.openai\.com)\/(?:[^?#]*\/)?c\/[0-9a-f-]{20,}/i,
  /^https:\/\/grok\.com\/(?:c|chat)\/[0-9a-f-]{36}/i,
  /^https:\/\/gemini\.google\.com\/(?:u\/\d+\/)?(?:app|gem\/[^/]+)\/[0-9a-f]{12,}/i,
  /^https:\/\/(?:m365\.cloud\.microsoft|copilot\.cloud\.microsoft|copilot\.com|copilot\.microsoft\.com)\/[^?#]*chat\/conversation\/[0-9a-f-]{36}/i,
];

const PORT_NAME = 'recurate-copier';
const $ = id => document.getElementById(id);
const buttons = [...document.querySelectorAll('button[data-action]')];
let port = null;

function status(text) {
  $('status').textContent = text;
}

function busy(on) {
  buttons.forEach(b => { b.disabled = on; });
  $('cancel').style.display = on ? 'block' : 'none';
}

// Connects to the tab; resolves with the port once the content script
// answers, or null if nothing is listening.
function connect(tabId) {
  return new Promise(resolve => {
    let settled = false;
    const p = chrome.tabs.connect(tabId, { name: PORT_NAME });
    const finish = value => { if (!settled) { settled = true; resolve(value); } };
    p.onDisconnect.addListener(() => { void chrome.runtime.lastError; finish(null); });
    p.onMessage.addListener(msg => { if (msg.type === 'pong') finish(msg.supported ? p : null); });
    p.postMessage({ type: 'ping' });
    setTimeout(() => finish(null), 1500);
  });
}

async function ready(tab) {
  let p = await connect(tab.id);
  if (p) return p;
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: CONTENT_FILES });
  p = await connect(tab.id);
  return p;
}

async function start(action) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !SUPPORTED.some(re => re.test(tab.url || ''))) {
    status('Open a conversation on Claude, ChatGPT, Grok, Gemini or Copilot, then try again.');
    return;
  }
  busy(true);
  status('Connecting…');
  try {
    port = await ready(tab);
  } catch (e) {
    port = null;
  }
  if (!port) {
    busy(false);
    status('Copier could not reach this page. Reload the tab and try again.');
    return;
  }
  port.onMessage.addListener(async msg => {
    if (msg.type === 'progress') status(msg.text);
    if (msg.type !== 'result') return;
    busy(false);
    if (!msg.ok) { status(msg.error); return; }
    if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(msg.markdown);
        status(`Copied: ${msg.summary}`);
      } catch (e) {
        status('The clipboard refused the copy. Use Download instead.');
      }
    } else {
      status(`${action === 'export' ? 'Exported' : 'Downloaded'}: ${msg.summary}`);
    }
  });
  port.onDisconnect.addListener(() => { busy(false); });
  status('Reading the conversation…');
  port.postMessage({ type: 'run', action });
}

buttons.forEach(b => b.addEventListener('click', () => start(b.dataset.action)));
$('cancel').addEventListener('click', () => {
  if (port) port.postMessage({ type: 'cancel' });
  busy(false);
  status('Cancelled.');
});
