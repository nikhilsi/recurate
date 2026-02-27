import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

export default defineConfig({
  srcDir: '.',
  vite: () => ({
    plugins: [preact()],
  }),
  manifest: {
    name: 'Recurate Annotator',
    description: "Annotate AI responses on Claude and ChatGPT — highlight, strikethrough, dig deeper, verify. Your annotations become structured feedback — the AI's next reply is better.",
    version: '0.1.0',
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
