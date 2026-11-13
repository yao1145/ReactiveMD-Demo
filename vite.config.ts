import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { reactiveMd } from 'reactive-md/vite';
import { exportAssets } from './vite.export-assets.ts';

export default defineConfig({
  plugins: [react(), reactiveMd(), exportAssets()],
  // The export dialog imports the server renderer on demand. Pre-bundle it so
  // the first export in a dev session cannot hit a stale optimized-dependency
  // URL after Vite discovers it late.
  optimizeDeps: { include: ['react-dom/server'] },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { rolldownOptions: { input: { main: 'index.html', embed: 'embed.html' } } },
});
