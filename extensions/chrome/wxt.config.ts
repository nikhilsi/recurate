import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

export default defineConfig({
  srcDir: '.',
  vite: () => ({
    plugins: [preact()],
  }),
  manifest: {
    name: 'Recurate Annotator',
    description: "Annotate AI responses on Claude, ChatGPT, and Copilot. Highlight, strikethrough, dig deeper, verify — feedback auto-injects.",
    version: '0.2.0',
    permissions: ['sidePanel', 'activeTab'],
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    action: {},
  },
});
