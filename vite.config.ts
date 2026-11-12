import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { reactiveMd } from 'reactive-md/vite';
import { exportAssets } from './vite.export-assets.ts';

export default defineConfig({
  plugins: [react(), reactiveMd(), exportAssets()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { rolldownOptions: { input: { main: 'index.html', embed: 'embed.html' } } },
});
