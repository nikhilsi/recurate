import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

export default defineConfig({
  srcDir: '.',
  vite: () => ({
    plugins: [preact()],
  }),
  manifest: {
    name: 'Recurate Annotator',
    description: "Don't just chat, recurate. Annotation tools for AI conversations.",
    version: '0.1.0',
    permissions: ['sidePanel', 'activeTab'],
    action: {},
  },
});
