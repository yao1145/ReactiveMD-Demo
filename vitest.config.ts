import { defineConfig } from 'vitest/config';
import { reactiveMd } from 'reactive-md/vite';
import { exportAssets } from './vite.export-assets.ts';

export default defineConfig({
  plugins: [reactiveMd(), exportAssets()],
  test: { include: ['tests/**/*.test.{ts,tsx}'], css: true },
});
