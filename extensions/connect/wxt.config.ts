import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

export default defineConfig({
  srcDir: '.',
  vite: () => ({
    plugins: [preact()],
  }),
  manifest: {
    name: 'Recurate Connect',
    description: 'Connect your Claude.ai chats. Share context between tabs with one click.',
    version: '0.1.0',
    permissions: ['storage'],
    icons: {
      16: 'icon-16.png',
      32: 'icon-32.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
  },
});
