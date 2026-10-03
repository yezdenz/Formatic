import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: fileURLToPath(new URL('./src/popup/index.html', import.meta.url)),
        canvasScraper: fileURLToPath(new URL('./src/content/canvasScraper.ts', import.meta.url)),
        serviceWorker: fileURLToPath(new URL('./src/background/serviceWorker.ts', import.meta.url))
      },
      output: { entryFileNames: '[name].js' }
    }
  },
  publicDir: 'public'
});
